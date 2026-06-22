import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
import { User } from '../users/entities/user.entity';

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
    private entityCodeService: EntityCodeService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const code = await this.entityCodeService.generateCode('Invoice');
    const invoice = this.invoiceRepository.create({ ...createInvoiceDto, code });
    return await this.invoiceRepository.save(invoice);
  }

  async findAll(tenantId?: string): Promise<Invoice[]> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('invoice.contract', 'contract')
      .orderBy('invoice.createdAt', 'DESC');

    if (tenantId) {
      // Resolve the principal user for this tenant
      // The tenantId might be the principal itself OR the principal of a dependent
      this.logger.log(`Finding invoices for tenantId: ${tenantId}`);
      
      const dependency = await this.userDependencyRepository.findOne({
        where: { dependentUserId: tenantId, status: 'ACTIVE' },
      });
      const principalId = dependency ? dependency.principalUserId : tenantId;
      this.logger.log(`Resolved principalId: ${principalId} (dependency found: ${!!dependency})`);

      // Find invoices where the invoice belongs to the principal user
      queryBuilder.andWhere('invoice.userId = :principalId', { principalId });
    }

    return await queryBuilder.getMany();
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