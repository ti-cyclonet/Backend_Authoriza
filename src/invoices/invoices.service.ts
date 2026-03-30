import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private entityCodeService: EntityCodeService,
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
      .leftJoinAndSelect('invoice.contract', 'contract')
      .orderBy('invoice.createdAt', 'DESC');

    if (tenantId) {
      // Filtrar facturas donde el userId coincida con el tenantId
      // Esto asegura que solo se muestren facturas del cliente principal
      queryBuilder.andWhere('invoice.userId = :tenantId', { tenantId });
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
    await this.invoiceRepository.update(id, { status: status as InvoiceStatus });
    return await this.findOne(id);
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