import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { LogsService } from '../logs/logs.service';

/** Colombia no tiene horario de verano: UTC-5 fijo. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Inicio (instante UTC) del mes calendario de Bogotá, desplazado `delta` meses. */
function bogotaMonthStart(now: Date, delta = 0): Date {
  const local = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + delta, 1) + BOGOTA_OFFSET_MS);
}

function bogotaDayStart(now: Date, deltaDays = 0): Date {
  const local = new Date(now.getTime() - BOGOTA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + deltaDays) + BOGOTA_OFFSET_MS);
}

function bogotaDateKey(d: Date): string {
  return new Date(new Date(d).getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

const num = (v: any) => Number(v) || 0;
const UNPAID = Object.values(InvoiceStatus).filter((s) => s !== InvoiceStatus.PAID);

/**
 * Resumen del Dashboard de Authoriza en una sola consulta (el front la repite
 * cada 30 s): indicadores del negocio con su comparación contra el mes
 * anterior, alertas accionables y series para las gráficas.
 */
@Injectable()
export class DashboardOverviewService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Contract) private contractRepository: Repository<Contract>,
    private logsService: LogsService,
  ) {}

  async getOverview() {
    const now = new Date();
    const monthStart = bogotaMonthStart(now);
    const prevMonthStart = bogotaMonthStart(now, -1);
    const sixMonthsStart = bogotaMonthStart(now, -5);
    const todayStart = bogotaDayStart(now);
    const weekStart = bogotaDayStart(now, -6);
    const signupsStart = bogotaDayStart(now, -13);
    const in30Days = new Date(now.getTime() + 30 * DAY_MS);
    const last24h = new Date(now.getTime() - DAY_MS);

    const inv = () => this.invoiceRepository.createQueryBuilder('i');
    const collected = (from: Date, to: Date) =>
      inv()
        .select('COALESCE(SUM(COALESCE(i.paidAmount, i.value)), 0)', 'v')
        .addSelect('COUNT(i.id)', 'n')
        .where('i.status = :paid', { paid: InvoiceStatus.PAID })
        .andWhere('COALESCE(i.paymentDate, i.updatedAt) >= :from AND COALESCE(i.paymentDate, i.updatedAt) < :to', { from, to })
        .getRawOne();

    const [
      collectedMonth, collectedPrev,
      billedMonth, billedPrev,
      receivables, overdue, paymentReported,
      contractsAgg, newContractsMonth, newContractsPrev, pendingSignature,
      expiringList, overdueList,
      usersAgg, signupsRaw,
      billedSeriesRaw, collectedSeriesRaw,
      recentLogs,
    ] = await Promise.all([
      collected(monthStart, now),
      collected(prevMonthStart, monthStart),
      inv().select('COALESCE(SUM(i.value), 0)', 'v').addSelect('COUNT(i.id)', 'n')
        .addSelect(`COUNT(i.id) FILTER (WHERE i.status = '${InvoiceStatus.PAID}')`, 'paid')
        .where('i.issueDate >= :from', { from: monthStart }).getRawOne(),
      inv().select('COALESCE(SUM(i.value), 0)', 'v').where('i.issueDate >= :from AND i.issueDate < :to', { from: prevMonthStart, to: monthStart }).getRawOne(),
      inv().select('COALESCE(SUM(i.value - COALESCE(i.paidAmount, 0)), 0)', 'v').addSelect('COUNT(i.id)', 'n')
        .where('i.status IN (:...unpaid)', { unpaid: UNPAID }).getRawOne(),
      inv().select('COALESCE(SUM(i.value - COALESCE(i.paidAmount, 0)), 0)', 'v').addSelect('COUNT(i.id)', 'n')
        .where('i.status IN (:...unpaid)', { unpaid: UNPAID }).andWhere('i.expirationDate < :now', { now }).getRawOne(),
      this.invoiceRepository.count({ where: { status: InvoiceStatus.PAYMENT_REPORTED } }),
      this.contractRepository.createQueryBuilder('c')
        .select('COUNT(c.id)', 'active')
        .addSelect('COALESCE(SUM(c.value), 0)', 'annual')
        .addSelect('COUNT(DISTINCT c."userId")', 'clients')
        .where('c.status = :s', { s: ContractStatus.ACTIVE }).getRawOne(),
      this.contractRepository.createQueryBuilder('c').where('c.createdAt >= :from', { from: monthStart }).getCount(),
      this.contractRepository.createQueryBuilder('c').where('c.createdAt >= :from AND c.createdAt < :to', { from: prevMonthStart, to: monthStart }).getCount(),
      this.contractRepository.createQueryBuilder('c')
        .where('c.status IN (:...st)', { st: [ContractStatus.DRAFT, ContractStatus.PENDING] })
        .andWhere('(c.clientSignedAt IS NULL OR c.adminSignedAt IS NULL)').getCount(),
      this.contractRepository.createQueryBuilder('c')
        .leftJoin('c.user', 'u').leftJoin('c.package', 'p')
        .select(['c.id AS id', 'c.code AS code', 'c.endDate AS "endDate"', 'u.strUserName AS client', 'p.name AS package'])
        .where('c.status = :s', { s: ContractStatus.ACTIVE })
        .andWhere('c.endDate BETWEEN :now AND :limit', { now, limit: in30Days })
        .orderBy('c.endDate', 'ASC').limit(5).getRawMany(),
      inv().leftJoin('i.user', 'u')
        .select(['i.id AS id', 'i.code AS code', 'i.value AS value', 'i.expirationDate AS "expirationDate"', 'u.strUserName AS client'])
        .where('i.status IN (:...unpaid)', { unpaid: UNPAID }).andWhere('i.expirationDate < :now', { now })
        .orderBy('i.expirationDate', 'ASC').limit(5).getRawMany(),
      this.userRepository.createQueryBuilder('u')
        .select('COUNT(u.id)', 'total')
        .addSelect(`COUNT(u.id) FILTER (WHERE u.strStatus = 'ACTIVE')`, 'active')
        .addSelect(`COUNT(u.id) FILTER (WHERE u.strStatus = 'UNCONFIRMED')`, 'unconfirmed')
        .addSelect('COUNT(u.id) FILTER (WHERE u.dtmCreateDate >= :today)', 'today')
        .addSelect('COUNT(u.id) FILTER (WHERE u.dtmCreateDate >= :week)', 'week')
        .setParameters({ today: todayStart, week: weekStart })
        .where('u.deletedAt IS NULL').getRawOne(),
      this.userRepository.createQueryBuilder('u')
        .select('u.dtmCreateDate', 'd').where('u.deletedAt IS NULL AND u.dtmCreateDate >= :from', { from: signupsStart }).getRawMany(),
      inv().select('i.issueDate', 'd').addSelect('i.value', 'v').where('i.issueDate >= :from', { from: sixMonthsStart }).getRawMany(),
      inv().select('COALESCE(i.paymentDate, i.updatedAt)', 'd').addSelect('COALESCE(i.paidAmount, i.value)', 'v')
        .where('i.status = :paid', { paid: InvoiceStatus.PAID })
        .andWhere('COALESCE(i.paymentDate, i.updatedAt) >= :from', { from: sixMonthsStart }).getRawMany(),
      this.logsService.getRecentLogs(12),
    ]);

    // Series: últimos 6 meses (facturado vs recaudado) y registros de 14 días
    const months: { key: string; label: string; billed: number; collected: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const start = bogotaMonthStart(now, -k);
      const key = bogotaDateKey(start).slice(0, 7);
      const label = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'America/Bogota' }).format(start).replace('.', '');
      months.push({ key, label, billed: 0, collected: 0 });
    }
    const byMonth = new Map(months.map((m) => [m.key, m]));
    for (const r of billedSeriesRaw) { const m = byMonth.get(bogotaDateKey(r.d).slice(0, 7)); if (m) m.billed += num(r.v); }
    for (const r of collectedSeriesRaw) { const m = byMonth.get(bogotaDateKey(r.d).slice(0, 7)); if (m) m.collected += num(r.v); }

    const days: { date: string; count: number }[] = [];
    for (let k = 13; k >= 0; k--) days.push({ date: bogotaDateKey(bogotaDayStart(now, -k)), count: 0 });
    const byDay = new Map(days.map((d) => [d.date, d]));
    for (const r of signupsRaw) { const d = byDay.get(bogotaDateKey(r.d)); if (d) d.count++; }

    // Accesos: el registro de actividad guarda los últimos ~100 eventos, así que
    // es una muestra reciente (suficiente para "quién está entrando ahora").
    const logins24 = recentLogs.filter((l) => l.action === 'LOGIN' && new Date(l.createdAt) >= last24h);
    const billedCount = num(billedMonth?.n);

    return {
      generatedAt: now.toISOString(),
      revenue: {
        collectedMonth: num(collectedMonth?.v),
        collectedPrevMonth: num(collectedPrev?.v),
        paymentsMonth: num(collectedMonth?.n),
        billedMonth: num(billedMonth?.v),
        billedPrevMonth: num(billedPrev?.v),
        invoicesMonth: billedCount,
        collectionRate: billedCount ? Math.round((num(billedMonth?.paid) / billedCount) * 100) : null,
        mrr: Math.round(num(contractsAgg?.annual) / 12),
      },
      receivables: {
        pendingValue: num(receivables?.v),
        pendingCount: num(receivables?.n),
        overdueValue: num(overdue?.v),
        overdueCount: num(overdue?.n),
        paymentReported,
      },
      clients: {
        active: num(contractsAgg?.clients),
        activeContracts: num(contractsAgg?.active),
        newContractsMonth,
        newContractsPrevMonth: newContractsPrev,
        pendingSignature,
      },
      users: {
        total: num(usersAgg?.total),
        active: num(usersAgg?.active),
        unconfirmed: num(usersAgg?.unconfirmed),
        newToday: num(usersAgg?.today),
        newWeek: num(usersAgg?.week),
        logins24h: logins24.length,
        activeUsers24h: new Set(logins24.map((l) => l.userId).filter(Boolean)).size,
      },
      alerts: {
        expiringContracts: expiringList.map((c) => ({ ...c, daysLeft: Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / DAY_MS) })),
        overdueInvoices: overdueList.map((i) => ({ ...i, value: num(i.value), daysOverdue: Math.floor((now.getTime() - new Date(i.expirationDate).getTime()) / DAY_MS) })),
      },
      series: { months, signups: days },
      activity: recentLogs.map((l) => ({ id: l.id, level: l.level, action: l.action, message: l.message, createdAt: l.createdAt })),
    };
  }
}
