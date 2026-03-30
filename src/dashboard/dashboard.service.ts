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
import { LogsService } from '../logs/logs.service';

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
    private logsService: LogsService,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [userStats, principalUserStats, applicationStats, packageStats] = await Promise.all([
      this.getUserStats(),
      this.getPrincipalUserStats(),
      this.getApplicationStats(),
      this.getPackageStats(),
    ]);

    return {
      users: userStats,
      principalUsers: principalUserStats,
      applications: applicationStats,
      packages: packageStats,
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
      .leftJoin('user.userRoles', 'userRole')
      .leftJoin('userRole.role', 'role')
      .select('role.strName', 'role')
      .addSelect('COUNT(DISTINCT user.id)', 'count')
      .where('user.deletedAt IS NULL')
      .andWhere('userRole.status = :status', { status: 'ACTIVE' })
      .groupBy('role.strName')
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

  private async getPrincipalUserStats(): Promise<any> {
    const principalUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('contract', 'contract', 'contract."userId" = user.id')
      .where('user.deletedAt IS NULL')
      .select('user.id', 'id')
      .addSelect('user.strStatus', 'status')
      .getRawMany();

    const total = principalUsers.length;
    const unconfirmed = principalUsers.filter(u => u.status === 'UNCONFIRMED').length;
    const active = principalUsers.filter(u => u.status === 'ACTIVE').length;
    const suspended = principalUsers.filter(u => u.status === 'SUSPENDED').length;
    const expiring = principalUsers.filter(u => u.status === 'EXPIRING').length;
    const delinquent = principalUsers.filter(u => u.status === 'DELINQUENT').length;

    return {
      total,
      unconfirmed,
      active,
      suspended,
      expiring,
      delinquent
    };
  }

  private async getApplicationStats(): Promise<any> {
    const applications = await this.userRepository.manager.query(`
      SELECT 
        a."strName" as name,
        COUNT(DISTINCT ur."userId") as "userCount",
        COUNT(DISTINCT r.id) as "roleCount"
      FROM application a
      LEFT JOIN rol r ON r."strApplicationId" = a.id
      LEFT JOIN user_roles ur ON ur."roleId" = r.id AND ur.status = 'ACTIVE'
      GROUP BY a.id, a."strName"
      ORDER BY "userCount" DESC
    `);

    return {
      total: applications.length,
      byApplication: applications.map(app => ({
        name: app.name,
        userCount: parseInt(app.userCount),
        roleCount: parseInt(app.roleCount)
      }))
    };
  }

  private async getPackageStats(): Promise<any> {
    const packages = await this.userRepository.manager.query(`
      SELECT 
        p.name,
        COUNT(DISTINCT c.id) as "contractCount",
        COUNT(DISTINCT cp.id) as "roleCount"
      FROM package p
      LEFT JOIN contract c ON c."packageId" = p.id
      LEFT JOIN configuration_package cp ON cp."packageId" = p.id
      GROUP BY p.id, p.name
      ORDER BY "contractCount" DESC
    `);

    return {
      total: packages.length,
      byPackage: packages.map(pkg => ({
        name: pkg.name,
        contractCount: parseInt(pkg.contractCount),
        roleCount: parseInt(pkg.roleCount)
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
      where: { ...whereCondition, status: InvoiceStatus.UNCONFIRMED } 
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
    const recentLogs = await this.logsService.getRecentLogs(6);

    return {
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        level: log.level,
        action: log.action,
        message: log.message,
        userId: log.userId,
        createdAt: log.createdAt
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
      })
    };

    return recentCodes;
  }
}