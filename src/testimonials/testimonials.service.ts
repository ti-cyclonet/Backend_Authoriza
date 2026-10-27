import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Not, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { Testimonial, TestimonialSite, TestimonialStatus } from './testimonial.entity';

/** Buzón que recibe las opiniones nuevas y las alertas de calificación baja. */
export const FEEDBACK_INBOX = 'ti.cyclonet.sas@gmail.com';
/** Lo que más le ayudó al usuario (InOut). */
export const HIGHLIGHTS = ['inventario', 'productos', 'ventas', 'pedidos', 'market', 'cartera', 'domicilios', 'reportes', 'soporte'];
export const SITES: TestimonialSite[] = ['inout', 'cyclonet'];
/** Una opinión por usuario cada 90 días. */
const COOLDOWN_DAYS = 90;
/** Desde esta calificación se propone para publicar; por debajo es solo interna. */
const PUBLISH_MIN_RATING = 4;

export interface TestimonialInput {
  application?: string;
  tenantId?: string;
  userId?: string;
  authorName?: string;
  authorEmail?: string | null;
  businessName?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  rating?: unknown;
  comment?: string;
  highlights?: unknown;
  consentPublish?: unknown;
  consentLogo?: unknown;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
)[c]);
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** «Laura Gómez Pérez» → «Laura G.» (lo que se publica). */
export function publicName(name: string): string {
  const parts = clean(name, 120).split(' ').filter(Boolean);
  if (!parts.length) return 'Cliente';
  return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
}

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);
  private readonly adminUrl = (process.env.AUTHORIZA_APP_URL || 'https://master.d249aa02o69249.amplifyapp.com').replace(/\/+$/, '');

  constructor(
    @InjectRepository(Testimonial) private readonly repo: Repository<Testimonial>,
    private readonly mail: MailService,
  ) {}

  /** ¿El usuario puede dejar otra opinión? (para la invitación de la app) */
  async lastFor(userId: string, application = 'InOut') {
    const last = await this.repo.findOne({ where: { userId, application }, order: { createdAt: 'DESC' } });
    const nextAt = last ? new Date(last.createdAt.getTime() + COOLDOWN_DAYS * 86400000) : null;
    return { last: last ? { rating: last.rating, status: last.status, createdAt: last.createdAt } : null, canSubmit: !nextAt || nextAt <= new Date(), nextAt };
  }

  /** Opinión enviada desde una app (vía interna, con los datos del negocio). */
  async create(input: TestimonialInput) {
    const application = clean(input.application || 'InOut', 30);
    const tenantId = clean(input.tenantId, 100);
    const userId = clean(input.userId, 100);
    if (!tenantId || !userId) throw new BadRequestException('Falta el negocio o el usuario.');
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('La calificación va de 1 a 5 estrellas.');
    const comment = String(input.comment ?? '').trim().slice(0, 1000);
    if (comment.length < 10) throw new BadRequestException('Cuéntanos un poco más (mínimo 10 caracteres).');
    const highlights = (Array.isArray(input.highlights) ? input.highlights : [])
      .map((h) => String(h)).filter((h) => HIGHLIGHTS.includes(h)).slice(0, 5);

    const since = new Date(Date.now() - COOLDOWN_DAYS * 86400000);
    if (await this.repo.count({ where: { userId, application, createdAt: MoreThan(since) } })) {
      throw new ConflictException('Ya nos dejaste tu opinión hace poco. ¡Gracias! Podrás contarnos de nuevo más adelante.');
    }

    const consentPublish = input.consentPublish === true || input.consentPublish === 'true';
    const consentLogo = consentPublish && (input.consentLogo === true || input.consentLogo === 'true');
    // Calificaciones bajas o sin permiso: solo internas (no se proponen para publicar)
    const status: TestimonialStatus = consentPublish && rating >= PUBLISH_MIN_RATING ? 'PENDIENTE' : 'PRIVADO';

    const saved = await this.repo.save(this.repo.create({
      application, tenantId, userId,
      authorName: clean(input.authorName, 120) || 'Cliente',
      authorEmail: clean(input.authorEmail, 255) || null,
      businessName: clean(input.businessName, 120) || null,
      city: clean(input.city, 80) || null,
      logoUrl: /^https:\/\//.test(String(input.logoUrl || '')) ? String(input.logoUrl).slice(0, 500) : null,
      rating, comment, highlights, consentPublish, consentLogo,
      verified: true, status, featured: false,
      showOn: application === 'InOut' ? ['inout'] : [],
    }));
    await this.notify(saved).catch((e) => this.logger.warn(`Aviso de opinión ${saved.id}: ${e?.message}`));
    return {
      id: saved.id,
      status: saved.status,
      // 5 estrellas: se le invita a reseñar también en Google (si está configurado)
      googleReviewUrl: rating === 5 && process.env.GOOGLE_REVIEW_URL ? process.env.GOOGLE_REVIEW_URL : null,
    };
  }

  /** Aviso al buzón: por aprobar, o alerta de soporte si la calificación es baja. */
  private async notify(t: Testimonial) {
    const low = t.rating < PUBLISH_MIN_RATING;
    const subject = low
      ? `[Opiniones] ⚠ Calificación baja (${t.rating}★) de ${t.businessName || t.authorName} · ${t.application}`
      : `[Opiniones] Nueva opinión ${stars(t.rating)} de ${t.businessName || t.authorName} · ${t.application}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
        <div style="background:${low ? '#b91c1c' : '#1a237e'};padding:18px 22px;color:#fff;">
          <h2 style="margin:0;font-size:18px;">${low ? 'Un cliente no está contento' : 'Nueva opinión de un cliente'}</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:.85;">${esc(t.application)} · ${esc(t.businessName || '')}</p>
        </div>
        <div style="padding:20px 22px;color:#333;line-height:1.55;">
          <p style="font-size:22px;color:#f59e0b;margin:0;">${stars(t.rating)}</p>
          <p style="background:#f5f7fb;border-radius:8px;padding:12px 14px;">${esc(t.comment)}</p>
          <p style="font-size:13px;color:#555;margin:0;"><b>${esc(t.authorName)}</b>${t.authorEmail ? ` · ${esc(t.authorEmail)}` : ''}${t.city ? ` · ${esc(t.city)}` : ''}</p>
          <p style="font-size:13px;color:#555;">${t.consentPublish ? 'Autorizó publicar su opinión' + (t.consentLogo ? ' y su logo' : '') : 'No autorizó publicarla'}.</p>
          ${low
            ? '<p style="font-size:13px;color:#b91c1c;"><b>Contáctalo para entender qué pasó.</b> Esta opinión no se publica.</p>'
            : t.status === 'PENDIENTE'
              ? `<p style="text-align:center;margin:18px 0 4px;"><a href="${this.adminUrl}/opiniones" style="background:#1a237e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Revisar y aprobar</a></p>`
              : ''}
        </div>
      </div>`;
    await this.mail.send(FEEDBACK_INBOX, subject, html, { application: t.application, tenantId: t.tenantId });
  }

  // ── Administración (Authoriza) ──

  list(filters: { status?: string; application?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.application) where.application = filters.application;
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 500 });
  }

  /** Aprobar, rechazar, destacar, elegir dónde sale o corregir la ortografía. */
  async update(id: string, patch: { status?: string; featured?: boolean; showOn?: unknown; editedComment?: string | null }, reviewer?: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Opinión no encontrada');
    if (patch.status !== undefined) {
      if (!['PENDIENTE', 'APROBADO', 'RECHAZADO', 'PRIVADO'].includes(patch.status)) throw new BadRequestException('Estado no válido.');
      if (patch.status === 'APROBADO' && !t.consentPublish) throw new BadRequestException('El cliente no autorizó publicar esta opinión.');
      t.status = patch.status as TestimonialStatus;
      t.reviewedBy = reviewer || null;
      t.reviewedAt = new Date();
    }
    if (patch.featured !== undefined) t.featured = !!patch.featured;
    if (patch.showOn !== undefined) {
      const sites = (Array.isArray(patch.showOn) ? patch.showOn : []).filter((s): s is TestimonialSite => SITES.includes(s as TestimonialSite));
      t.showOn = [...new Set(sites)];
    }
    if (patch.editedComment !== undefined) {
      const edited = String(patch.editedComment ?? '').trim().slice(0, 1000);
      t.editedComment = edited && edited !== t.comment ? edited : null;
    }
    return this.repo.save(t);
  }

  /** Indicadores: promedio, distribución, por mes y por módulo. */
  async stats(application?: string) {
    const all = await this.repo.find({ where: { ...(application ? { application } : {}), status: Not('RECHAZADO') } });
    const count = all.length;
    const average = count ? Math.round((all.reduce((s, t) => s + t.rating, 0) / count) * 10) / 10 : null;
    const distribution = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: all.filter((t) => t.rating === n).length }));
    const months = new Map<string, { month: string; count: number; sum: number }>();
    for (const t of all) {
      const m = new Date(t.createdAt.getTime() - 5 * 3600000).toISOString().slice(0, 7);
      const e = months.get(m) || { month: m, count: 0, sum: 0 };
      e.count++; e.sum += t.rating; months.set(m, e);
    }
    const byMonth = [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12)
      .map((m) => ({ month: m.month, count: m.count, average: Math.round((m.sum / m.count) * 10) / 10 }));
    const byHighlight = HIGHLIGHTS.map((h) => {
      const rows = all.filter((t) => (t.highlights || []).includes(h));
      return { highlight: h, count: rows.length, average: rows.length ? Math.round((rows.reduce((s, t) => s + t.rating, 0) / rows.length) * 10) / 10 : null };
    }).filter((h) => h.count > 0).sort((a, b) => b.count - a.count);
    return {
      count, average, distribution, byMonth, byHighlight,
      pending: all.filter((t) => t.status === 'PENDIENTE').length,
      low: all.filter((t) => t.rating < PUBLISH_MIN_RATING).length,
    };
  }

  // ── Público (landings) ──

  /**
   * Opiniones aprobadas y con permiso para una landing ('inout' o 'cyclonet'),
   * sin datos internos. El promedio cuenta todas las calificaciones recibidas
   * de esas apps (también las bajas y las privadas), no solo las publicadas.
   */
  async publicList(site: string) {
    if (!SITES.includes(site as TestimonialSite)) throw new BadRequestException('Sitio no válido.');
    const approved = (await this.repo.find({ where: { status: 'APROBADO', consentPublish: true }, order: { featured: 'DESC', createdAt: 'DESC' } }))
      .filter((t) => (t.showOn || []).includes(site as TestimonialSite))
      .slice(0, 24);
    const apps = [...new Set(approved.map((t) => t.application))];
    const pool = site === 'inout' ? ['InOut'] : apps;
    const rated = pool.length ? await this.repo.find({ where: pool.map((application) => ({ application, status: Not('RECHAZADO') as any })) }) : [];
    return {
      average: rated.length ? Math.round((rated.reduce((s, t) => s + t.rating, 0) / rated.length) * 10) / 10 : null,
      count: rated.length,
      items: approved.map((t) => ({
        id: t.id,
        application: t.application,
        rating: t.rating,
        comment: t.editedComment || t.comment,
        author: publicName(t.authorName),
        business: t.businessName,
        city: t.city,
        logoUrl: t.consentLogo ? t.logoUrl : null,
        highlights: t.highlights || [],
        verified: t.verified,
        featured: t.featured,
        date: t.createdAt,
      })),
    };
  }
}
