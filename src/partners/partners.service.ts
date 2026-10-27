import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnerClick, PartnerOffer } from './partner-offer.entity';

export const CATEGORIES = ['facturacion', 'contabilidad', 'pagos', 'hardware', 'mensajeria', 'domicilios', 'web', 'otros'];
export const APPLICATIONS = ['inout'];
/** Pantallas de InOut con sugerencia (app-partner-tip), además del catálogo. */
export const PLACEMENTS = ['inicio', 'ventas', 'cartera'];

export interface PartnerOfferInput {
  name?: string;
  category?: string;
  description?: string;
  benefit?: string | null;
  url?: string;
  logoUrl?: string | null;
  applications?: unknown;
  placements?: unknown;
  isAffiliate?: unknown;
  active?: unknown;
  sortOrder?: unknown;
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = (v: unknown, max = 30) => String(v ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, max);

/** Solo enlaces https (el clic redirige allí). */
function httpsUrl(v: unknown, field: string, max: number): string {
  const s = String(v ?? '').trim();
  let u: URL;
  try { u = new URL(s); } catch { throw new BadRequestException(`${field}: no es un enlace válido.`); }
  if (u.protocol !== 'https:') throw new BadRequestException(`${field}: debe empezar por https://`);
  if (s.length > max) throw new BadRequestException(`${field}: el enlace es muy largo.`);
  return s;
}

/**
 * Catálogo de servicios recomendados (aliados). El administrador de Authoriza
 * lo arma; las apps lo muestran y cada clic pasa por aquí para contarlo.
 */
@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(PartnerOffer) private readonly repo: Repository<PartnerOffer>,
    @InjectRepository(PartnerClick) private readonly clicks: Repository<PartnerClick>,
  ) {}

  /** Lo que ve la app: sin el enlace de destino (el clic pasa por go/:id). */
  async publicList(app = 'inout', placement?: string) {
    const application = slug(app) || 'inout';
    const where = slug(placement);
    const items = await this.repo.find({ where: { active: true }, order: { sortOrder: 'ASC', name: 'ASC' } });
    return items
      .filter((o) => (o.applications || []).includes(application))
      .filter((o) => !where || where === 'catalogo' || (o.placements || []).includes(where))
      .map((o) => ({
        id: o.id, name: o.name, category: o.category, description: o.description, benefit: o.benefit,
        logoUrl: o.logoUrl, isAffiliate: o.isAffiliate,
      }));
  }

  /** Registra el clic y devuelve a dónde redirigir. */
  async click(id: string, info: { app?: string; tenant?: string; placement?: string }) {
    const offer = /^[0-9a-f-]{36}$/i.test(String(id)) ? await this.repo.findOne({ where: { id, active: true } }) : null;
    if (!offer) throw new NotFoundException('Este servicio ya no está disponible.');
    await this.clicks.save(this.clicks.create({
      offerId: offer.id,
      application: slug(info.app) || 'inout',
      tenantId: clean(info.tenant, 100) || null,
      placement: slug(info.placement) || 'catalogo',
    })).catch(() => undefined); // el clic no debe impedir llegar al aliado
    return offer.url;
  }

  /** Administración: todo el catálogo con los clics de los últimos 30 días. */
  async list() {
    const [items, counts] = await Promise.all([
      this.repo.find({ order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.clicks.createQueryBuilder('c')
        .select('c.offerId', 'offerId')
        .addSelect('COUNT(*)', 'total')
        .addSelect(`COUNT(*) FILTER (WHERE c."createdAt" >= NOW() - INTERVAL '30 days')`, 'last30')
        .addSelect('COUNT(DISTINCT c."tenantId")', 'tenants')
        .groupBy('c.offerId')
        .getRawMany(),
    ]);
    const by = new Map(counts.map((c: any) => [c.offerId, c]));
    return items.map((o) => {
      const c: any = by.get(o.id) || {};
      return { ...o, clicks: { total: Number(c.total || 0), last30: Number(c.last30 || 0), tenants: Number(c.tenants || 0) } };
    });
  }

  /** Negocios que hicieron clic en un servicio (para reclamar la comisión al aliado). */
  async clicksOf(id: string) {
    return this.clicks.createQueryBuilder('c')
      .select('c."tenantId"', 'tenantId')
      .addSelect('COUNT(*)', 'clicks')
      .addSelect('MAX(c."createdAt")', 'lastAt')
      .addSelect(`STRING_AGG(DISTINCT c.placement, ', ')`, 'placements')
      .where('c."offerId" = :id', { id })
      .groupBy('c."tenantId"')
      .orderBy('"lastAt"', 'DESC')
      .limit(200)
      .getRawMany()
      .then((rows) => rows.map((r: any) => ({ ...r, clicks: Number(r.clicks) })));
  }

  private normalize(input: PartnerOfferInput, partial: boolean): Partial<PartnerOffer> {
    const out: Partial<PartnerOffer> = {};
    const has = (k: keyof PartnerOfferInput) => !partial || input[k] !== undefined;
    if (has('name')) {
      out.name = clean(input.name, 80);
      if (!out.name) throw new BadRequestException('Falta el nombre del servicio.');
    }
    if (has('description')) {
      out.description = String(input.description ?? '').trim().slice(0, 600);
      if (out.description.length < 10) throw new BadRequestException('Describe el servicio (mínimo 10 caracteres).');
    }
    if (has('url')) out.url = httpsUrl(input.url, 'Enlace', 1000);
    if (has('category')) out.category = CATEGORIES.includes(slug(input.category)) ? slug(input.category) : 'otros';
    if (input.benefit !== undefined) out.benefit = clean(input.benefit, 160) || null;
    if (input.logoUrl !== undefined) out.logoUrl = input.logoUrl ? httpsUrl(input.logoUrl, 'Logo', 500) : null;
    if (has('applications')) {
      const apps = (Array.isArray(input.applications) ? input.applications : ['inout']).map((a) => slug(a)).filter((a) => APPLICATIONS.includes(a));
      out.applications = apps.length ? [...new Set(apps)] : ['inout'];
    }
    if (input.placements !== undefined) {
      out.placements = [...new Set((Array.isArray(input.placements) ? input.placements : []).map((p) => slug(p)).filter((p) => PLACEMENTS.includes(p)))];
    }
    if (input.isAffiliate !== undefined) out.isAffiliate = input.isAffiliate === true;
    if (input.active !== undefined) out.active = input.active === true;
    if (input.sortOrder !== undefined) {
      const n = Math.round(Number(input.sortOrder));
      out.sortOrder = Number.isFinite(n) ? Math.min(Math.max(n, 0), 9999) : 100;
    }
    return out;
  }

  async create(input: PartnerOfferInput) {
    return this.repo.save(this.repo.create(this.normalize(input || {}, false)));
  }

  async update(id: string, input: PartnerOfferInput) {
    const offer = await this.repo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Servicio no encontrado.');
    Object.assign(offer, this.normalize(input || {}, true));
    return this.repo.save(offer);
  }

  /** Borra el servicio y sus clics. */
  async remove(id: string) {
    const offer = await this.repo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Servicio no encontrado.');
    await this.clicks.delete({ offerId: id });
    await this.repo.remove(offer);
    return { ok: true };
  }
}
