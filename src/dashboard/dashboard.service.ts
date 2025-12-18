import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { DashboardStatsDto, UserStats, InvoiceStats, ContractStats } from './dto/dashboard-stats.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    private entityCodeService: EntityCodeService,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [userStats, invoiceStats, contractStats] = await Promise.all([
      this.getUserStats(),
      this.getInvoiceStats(),
      this.getContractStats(),
    ]);

    return {
      users: userStats,
      invoices: invoiceStats,
      contracts: contractStats,
      lastUpdated: new Date(),
    };
  }

  private async getUserStats(): Promise<UserStats> {
    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { strStatus: 'ACTIVE' } });
    const inactive = await this.userRepository.count({ where: { strStatus: 'INACTIVE' } });
    const unconfirmed = await this.userRepository.count({ where: { strStatus: 'UNCONFIRMED' } });

    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.rol', 'rol')
      .select('rol.strName', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.deletedAt IS NULL')
      .groupBy('rol.strName')
      .getRawMany();

    return {
      total,
      active,
      inactive,
      unconfirmed,
      byRole: byRole.map(item => ({
        role: item.role || 'Sin rol',
        count: parseInt(item.count)
      }))
    };
  }

  private async getInvoiceStats(): Promise<InvoiceStats> {
    const total = await this.invoiceRepository.count();
    const paid = await this.invoiceRepository.count({ where: { status: InvoiceStatus.PAID } });
    const pending = await this.invoiceRepository.count({ where: { status: InvoiceStatus.ISSUED } });
    const overdue = await this.invoiceRepository.count({ where: { status: InvoiceStatus.IN_ARREARS } });

    const totalValueResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.value)', 'total')
      .getRawOne();

    const byStatus = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(invoice.id)', 'count')
      .addSelect('SUM(invoice.value)', 'value')
      .groupBy('invoice.status')
      .getRawMany();

    const monthlyRevenue = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.issueDate, 'YYYY-MM')", 'month')
      .addSelect('SUM(invoice.value)', 'revenue')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .groupBy("TO_CHAR(invoice.issueDate, 'YYYY-MM')")
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    return {
      total,
      totalValue: parseFloat(totalValueResult?.total || '0'),
      paid,
      pending,
      overdue,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count),
        value: parseFloat(item.value || '0')
      })),
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: item.month,
        revenue: parseFloat(item.revenue || '0')
      }))
    };
  }

  private async getContractStats(): Promise<ContractStats> {
    const total = await this.contractRepository.count();
    const active = await this.contractRepository.count({ where: { status: ContractStatus.ACTIVE } });
    const expired = await this.contractRepository.count({ where: { status: ContractStatus.EXPIRED } });

    const byStatus = await this.contractRepository
      .createQueryBuilder('contract')
      .select('contract.status', 'status')
      .addSelect('COUNT(contract.id)', 'count')
      .groupBy('contract.status')
      .getRawMany();

    return {
      total,
      active,
      expired,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count)
      }))
    };
  }

  async getInvoiceStatsByDateRange(dateRange: DateRangeDto): Promise<InvoiceStats> {
    const whereCondition: any = {};
    
    if (dateRange.startDate && dateRange.endDate) {
      whereCondition.issueDate = Between(new Date(dateRange.startDate), new Date(dateRange.endDate));
    }

    const total = await this.invoiceRepository.count({ where: whereCondition });
    const paid = await this.invoiceRepository.count({ 
      where: { ...whereCondition, status: InvoiceStatus.PAID } 
    });
    const pending = await this.invoiceRepository.count({ 
      where: { ...whereCondition, status: InvoiceStatus.ISSUED } 
    });
    const overdue = await this.invoiceRepository.count({ 
      where: { ...whereCondition, status: InvoiceStatus.IN_ARREARS } 
    });

    const qb = this.invoiceRepository.createQueryBuilder('invoice');
    
    if (dateRange.startDate && dateRange.endDate) {
      qb.where('invoice.issueDate BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }

    const totalValueResult = await qb
      .select('SUM(invoice.value)', 'total')
      .getRawOne();

    const byStatus = await qb
      .select('invoice.status', 'status')
      .addSelect('COUNT(invoice.id)', 'count')
      .addSelect('SUM(invoice.value)', 'value')
      .groupBy('invoice.status')
      .getRawMany();

    return {
      total,
      totalValue: parseFloat(totalValueResult?.total || '0'),
      paid,
      pending,
      overdue,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: parseInt(item.count),
        value: parseFloat(item.value || '0')
      })),
      monthlyRevenue: []
    };
  }

  async getRecentActivity(): Promise<any> {
    const recentUsers = await this.userRepository.find({
      order: { dtmCreateDate: 'DESC' },
      take: 5,
      relations: ['rol', 'basicData']
    });

    const recentInvoices = await this.invoiceRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['user']
    });

    const recentContracts = await this.contractRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['user', 'package']
    });

    return {
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        username: user.strUserName,
        role: user.rol?.strName || 'Sin rol',
        status: user.strStatus,
        createdAt: user.dtmCreateDate
      })),
      recentInvoices: recentInvoices.map(invoice => ({
        id: invoice.id,
        value: invoice.value,
        status: invoice.status,
        user: invoice.user.strUserName,
        createdAt: invoice.createdAt
      })),
      recentContracts: recentContracts.map(contract => ({
        id: contract.id,
        value: contract.value,
        status: contract.status,
        user: contract.user.strUserName,
        createdAt: contract.createdAt
      }))
    };
  }

  async getEntityCodes(): Promise<any> {
    const recentCodes = {
      users: await this.userRepository.find({
        select: ['id', 'code', 'strUserName', 'dtmCreateDate'],
        order: { dtmCreateDate: 'DESC' },
        take: 5,
        where: { code: Not(null) }
      }),
      invoices: await this.invoiceRepository.find({
        select: ['id', 'code', 'value', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: 5,
        where: { code: Not(null) }
      }),
      contracts: await this.contractRepository.find({
        select: ['id', 'code', 'value', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: 5,
        where: { code: Not(null) }
      })
    };

    return recentCodes;
  }
}