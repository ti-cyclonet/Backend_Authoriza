import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';

/**
 * Invoice Lifecycle Cron Job
 * Runs daily to manage invoice status escalation and notifications.
 * 
 * Timeline from PayDay:
 * - PayDay (day 0): Send reminder if still ISSUED
 * - PayDay + 5: Change to NOTIFICATION1, warning notification
 * - PayDay + 7: Change to NOTIFICATION2, late_fee_penalty starts
 * - PayDay + 15: Change to SUSPENDED, suspend contract
 * - PayDay + 20: Change to CANCELLED, deactivate users
 */
@Injectable()
export class InvoiceLifecycleCron {
  private readonly logger = new Logger('InvoiceLifecycleCron');

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserDependency)
    private readonly userDependencyRepository: Repository<UserDependency>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *') // Every day at 8:00 AM
  async handleInvoiceLifecycle(): Promise<void> {
    this.logger.log('Starting invoice lifecycle check...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unpaid invoices in escalation-eligible states
    const invoices = await this.invoiceRepository.find({
      where: {
        status: In([
          InvoiceStatus.ISSUED,
          InvoiceStatus.NOTIFICATION1,
          InvoiceStatus.NOTIFICATION2,
          InvoiceStatus.SUSPENDED,
        ]),
      },
      relations: ['contract', 'user', 'user.basicData', 'user.basicData.legalEntityData', 'user.basicData.naturalPersonData'],
    });

    for (const invoice of invoices) {
      try {
        await this.processInvoice(invoice, today);
      } catch (error) {
        this.logger.error(`Error processing invoice ${invoice.id}: ${error.message}`);
      }
    }

    this.logger.log(`Invoice lifecycle check completed. Processed ${invoices.length} invoices.`);
  }

  private async processInvoice(invoice: Invoice, today: Date): Promise<void> {
    const payday = invoice.contract?.payday || 1;
    const periodStart = invoice.periodStart ? new Date(invoice.periodStart) : null;
    if (!periodStart) return;

    // Calculate the payday date for this invoice's billing period
    const payDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, payday);
    payDate.setHours(0, 0, 0, 0);

    const daysSincePayday = Math.floor((today.getTime() - payDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePayday < 0) return; // PayDay hasn't arrived yet

    const clientEmail = invoice.user?.strUserName;
    const clientName = invoice.user?.basicData?.legalEntityData?.businessName
      || invoice.user?.basicData?.naturalPersonData?.firstName
      || clientEmail || 'Cliente';
    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';
    const year = new Date().getFullYear().toString();
    const invoiceCode = invoice.code || `DF${invoice.id}`;

    // PayDay + 20: CANCEL contract and deactivate users
    if (daysSincePayday >= 20 && invoice.status === InvoiceStatus.SUSPENDED) {
      await this.cancelContract(invoice);
      return;
    }

    // PayDay + 15: SUSPEND contract
    if (daysSincePayday >= 15 && invoice.status === InvoiceStatus.NOTIFICATION2) {
      await this.invoiceRepository.update(invoice.id, { status: InvoiceStatus.SUSPENDED });
      await this.suspendContract(invoice, clientEmail, clientName, factonetUrl, year);
      this.logger.log(`Invoice ${invoiceCode}: SUSPENDED at PayDay+${daysSincePayday}`);
      return;
    }

    // PayDay + 7: Change to NOTIFICATION2 (late_fee_penalty starts)
    if (daysSincePayday >= 7 && invoice.status === InvoiceStatus.NOTIFICATION1) {
      await this.invoiceRepository.update(invoice.id, { status: InvoiceStatus.NOTIFICATION2 });
      this.logger.log(`Invoice ${invoiceCode}: Escalated to NOTIFICATION2 (late fee starts)`);

      if (clientEmail) {
        await this.notificationsService.sendByTemplate('INVOICE_LATE_FEE_START', clientEmail, {
          customerName: clientName,
          invoiceCode,
          factonetUrl,
          year,
        }).catch(e => this.logger.warn(`Email failed: ${e.message}`));
      }
      return;
    }

    // PayDay + 5: Change to NOTIFICATION1 (warning)
    if (daysSincePayday >= 5 && invoice.status === InvoiceStatus.ISSUED) {
      await this.invoiceRepository.update(invoice.id, { status: InvoiceStatus.NOTIFICATION1 });
      this.logger.log(`Invoice ${invoiceCode}: Escalated to NOTIFICATION1 at PayDay+${daysSincePayday}`);

      if (clientEmail) {
        await this.notificationsService.sendByTemplate('INVOICE_WARNING', clientEmail, {
          customerName: clientName,
          invoiceCode,
          factonetUrl,
          year,
        }).catch(e => this.logger.warn(`Email failed: ${e.message}`));
      }
      return;
    }

    // PayDay (day 0): Reminder if still ISSUED
    if (daysSincePayday === 0 && invoice.status === InvoiceStatus.ISSUED) {
      if (clientEmail) {
        await this.notificationsService.sendByTemplate('INVOICE_REMINDER', clientEmail, {
          customerName: clientName,
          invoiceCode,
          factonetUrl,
          year,
        }).catch(e => this.logger.warn(`Email failed: ${e.message}`));
      }
      this.logger.log(`Invoice ${invoiceCode}: PayDay reminder sent`);
    }
  }

  private async suspendContract(invoice: Invoice, clientEmail: string, clientName: string, factonetUrl: string, year: string): Promise<void> {
    if (invoice.contractId) {
      await this.contractRepository.update(invoice.contractId, { status: ContractStatus.SUSPENDED });
      this.logger.log(`Contract ${invoice.contractId}: SUSPENDED due to unpaid invoice ${invoice.code}`);
    }

    if (clientEmail) {
      await this.notificationsService.sendByTemplate('CONTRACT_SUSPENDED', clientEmail, {
        customerName: clientName,
        invoiceCode: invoice.code || `DF${invoice.id}`,
        factonetUrl,
        year,
      }).catch(e => this.logger.warn(`Email failed: ${e.message}`));
    }
  }

  private async cancelContract(invoice: Invoice): Promise<void> {
    if (!invoice.contractId) return;

    // Cancel contract
    await this.contractRepository.update(invoice.contractId, { status: ContractStatus.CANCELLED });

    // Desactivar SOLO el acceso ligado a este contrato. NO desactivar al usuario
    // globalmente: puede tener otras apps/contratos activos (Kiri, Shotra, otro InOut).
    const manager = this.contractRepository.manager;

    // Usuarios con rol en este contrato (titular + dependientes de este contrato)
    const affected: Array<{ userId: string }> = await manager.query(
      `SELECT DISTINCT "userId" FROM user_roles WHERE "contractId" = $1`,
      [invoice.contractId],
    );
    const affectedIds = new Set<string>(affected.map((r) => r.userId));
    if (invoice.user?.id) affectedIds.add(invoice.user.id);

    // Desactivar los roles de este contrato
    await manager.query(
      `UPDATE user_roles SET status = 'INACTIVE' WHERE "contractId" = $1`,
      [invoice.contractId],
    );

    // Recalcular estado global: solo queda INACTIVE quien no tenga ya ningún rol ACTIVE
    for (const userId of affectedIds) {
      const rows: Array<{ cnt: string }> = await manager.query(
        `SELECT COUNT(*)::int AS cnt FROM user_roles WHERE "userId" = $1 AND status = 'ACTIVE'`,
        [userId],
      );
      const hasActive = Number(rows?.[0]?.cnt || 0) > 0;
      if (!hasActive) {
        // No pisar estados de verificación
        const u = await this.userRepository.findOne({ where: { id: userId } });
        if (u && u.strStatus !== 'UNCONFIRMED' && u.strStatus !== 'CONFIRMED') {
          await this.userRepository.update({ id: userId }, { strStatus: 'INACTIVE' });
        }
      }
    }

    this.logger.log(`Contract ${invoice.contractId}: CANCELLED. Roles de este contrato desactivados (acceso a otras apps intacto).`);
  }
}
