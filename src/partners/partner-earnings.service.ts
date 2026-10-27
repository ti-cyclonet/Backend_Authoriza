import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PartnerClick, PartnerEarning, PartnerEarningSource, PartnerOffer } from './partner-offer.entity';

export const EARNING_SOURCES: PartnerEarningSource[] = ['referido', 'pasarela', 'otro'];

export interface PartnerEarningInput {
  offerId?: string | null;
  partnerName?: string;
  source?: string;
  amount?: unknown;
  receivedAt?: string;
  tenantId?: string | null;
  reference?: string | null;
  note?: string | null;
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const isMonth = (m: unknown) => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const isDate = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/** Primer y último día de un mes 'YYYY-MM' (fechas 'YYYY-MM-DD'). */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, '0')}`];
}

/** 'YYYY-MM' desplazado n meses. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Ingresos por aliados: comisiones de los referidos (las registra el
 * administrador cuando el aliado le paga) y, más adelante, comisiones de los
 * pagos en línea. Alimenta el bloque «Ingresos por aliados» del dashboard.
 */
@Injectable()
export class PartnerEarningsService {
  constructor(
    @InjectRepository(PartnerEarning) private readonly repo: Repository<PartnerEarning>,
    @InjectRepository(PartnerOffer) private readonly offers: Repository<PartnerOffer>,
    @InjectRepository(PartnerClick) private readonly clicks: Repository<PartnerClick>,
  ) {}

  async create(input: PartnerEarningInput, who?: string) {
    const amount = round(Number(input?.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('El valor debe ser mayor que cero.');
    if (amount > 1e11) throw new BadRequestException('El valor es demasiado alto.');
    const receivedAt = input?.receivedAt || new Date().toISOString().slice(0, 10);
    if (!isDate(receivedAt)) throw new BadRequestException('Fecha inválida (AAAA-MM-DD).');
    if (receivedAt > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) throw new BadRequestException('La fecha no puede ser futura.');

    let offerId: string | null = null;
    let partnerName = clean(input?.partnerName, 80);
    if (input?.offerId) {
      const offer = await this.offers.findOne({ where: { id: String(input.offerId) } });
      if (!offer) throw new NotFoundException('Servicio no encontrado.');
      offerId = offer.id;
      partnerName = partnerName || offer.name;
    }
    if (!partnerName) throw new BadRequestException('Indica el aliado.');
    const source = (EARNING_SOURCES as string[]).includes(String(input?.source)) ? (input!.source as PartnerEarningSource) : 'referido';

    return this.repo.save(this.repo.create({
      offerId, partnerName, source, amount: amount.toFixed(2), receivedAt,
      tenantId: clean(input?.tenantId, 100) || null,
      reference: clean(input?.reference, 120) || null,
      note: clean(input?.note, 500) || null,
      createdBy: who || null,
    }));
  }

  /** Ingresos de un mes (o los últimos 50). */
  list(month?: string) {
    if (month && isMonth(month)) {
      const [from, to] = monthRange(month);
      return this.repo.find({ where: { receivedAt: Between(from, to) }, order: { receivedAt: 'DESC', createdAt: 'DESC' } });
    }
    return this.repo.find({ order: { receivedAt: 'DESC', createdAt: 'DESC' }, take: 50 });
  }

  async remove(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Ingreso no encontrado.');
    await this.repo.remove(e);
    return { ok: true };
  }

  /**
   * Resumen para el dashboard: total del mes y del anterior, del año, los
   * últimos 6 meses, por aliado (con sus clics del mes) y por origen.
   */
  async summary(month?: string) {
    const m = isMonth(month) ? month! : new Date().toISOString().slice(0, 7);
    const first6 = shiftMonth(m, -5);
    const [from6] = monthRange(first6);
    const [, to] = monthRange(m);
    const [mFrom] = monthRange(m);
    const yearFrom = `${m.slice(0, 4)}-01-01`;

    const rows = await this.repo.find({ where: { receivedAt: Between(from6 < yearFrom ? from6 : yearFrom, to) } });
    const prev = shiftMonth(m, -1);
    const sum = (list: PartnerEarning[]) => round(list.reduce((s, e) => s + Number(e.amount), 0));
    const inMonth = (e: PartnerEarning, mm: string) => String(e.receivedAt).slice(0, 7) === mm;

    const monthRows = rows.filter((e) => inMonth(e, m));
    const byMonth = Array.from({ length: 6 }, (_, i) => shiftMonth(first6, i))
      .map((mm) => ({ month: mm, total: sum(rows.filter((e) => inMonth(e, mm))) }));

    // Por aliado (mes): ingresos + clics del mes en ese servicio
    const clickRows = await this.clicks.createQueryBuilder('c')
      .select('c."offerId"', 'offerId').addSelect('COUNT(*)', 'clicks')
      .where('c."createdAt" >= :from AND c."createdAt" < :to', { from: `${mFrom}T00:00:00`, to: `${shiftMonth(m, 1)}-01T00:00:00` })
      .groupBy('c."offerId"').getRawMany();
    const clicksBy = new Map(clickRows.map((r: any) => [r.offerId, Number(r.clicks)]));
    const partners = new Map<string, { offerId: string | null; name: string; total: number; count: number; clicks: number }>();
    for (const e of monthRows) {
      const key = e.offerId || `n:${e.partnerName}`;
      const p = partners.get(key) || { offerId: e.offerId, name: e.partnerName, total: 0, count: 0, clicks: e.offerId ? clicksBy.get(e.offerId) || 0 : 0 };
      p.total = round(p.total + Number(e.amount));
      p.count++;
      partners.set(key, p);
    }

    return {
      month: m,
      total: sum(monthRows),
      prevTotal: sum(rows.filter((e) => inMonth(e, prev))),
      yearTotal: sum(rows.filter((e) => String(e.receivedAt) >= yearFrom && String(e.receivedAt) <= to)),
      count: monthRows.length,
      clicks: [...clicksBy.values()].reduce((s, n) => s + n, 0),
      byMonth,
      byPartner: [...partners.values()].sort((a, b) => b.total - a.total),
      bySource: EARNING_SOURCES.map((s) => ({ source: s, total: sum(monthRows.filter((e) => e.source === s)) })).filter((s) => s.total > 0),
    };
  }
}
