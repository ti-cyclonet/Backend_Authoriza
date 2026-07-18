import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
import { User } from '../users/entities/user.entity';
import { GlobalParametersForInvoices } from '../global-parameters-invoices/entities/global-parameters-for-invoices.entity';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(UserDependency)
    private userDependencyRepository: Repository<UserDependency>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(GlobalParametersForInvoices)
    private globalParametersForInvoicesRepository: Repository<GlobalParametersForInvoices>,
    private entityCodeService: EntityCodeService,
    private notificationsService: NotificationsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const code = await this.entityCodeService.generateCode('Invoice');
    const invoice = this.invoiceRepository.create({ ...createInvoiceDto, code });
    return await this.invoiceRepository.save(invoice);
  }

  async findAll(tenantId?: string): Promise<any[]> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('invoice.contract', 'contract')
      .orderBy('invoice.createdAt', 'DESC');

    if (tenantId) {
      this.logger.log(`Finding invoices for tenantId: ${tenantId}`);
      
      const dependency = await this.userDependencyRepository.findOne({
        where: { dependentUserId: tenantId, status: 'ACTIVE' },
      });
      const principalId = dependency ? dependency.principalUserId : tenantId;
      this.logger.log(`Resolved principalId: ${principalId} (dependency found: ${!!dependency})`);

      queryBuilder.andWhere('invoice.userId = :principalId', { principalId });
    }

    const invoices = await queryBuilder.getMany();

    // Calculate dynamic late_fee_penalty for unpaid invoices
    const lateFeeConfig = await this.getLateFeeConfig();
    
    if (!lateFeeConfig) {
      return invoices;
    }

    return invoices.map(invoice => this.applyLateFee(invoice, lateFeeConfig));
  }

  /**
   * Gets the active late_fee_penalty configuration if it exists and showInDocs is true
   */
  private async getLateFeeConfig(): Promise<{ percentage: number; showInDocs: boolean } | null> {
    const today = new Date();
    
    const lateFeeParam = await this.globalParametersForInvoicesRepository
      .createQueryBuilder('gpfi')
      .leftJoinAndSelect('gpfi.globalParameterPeriod', 'gpp')
      .leftJoinAndSelect('gpp.globalParameter', 'gp')
      .leftJoinAndSelect('gpp.period', 'p')
      .where('gp.code = :code', { code: 'late_fee_penalty' })
      .andWhere('gpp.status = :status', { status: 'ACTIVE' })
      .andWhere('p.startDate <= :today', { today })
      .andWhere('p.endDate >= :today', { today })
      .getOne();

    if (!lateFeeParam) {
      return null;
    }

    return {
      percentage: parseFloat(lateFeeParam.globalParameterPeriod.value),
      showInDocs: lateFeeParam.showInDocs,
    };
  }

  /**
   * Calculates and applies late fee penalty to an invoice dynamically.
   * Late fee applies only if:
   * - Invoice status is NOT Paid
   * - More than 7 days have passed since the contract's payday of the invoice period
   * Formula: invoiceValue * (percentage/100) * overdueDays (days after grace period of 7)
   */
  private applyLateFee(invoice: Invoice, lateFeeConfig: { percentage: number; showInDocs: boolean }): any {
    const GRACE_PERIOD_DAYS = 7;

    // For paid or payment-reported invoices, use frozen values if available
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PAYMENT_REPORTED) {
      if (invoice.lateFeeAmount && invoice.lateFeeAmount > 0) {
        const globalParameters = { ...(invoice.globalParameters || {}) };
        const operationTypes = { ...(invoice.operationTypes || {}) };
        const percentages = { ...(invoice.percentages || {}) };
        globalParameters['late_fee_penalty'] = invoice.lateFeeAmount;
        operationTypes['late_fee_penalty'] = 'add';
        percentages['late_fee_penalty'] = invoice.lateFeePercentage || lateFeeConfig.percentage;
        return { ...invoice, globalParameters, operationTypes, percentages };
      }
      return invoice;
    }

    // Only apply penalty from NOTIFICATION2 onwards (PayDay+7)
    // UNCONFIRMED, ISSUED, NOTIFICATION1 don't incur late fee yet
    if (invoice.status === InvoiceStatus.UNCONFIRMED || 
        invoice.status === InvoiceStatus.ISSUED ||
        invoice.status === InvoiceStatus.NOTIFICATION1) {
      return invoice;
    }

    // Need the invoice's issue date to calculate the due date (1st of next month)
    const issueDate = invoice.issueDate ? new Date(invoice.issueDate + 'T12:00:00') : null;
    if (!issueDate) {
      return invoice;
    }

    // Due date = 1st of the month following the issue date
    const dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 1);
    dueDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate days since due date
    const diffTime = today.getTime() - dueDate.getTime();
    const daysAfterDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Only apply if more than grace period days have passed after due date
    if (daysAfterDue <= GRACE_PERIOD_DAYS) {
      return invoice;
    }

    const overdueDays = daysAfterDue - GRACE_PERIOD_DAYS;
    const dailyPenalty = Number(invoice.value) * (lateFeeConfig.percentage / 100);
    const totalPenalty = Math.round(dailyPenalty * overdueDays * 100) / 100;

    // Merge into globalParameters, operationTypes, percentages
    const globalParameters = { ...(invoice.globalParameters || {}) };
    const operationTypes = { ...(invoice.operationTypes || {}) };
    const percentages = { ...(invoice.percentages || {}) };

    if (lateFeeConfig.showInDocs) {
      globalParameters['late_fee_penalty'] = totalPenalty;
      operationTypes['late_fee_penalty'] = 'add';
      percentages['late_fee_penalty'] = lateFeeConfig.percentage;
    }

    return {
      ...invoice,
      globalParameters,
      operationTypes,
      percentages,
    };
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['user', 'contract']
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    
    return invoice;
  }

  /**
   * Returns a signed URL for the payment voucher that bypasses Cloudinary delivery restrictions.
   */
  async getVoucherSignedUrl(id: number) {
    const invoice = await this.findOne(id);
    
    if (!invoice.paymentVoucherUrl) {
      return { voucherUrl: null };
    }

    const signedUrl = this.cloudinaryService.generateSignedUrl(invoice.paymentVoucherUrl);
    return {
      voucherUrl: signedUrl,
      invoiceCode: invoice.code,
      paymentDate: invoice.paymentDate,
      paidAmount: invoice.paidAmount,
    };
  }

  async findByUser(userId: string): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { userId },
      relations: ['user', 'contract'],
      order: { createdAt: 'DESC' }
    });
  }

  async findByContract(contractId: string): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      where: { contractId },
      relations: ['user', 'contract'],
      order: { createdAt: 'DESC' }
    });
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    await this.invoiceRepository.update(id, updateInvoiceDto);
    return await this.findOne(id);
  }

  /**
   * Register a payment for an invoice.
   * Freezes the late fee penalty at the moment of payment and marks invoice as Paid.
   */
  async registerPayment(id: number, paymentDate: string, paidAmount: number, paymentVoucherUrl?: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['user', 'contract'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    // Calculate and freeze the late fee at this moment
    const lateFeeConfig = await this.getLateFeeConfig();
    let lateFeeAmount = 0;
    let lateFeeDays = 0;
    let lateFeePercentage = 0;

    if (lateFeeConfig && invoice.status !== InvoiceStatus.PAID) {
      const GRACE_PERIOD_DAYS = 7;
      const payDateMoment = new Date(paymentDate);
      payDateMoment.setHours(0, 0, 0, 0);

      // Due date is the 1st of the month following the issue date
      const issueDate = invoice.issueDate ? new Date(invoice.issueDate + 'T12:00:00') : null;
      if (issueDate) {
        const dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 1);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = payDateMoment.getTime() - dueDate.getTime();
        const daysAfterDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (daysAfterDue > GRACE_PERIOD_DAYS) {
          lateFeeDays = daysAfterDue - GRACE_PERIOD_DAYS;
          const dailyPenalty = Number(invoice.value) * (lateFeeConfig.percentage / 100);
          lateFeeAmount = Math.round(dailyPenalty * lateFeeDays * 100) / 100;
          lateFeePercentage = lateFeeConfig.percentage;
        }
      }
    }

    // Persist the frozen late fee and payment data
    const globalParameters = { ...(invoice.globalParameters || {}) };
    const operationTypes = { ...(invoice.operationTypes || {}) };
    const percentages = { ...(invoice.percentages || {}) };

    if (lateFeeAmount > 0) {
      globalParameters['late_fee_penalty'] = lateFeeAmount;
      operationTypes['late_fee_penalty'] = 'add';
      percentages['late_fee_penalty'] = lateFeePercentage;
    } else {
      // Ensure no stale late fee from previous attempts
      delete globalParameters['late_fee_penalty'];
      delete operationTypes['late_fee_penalty'];
      delete percentages['late_fee_penalty'];
    }

    await this.invoiceRepository.update(id, {
      status: InvoiceStatus.PAYMENT_REPORTED,
      paymentDate: new Date(paymentDate),
      paidAmount,
      lateFeeAmount: lateFeeAmount || null,
      lateFeeDays: lateFeeDays || null,
      lateFeePercentage: lateFeePercentage || null,
      paymentVoucherUrl: paymentVoucherUrl || null,
      rejectionReason: null,
      globalParameters,
      operationTypes,
      percentages,
    });

    this.logger.log(`Payment reported for invoice ${id}: paid=${paidAmount}, lateFee=${lateFeeAmount}, days=${lateFeeDays}, voucher=${paymentVoucherUrl ? 'yes' : 'no'} — pending admin verification`);

    return await this.findOne(id);
  }

  /**
   * Admin confirms (approves) a reported payment → status becomes Paid.
   */
  async confirmPayment(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    this.logger.log(`confirmPayment: Invoice ${id} current status = "${invoice.status}"`);

    if ((invoice.status as string) !== 'Payment Reported') {
      throw new Error(`Invoice ${id} is not in 'Payment Reported' status. Current status: ${invoice.status}`);
    }

    await this.invoiceRepository.update(id, {
      status: InvoiceStatus.PAID,
    });

    this.logger.log(`Payment confirmed (approved) for invoice ${id}`);
    return await this.findOne(id);
  }

  /**
   * Admin rejects a reported payment → status reverts to Issued.
   * Clears payment data so the client can re-submit.
   * Sends email notification to the client.
   */
  async rejectPayment(id: number, reason?: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status !== InvoiceStatus.PAYMENT_REPORTED) {
      throw new Error(`Invoice ${id} is not in 'Payment Reported' status. Current status: ${invoice.status}`);
    }

    // Clear late_fee_penalty from globalParameters if it was set
    const invoice_data = await this.invoiceRepository.findOne({ where: { id } });
    const cleanedGlobalParams = { ...(invoice_data.globalParameters || {}) };
    const cleanedOperationTypes = { ...(invoice_data.operationTypes || {}) };
    const cleanedPercentages = { ...(invoice_data.percentages || {}) };
    delete cleanedGlobalParams['late_fee_penalty'];
    delete cleanedOperationTypes['late_fee_penalty'];
    delete cleanedPercentages['late_fee_penalty'];

    await this.invoiceRepository.update(id, {
      status: InvoiceStatus.ISSUED,
      paymentDate: null,
      paidAmount: null,
      lateFeeAmount: null,
      lateFeeDays: null,
      lateFeePercentage: null,
      paymentVoucherUrl: null,
      rejectionReason: reason || 'Payment proof rejected by administrator',
      globalParameters: cleanedGlobalParams,
      operationTypes: cleanedOperationTypes,
      percentages: cleanedPercentages,
    });

    this.logger.log(`Payment rejected for invoice ${id}. Reason: ${reason || 'Not specified'}`);

    // Notify client about the rejection
    this.sendPaymentRejectedNotification(invoice, reason).catch(err =>
      this.logger.warn(`Failed to send payment rejected notification: ${err.message}`)
    );

    return await this.findOne(id);
  }

  private async sendPaymentRejectedNotification(invoice: Invoice, reason?: string): Promise<void> {
    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';
    const year = new Date().getFullYear().toString();
    const invoiceCode = invoice.code || `INV-${invoice.id}`;
    const clientEmail = invoice.user?.strUserName;
    const clientName = invoice.user?.basicData?.legalEntityData?.businessName
      || invoice.user?.basicData?.naturalPersonData?.firstName
      || clientEmail;

    if (clientEmail) {
      try {
        await this.notificationsService.sendByTemplate('PAYMENT_REJECTED', clientEmail, {
          customerName: clientName || 'Client',
          invoiceCode,
          reason: reason || 'No reason provided',
          factonetUrl,
          year,
        });
        this.logger.log(`Payment rejected notification sent to ${clientEmail} for invoice ${invoiceCode}`);
      } catch (err) {
        this.logger.warn(`Failed to send payment rejected notification to ${clientEmail}: ${err.message}`);
      }
    }
  }

  async updateStatus(id: number, status: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    const previousStatus = invoice.status;
    await this.invoiceRepository.update(id, { status: status as InvoiceStatus });
    
    // Send notification when invoice changes from Unconfirmed to Issued
    if (previousStatus === InvoiceStatus.UNCONFIRMED && status === InvoiceStatus.ISSUED) {
      this.sendInvoiceIssuedNotification(invoice).catch(err => 
        this.logger.warn(`Failed to send invoice issued notification: ${err.message}`)
      );
    }

    return await this.findOne(id);
  }

  private async sendInvoiceIssuedNotification(invoice: Invoice): Promise<void> {
    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';
    const year = new Date().getFullYear().toString();
    const invoiceCode = invoice.code || `INV-${invoice.id}`;

    // Get principal user (contract owner)
    const principalEmail = invoice.user?.strUserName;
    const principalName = invoice.user?.basicData?.legalEntityData?.businessName 
      || invoice.user?.basicData?.naturalPersonData?.firstName 
      || principalEmail;

    // Send to principal
    if (principalEmail) {
      try {
        await this.notificationsService.sendByTemplate('INVOICE_ISSUED', principalEmail, {
          customerName: principalName || 'Cliente',
          invoiceCode,
          factonetUrl,
          year,
        });
      } catch (err) {
        this.logger.warn(`Failed to send invoice notification to principal: ${err.message}`);
      }
    }

    // Find dependents (admin users) and send to them
    if (invoice.user?.id) {
      const dependencies = await this.userDependencyRepository.find({
        where: { principalUserId: invoice.user.id, status: 'ACTIVE' },
      });

      for (const dep of dependencies) {
        const depUser = await this.userRepository.findOne({ where: { id: dep.dependentUserId } });
        if (depUser?.strUserName) {
          try {
            await this.notificationsService.sendByTemplate('INVOICE_ISSUED', depUser.strUserName, {
              customerName: depUser.strUserName,
              invoiceCode,
              factonetUrl,
              year,
            });
          } catch (err) {
            this.logger.warn(`Failed to send invoice notification to dependent: ${err.message}`);
          }
        }
      }
    }
  }

  async checkInvoicesInPeriod(startDate: string, endDate: string): Promise<{ hasInvoices: boolean; count: number }> {
    const count = await this.invoiceRepository.count({
      where: {
        issueDate: Between(new Date(startDate), new Date(endDate))
      }
    });
    
    return {
      hasInvoices: count > 0,
      count
    };
  }

  async getProfitReport(startDate: string, endDate: string, contractId?: string) {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.issueDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('invoice.status != :status', { status: InvoiceStatus.UNCONFIRMED });
    
    if (contractId) {
      query.andWhere('invoice.contractId = :contractId', { contractId });
    }

    const invoices = await query.getMany();
    
    return {
      totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.value), 0),
      totalProfit: invoices.reduce((sum, inv) => {
        const profitMargin = inv.globalParameters?.profit_margin || 0;
        return sum + Number(profitMargin);
      }, 0),
      invoiceCount: invoices.length,
      details: invoices.map(inv => ({
        code: inv.code,
        issueDate: inv.issueDate,
        value: Number(inv.value),
        profitMargin: inv.globalParameters?.profit_margin || 0,
        profitPercentage: inv.percentages?.profit_margin || 0
      }))
    };
  }

  async remove(id: number): Promise<void> {
    const result = await this.invoiceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
  }
}