import { Optional, BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Not, Repository } from 'typeorm';
import { EinvoiceIssuer } from './entities/einvoice-issuer.entity';
import { EinvoiceResolution } from './entities/einvoice-resolution.entity';
import { EinvoiceDocument } from './entities/einvoice-document.entity';
import { ContractAddon } from './entities/contract-addon.entity';
import { BuyerData, EinvoiceDocType, IssuerData, LineInput, computeTotals, nextNumber, nitCheckDigit, resolutionWarning, validateBuyer, validateIssuer } from './dian';
import { EinvoiceProvider, ProviderUnavailableError } from './providers/einvoice-provider';
import { NOT_AVAILABLE_MESSAGE, resolveProvider } from './providers/registry';
import { einvoicingCatalog } from './addon-plans';
import { NotificationsService } from '../notifications/notifications.service';
import { NoticeContext, noticeVariables } from './einvoicing-notices';
import { einvoicingIncome, lastMonths } from './einvoicing-income';
import { ContractService } from '../contract/contract.service';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { buyerFromUser, linesFromInvoice } from './cyclonet-invoices';

/** Reintentos de documentos en contingencia: 1 min, 5 min, 15 min, 1 h y luego cada 6 h. */
const BACKOFF_MIN = [1, 5, 15, 60, 360];

export interface IssueInput {
  tenantId: string;
  sourceApp: 'INOUT' | 'AUTHORIZA' | 'FACTONET';
  sourceId: string;
  type: 'FACTURA' | 'POS';
  /** null = consumidor final. */
  buyer: BuyerData | null;
  lines: LineInput[];
  paymentMeans?: 'CONTADO' | 'CREDITO';
  paymentMethod?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

export interface CreditNoteInput {
  tenantId: string;
  sourceApp: 'INOUT' | 'AUTHORIZA' | 'FACTONET';
  /** Registro de origen del documento que se corrige (p. ej. la venta anulada). */
  sourceId: string;
  /** Código DIAN: 1 devolución, 2 anulación, 3 rebaja, 4 ajuste de precio, 5 otros. */
  reasonCode?: '1' | '2' | '3' | '4' | '5';
  reason: string;
}

const yyyymm = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(d);

/**
 * Facturación electrónica del ecosistema: emisores (negocios y CycloNet),
 * numeración, documentos y el complemento del contrato que la habilita. Habla
 * con el proveedor tecnológico solo a través de EinvoiceProvider; mientras no
 * haya uno configurado (EINVOICING_PROVIDER), todo responde "en configuración".
 */
@Injectable()
export class EinvoicingService {
  private readonly logger = new Logger(EinvoicingService.name);

  constructor(
    @InjectRepository(EinvoiceIssuer) private readonly issuers: Repository<EinvoiceIssuer>,
    @InjectRepository(EinvoiceResolution) private readonly resolutions: Repository<EinvoiceResolution>,
    @InjectRepository(EinvoiceDocument) private readonly documents: Repository<EinvoiceDocument>,
    @InjectRepository(ContractAddon) private readonly addons: Repository<ContractAddon>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly contracts: ContractService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** Se resuelve en cada uso: encenderlo solo exige cambiar el .env y reiniciar. */
  provider(): EinvoiceProvider | null {
    return resolveProvider();
  }

  // ═══════════════════════ Estado y oferta (lo que ve el negocio)

  async status(tenantId: string) {
    const provider = this.provider();
    const [addon, issuer] = await Promise.all([this.currentAddon(tenantId), this.issuers.findOne({ where: { tenantId } })]);
    const resolutions = issuer ? await this.resolutions.find({ where: { issuerId: issuer.id, active: true }, order: { createdAt: 'DESC' } }) : [];
    const month = yyyymm(new Date());
    return {
      available: !!provider,
      provider: provider?.name ?? null,
      message: provider ? null : NOT_AVAILABLE_MESSAGE,
      supports: provider ? [...provider.supports] : ['FACTURA', 'NOTA_CREDITO', 'POS'],
      catalog: einvoicingCatalog(),
      addon: addon && {
        status: addon.status,
        tier: addon.tier,
        includedUnits: addon.includedUnits,
        monthlyValue: addon.monthlyValue != null ? Number(addon.monthlyValue) : null,
        extraUnitValue: addon.extraUnitValue != null ? Number(addon.extraUnitValue) : null,
        requestedAt: addon.requestedAt,
        activatedAt: addon.activatedAt,
      },
      issuer: issuer ? this.publicIssuer(issuer) : null,
      issuerErrors: issuer ? validateIssuer(issuer as any) : ['Faltan los datos fiscales del negocio.'],
      resolutions: resolutions.map((r) => ({
        id: r.id, docType: r.docType, resolutionNumber: r.resolutionNumber, prefix: r.prefix, rangeFrom: r.rangeFrom, rangeTo: r.rangeTo,
        lastNumber: r.lastNumber, validFrom: r.validFrom, validTo: r.validTo, warning: resolutionWarning(r),
      })),
      usage: { month, used: await this.unitsUsed(tenantId, month), included: addon?.status === 'ACTIVO' ? addon.includedUnits : 0 },
    };
  }

  // ═══════════════════════ Complemento del contrato

  /** El negocio acepta los términos y pide el complemento (queda SOLICITADO hasta poder activarlo). */
  async requestAddon(tenantId: string, input: { tier: string; acceptTerms: boolean; requestedBy: string; ip?: string | null }) {
    if (!input.acceptTerms) throw new BadRequestException('Acepta los términos del servicio de facturación electrónica.');
    const catalog = einvoicingCatalog();
    const tier = catalog.tiers.find((t) => t.code === input.tier);
    if (!tier) throw new BadRequestException('Elige un plan de facturación electrónica.');
    const current = await this.currentAddon(tenantId);
    if (current) throw new ConflictException('Ya tienes la facturación electrónica solicitada o activa.');
    const limits = await this.contracts.findTenantLimits(tenantId, 'Inout').catch(() => null);
    if (!limits?.contractId) throw new BadRequestException('Necesitas un contrato activo de InOut para activar la facturación electrónica.');
    await this.addons.save(this.addons.create({
      tenantId,
      contractId: limits.contractId,
      code: 'EINVOICING',
      tier: tier.code,
      includedUnits: tier.includedUnits,
      monthlyValue: tier.monthly,
      extraUnitValue: catalog.extraUnit,
      status: 'SOLICITADO',
      termsVersion: catalog.termsVersion,
      requestedBy: String(input.requestedBy || '').slice(0, 255),
      requestedAt: new Date(),
      requestIp: input.ip?.slice(0, 64) || null,
    }));
    this.logger.log(`Facturación electrónica solicitada por ${tenantId} (plan ${tier.code})`);
    // Avisos: a CycloNet (adminFactonet) y la confirmación al negocio. No bloquean la solicitud.
    this.noticeContext(tenantId, { requestedBy: input.requestedBy, tier: tier.code, includedUnits: tier.includedUnits, monthly: tier.monthly, requestedAt: new Date() })
      .then((ctx) => this.sendRequestNotices(ctx))
      .catch((e) => this.logger.warn(`Avisos de la solicitud de facturación electrónica (${tenantId}): ${e.message}`));
    await this.maybeActivate(tenantId);
    return this.status(tenantId);
  }

  /** Se cancela al terminar el periodo: lo emitido se sigue consultando. */
  async cancelAddon(tenantId: string) {
    const current = await this.currentAddon(tenantId);
    if (!current) throw new NotFoundException('No tienes la facturación electrónica activa.');
    current.status = 'CANCELADO';
    current.cancelledAt = new Date();
    await this.addons.save(current);
    return this.status(tenantId);
  }

  /**
   * Activa el complemento cuando todo está listo: proveedor disponible, datos
   * fiscales completos y resolución de factura vigente. Da de alta al emisor
   * en el proveedor y fija el precio vigente si se pidió "por definir".
   */
  async maybeActivate(tenantId: string): Promise<boolean> {
    const provider = this.provider();
    const addon = await this.currentAddon(tenantId);
    const issuer = await this.issuers.findOne({ where: { tenantId } });
    if (!provider || !addon || addon.status !== 'SOLICITADO' || !issuer || issuer.status === 'DATOS_INCOMPLETOS') return false;
    if (issuer.status !== 'HABILITADO' || issuer.providerName !== provider.name) {
      const r = await provider.registerIssuer({ ...(issuer as any), tenantId });
      issuer.providerIssuerId = r.providerIssuerId;
      issuer.providerName = provider.name;
      issuer.status = 'HABILITADO';
      await this.issuers.save(issuer);
    }
    const catalog = einvoicingCatalog();
    const tier = catalog.tiers.find((t) => t.code === addon.tier);
    if (addon.monthlyValue == null && tier?.monthly != null) addon.monthlyValue = tier.monthly;
    if (addon.extraUnitValue == null) addon.extraUnitValue = catalog.extraUnit;
    addon.status = 'ACTIVO';
    addon.activatedAt = new Date();
    await this.addons.save(addon);
    this.logger.log(`Facturación electrónica ACTIVA para ${tenantId}`);
    // "Te avisaremos": correo al negocio, una sola vez
    if (!addon.notifiedAt) {
      try {
        const ctx = await this.noticeContext(tenantId, { requestedBy: addon.requestedBy, tier: addon.tier, includedUnits: addon.includedUnits, monthly: addon.monthlyValue, requestedAt: addon.requestedAt });
        await this.mail('EINVOICING_ACTIVATED', [ctx.requestedBy, ctx.tenantEmail], noticeVariables(ctx));
        addon.notifiedAt = new Date();
        await this.addons.save(addon);
      } catch (e) {
        this.logger.warn(`Aviso de activación de facturación electrónica (${tenantId}): ${(e as Error).message}`);
      }
    }
    return true;
  }

  /** Al encender el proveedor: activa los complementos que ya estaban listos. */
  @Cron(CronExpression.EVERY_HOUR)
  async activatePending(): Promise<number> {
    if (!this.provider()) return 0;
    const waiting = await this.addons.find({ where: { status: 'SOLICITADO' } });
    let n = 0;
    for (const a of waiting) if (await this.maybeActivate(a.tenantId).catch(() => false)) n++;
    return n;
  }

  // ═══════════════════════ Emisor y numeración

  async saveIssuer(tenantId: string, data: Partial<IssuerData>) {
    const clean: Partial<IssuerData> = {
      ...data,
      idNumber: String(data.idNumber || '').replace(/\D/g, ''),
      checkDigit: data.idType === '31' ? nitCheckDigit(String(data.idNumber || '')) : null,
      responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
    };
    const errors = validateIssuer(clean);
    if (errors.length) throw new BadRequestException({ error: 'ISSUER_INVALID', message: errors[0], errors });
    let issuer = await this.issuers.findOne({ where: { tenantId } });
    // Cambiar datos de un emisor ya dado de alta obliga a darlo de alta otra vez en el PT
    issuer = Object.assign(issuer || this.issuers.create({ tenantId }), clean, issuer?.status === 'HABILITADO' ? { status: 'LISTO' } : {});
    await this.issuers.save(issuer);
    await this.refreshIssuerStatus(issuer);
    await this.maybeActivate(tenantId);
    return this.status(tenantId);
  }

  async addResolution(tenantId: string, r: {
    docType: 'FACTURA' | 'POS' | 'NOTA_CREDITO'; resolutionNumber?: string; prefix: string; rangeFrom: number; rangeTo: number;
    validFrom: string; validTo: string; technicalKey?: string;
  }) {
    const issuer = await this.issuers.findOne({ where: { tenantId } });
    if (!issuer) throw new BadRequestException('Primero guarda los datos fiscales del negocio.');
    const prefix = String(r.prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!['FACTURA', 'POS', 'NOTA_CREDITO'].includes(r.docType)) throw new BadRequestException('Tipo de numeración no válido.');
    if (!prefix || prefix.length > 4) throw new BadRequestException('El prefijo debe tener de 1 a 4 letras o números.');
    const from = Math.trunc(Number(r.rangeFrom));
    const to = Math.trunc(Number(r.rangeTo));
    if (!(from >= 1) || !(to >= from)) throw new BadRequestException('Revisa el rango autorizado (desde ≤ hasta).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.validFrom)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.validTo)) || r.validTo < r.validFrom) {
      throw new BadRequestException('Revisa las fechas de vigencia de la resolución.');
    }
    if (r.docType !== 'NOTA_CREDITO' && !String(r.resolutionNumber || '').trim()) throw new BadRequestException('Escribe el número de la resolución de la DIAN.');
    await this.resolutions.update({ issuerId: issuer.id, docType: r.docType, active: true }, { active: false });
    await this.resolutions.save(this.resolutions.create({
      issuerId: issuer.id, docType: r.docType, resolutionNumber: r.resolutionNumber?.trim() || null, prefix,
      rangeFrom: from, rangeTo: to, lastNumber: from - 1, validFrom: r.validFrom, validTo: r.validTo,
      technicalKey: r.technicalKey?.trim() || null, active: true,
    }));
    await this.refreshIssuerStatus(issuer);
    await this.maybeActivate(tenantId);
    return this.status(tenantId);
  }

  // ═══════════════════════ Emisión

  /** Emite una factura o un POS: reserva el número y lo envía en segundo plano. Idempotente por origen. */
  async issue(input: IssueInput): Promise<EinvoiceDocument> {
    const key = `${input.sourceApp}:${input.sourceId}:${input.type}`;
    const existing = await this.documents.findOne({ where: { idempotencyKey: key } });
    if (existing) return existing;
    const issuer = await this.assertCanIssue(input.tenantId, input.sourceApp, input.type);
    const buyerErrors = validateBuyer(input.buyer, input.type);
    if (buyerErrors.length) throw new BadRequestException({ error: 'BUYER_INVALID', message: buyerErrors[0], errors: buyerErrors });
    let totals;
    try {
      totals = computeTotals(input.lines);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const doc = await this.reserveAndCreate(issuer, input.type, {
      tenantId: input.tenantId, sourceApp: input.sourceApp, sourceId: input.sourceId, idempotencyKey: key,
      buyer: input.buyer, totals, total: totals.total,
      extra: { paymentMeans: input.paymentMeans || 'CONTADO', paymentMethod: input.paymentMethod || null, dueDate: input.dueDate || null, notes: input.notes || null },
    });
    setImmediate(() => this.send(doc.id).catch((e) => this.logger.warn(`Envío ${doc.prefix}${doc.number}: ${e.message}`)));
    return doc;
  }

  /** Nota crédito que anula (o corrige) el documento de un origen, p. ej. una venta anulada. */
  async creditNote(input: CreditNoteInput): Promise<EinvoiceDocument | null> {
    const original = await this.documents.findOne({
      where: { tenantId: input.tenantId, sourceApp: input.sourceApp, sourceId: input.sourceId, type: In(['FACTURA', 'POS']), status: Not('RECHAZADO') },
    });
    if (!original) return null; // la venta no tenía documento electrónico: no hay nada que corregir
    const key = `${input.sourceApp}:${input.sourceId}:NOTA_CREDITO`;
    const existing = await this.documents.findOne({ where: { idempotencyKey: key } });
    if (existing) return existing;
    const issuer = await this.assertCanIssue(input.tenantId, input.sourceApp, 'NOTA_CREDITO');
    const doc = await this.reserveAndCreate(issuer, 'NOTA_CREDITO', {
      tenantId: input.tenantId, sourceApp: input.sourceApp, sourceId: input.sourceId, idempotencyKey: key,
      buyer: original.buyer, totals: original.totals, total: Number(original.total), relatedDocumentId: original.id,
      extra: { reasonCode: input.reasonCode || '2', reason: String(input.reason || 'Anulación').slice(0, 300) },
    });
    setImmediate(() => this.send(doc.id).catch((e) => this.logger.warn(`Envío ${doc.prefix}${doc.number}: ${e.message}`)));
    return doc;
  }

  async documentsFor(tenantId: string, sourceApp: string, sourceId: string) {
    const docs = await this.documents.find({ where: { tenantId, sourceApp: sourceApp as any, sourceId }, order: { createdAt: 'ASC' } });
    return docs.map((d) => this.publicDocument(d));
  }

  /** Envía un documento al proveedor y guarda el resultado (lo usa la cola de reintentos). */
  async send(documentId: string): Promise<EinvoiceDocument> {
    const doc = await this.documents.findOneOrFail({ where: { id: documentId } });
    if (doc.status === 'ACEPTADO' || doc.status === 'RECHAZADO') return doc;
    const provider = this.provider();
    if (!provider) return this.contingency(doc, 'Facturación electrónica en configuración: se enviará cuando el proveedor esté disponible.');
    const issuer = await this.issuers.findOneOrFail({ where: { id: doc.issuerId } });
    const resolution = doc.resolutionId
      ? await this.resolutions.createQueryBuilder('r').addSelect('r.technicalKey').where('r.id = :id', { id: doc.resolutionId }).getOne()
      : null;
    const related = doc.relatedDocumentId ? await this.documents.findOne({ where: { id: doc.relatedDocumentId } }) : null;
    doc.attempts += 1;
    try {
      const r = await provider.issue({
        id: doc.id, type: doc.type, prefix: doc.prefix, number: doc.number, issueDate: doc.issueDate,
        technicalKey: resolution?.technicalKey ?? null, resolutionNumber: resolution?.resolutionNumber ?? null,
        issuer: { ...(issuer as any), tenantId: issuer.tenantId },
        buyer: (doc.buyer as BuyerData) || null,
        totals: doc.totals as any,
        paymentMeans: doc.extra?.paymentMeans === 'CREDITO' ? 'CREDITO' : 'CONTADO',
        paymentMethod: doc.extra?.paymentMethod ?? null,
        dueDate: doc.extra?.dueDate ? new Date(doc.extra.dueDate) : null,
        notes: doc.extra?.notes ?? null,
        reference: related ? { prefix: related.prefix, number: related.number, cufe: related.cufe, issueDate: related.issueDate, reasonCode: doc.extra?.reasonCode || '2', reason: doc.extra?.reason || '' } : null,
      });
      Object.assign(doc, {
        status: r.status, cufe: r.cufe ?? doc.cufe, providerRef: r.providerRef ?? doc.providerRef, qrData: r.qrData ?? doc.qrData,
        xmlUrl: r.xmlUrl ?? doc.xmlUrl, pdfUrl: r.pdfUrl ?? doc.pdfUrl, messages: r.messages?.length ? r.messages : doc.messages,
        nextAttemptAt: r.status === 'EN_PROCESO' ? new Date(Date.now() + 2 * 60_000) : null,
      });
      return this.documents.save(doc);
    } catch (e) {
      if (e instanceof ProviderUnavailableError || !(e instanceof BadRequestException)) return this.contingency(doc, (e as Error).message);
      throw e;
    }
  }

  /** Cola: reenvía lo pendiente o en contingencia y consulta lo que sigue en proceso. */
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue(): Promise<number> {
    const provider = this.provider();
    if (!provider) return 0;
    const due = await this.documents.find({
      where: [
        { status: In(['PENDIENTE', 'CONTINGENCIA']), nextAttemptAt: LessThanOrEqual(new Date()) },
        { status: 'EN_PROCESO', nextAttemptAt: LessThanOrEqual(new Date()) },
      ],
      order: { createdAt: 'ASC' },
      take: 25,
    });
    for (const d of due) {
      try {
        if (d.status === 'EN_PROCESO' && d.providerRef) {
          const r = await provider.getStatus(d.providerRef);
          Object.assign(d, { status: r.status, cufe: r.cufe ?? d.cufe, messages: r.messages ?? d.messages, nextAttemptAt: r.status === 'EN_PROCESO' ? new Date(Date.now() + 5 * 60_000) : null });
          await this.documents.save(d);
        } else await this.send(d.id);
      } catch (e) {
        this.logger.warn(`Cola de documentos electrónicos (${d.id}): ${(e as Error).message}`);
      }
    }
    return due.length;
  }

  /** Webhook del proveedor: resultado de la validación y eventos del comprador. */
  async handleWebhook(headers: Record<string, string | undefined>, body: unknown) {
    const provider = this.provider();
    if (!provider) return { ok: true, result: 'unavailable' };
    const ev = provider.parseWebhook(headers, body);
    if (!ev) throw new BadRequestException('Notificación no válida');
    const doc = await this.documents.findOne({ where: { providerRef: ev.providerRef } });
    if (!doc) return { ok: true, result: 'unknown' };
    if (ev.kind === 'STATUS' && ev.status) {
      doc.status = ev.status;
      if (ev.cufe) doc.cufe = ev.cufe;
      if (ev.messages?.length) doc.messages = ev.messages;
    } else {
      doc.events = [...(doc.events || []), { kind: ev.kind, at: new Date().toISOString() }];
    }
    await this.documents.save(doc);
    return { ok: true, result: 'updated' };
  }

  // ═══════════════════════ Facturas de CycloNet a sus clientes (fase 1)

  /**
   * Emite como documento electrónico cada factura de CycloNet ya emitida
   * (no borrador), desde EINVOICING_CYCLONET_FROM (YYYY-MM-DD) para no
   * reprocesar las anteriores. CycloNet es el emisor EINVOICING_CYCLONET_TENANT_ID.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async emitCycloNetInvoices(): Promise<number> {
    const tenantId = (process.env.EINVOICING_CYCLONET_TENANT_ID || '').trim();
    const since = (process.env.EINVOICING_CYCLONET_FROM || '').trim();
    if (!this.provider() || !tenantId || !/^\d{4}-\d{2}-\d{2}$/.test(since)) return 0;
    const issuer = await this.issuers.findOne({ where: { tenantId } });
    if (issuer?.status !== 'HABILITADO') return 0;
    const pending: Invoice[] = await this.dataSource.getRepository(Invoice).createQueryBuilder('i')
      .leftJoinAndSelect('i.user', 'u').leftJoinAndSelect('u.basicData', 'bd').leftJoinAndSelect('bd.documentType', 'dt')
      .leftJoinAndSelect('bd.legalEntityData', 'le').leftJoinAndSelect('bd.naturalPersonData', 'np')
      .leftJoinAndSelect('i.contract', 'c').leftJoinAndSelect('c.package', 'p')
      .where('i.status <> :draft AND i.value > 0 AND i.issueDate >= :since', { draft: InvoiceStatus.UNCONFIRMED, since })
      .andWhere(`NOT EXISTS (SELECT 1 FROM einvoice_documents d WHERE d."idempotencyKey" = 'AUTHORIZA:' || i.id || ':FACTURA')`)
      .orderBy('i.issueDate', 'ASC').take(20).getMany();
    let n = 0;
    for (const inv of pending) {
      const buyer = buyerFromUser(inv.user);
      if (!buyer) { this.logger.warn(`Factura ${inv.code}: el cliente no tiene documento o nombre para la factura electrónica`); continue; }
      try {
        await this.issue({ tenantId, sourceApp: 'AUTHORIZA', sourceId: String(inv.id), type: 'FACTURA', buyer, lines: linesFromInvoice(inv as any), paymentMeans: 'CREDITO', dueDate: inv.expirationDate ? String(inv.expirationDate) : null, notes: inv.code ? `Factura ${inv.code}` : null });
        n++;
      } catch (e) {
        this.logger.warn(`Factura ${inv.code}: no se pudo emitir el documento electrónico: ${(e as Error).message}`);
      }
    }
    return n;
  }

  // ═══════════════════════ Consumo

  /** Documentos que cuentan para el cupo en un mes (YYYY-MM, hora de Bogotá); los rechazados no cuentan. */
  async unitsUsed(tenantId: string, month: string): Promise<number> {
    const [y, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1, 5));
    const to = new Date(Date.UTC(y, m, 1, 5));
    return this.documents.createQueryBuilder('d')
      .where('d.tenantId = :tenantId AND d.status <> :rej AND d.createdAt >= :from AND d.createdAt < :to', { tenantId, rej: 'RECHAZADO', from, to })
      .getCount();
  }

  /** Complemento vigente (SOLICITADO o ACTIVO) del negocio. */
  currentAddon(tenantId: string) {
    return this.addons.findOne({ where: { tenantId, code: 'EINVOICING', status: In(['SOLICITADO', 'ACTIVO']) }, order: { createdAt: 'DESC' } });
  }

  // ═══════════════════════ Ingresos de CycloNet (dashboard)

  /**
   * Ingresos por el complemento: facturado y pagado por mes (sin IVA), planes
   * activos y su valor mensual recurrente, documentos emitidos por los
   * negocios y, si se configura EINVOICING_PROVIDER_UNIT_COST, el costo
   * estimado del proveedor y el margen.
   */
  async incomeSummary(month?: string) {
    const m = /^\d{4}-\d{2}$/.test(String(month || '')) ? String(month) : yyyymm(new Date());
    const from = `${lastMonths(m, 6)[0]}-01`;
    const yearFrom = `${m.slice(0, 4)}-01-01`;
    const rows = await this.dataSource.query(
      `SELECT i."issueDate", i.status, i."addonCharges",
              COALESCE(le."businessName", NULLIF(TRIM(CONCAT(np."firstName", ' ', np."firstSurname")), ''), u."strUserName") AS client
         FROM invoices i
         LEFT JOIN "user" u ON u.id = i."userId"
         LEFT JOIN basic_data bd ON bd.id = u."basicDataId"
         LEFT JOIN legal_entity_data le ON le."basicDataId" = bd.id
         LEFT JOIN natural_person_data np ON np."basicDataId" = bd.id
        WHERE i."addonCharges" IS NOT NULL AND i."issueDate" >= LEAST($1::date, $2::date)`,
      [from, yearFrom],
    ).catch(() => []);
    const income = einvoicingIncome(rows, m);
    const [plans] = await this.dataSource.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'ACTIVO') AS active,
              COUNT(*) FILTER (WHERE status = 'SOLICITADO') AS requested,
              COALESCE(SUM("monthlyValue") FILTER (WHERE status = 'ACTIVO'), 0) AS mrr
         FROM contract_addons WHERE code = 'EINVOICING'`,
    ).catch(() => [{}]);
    const docs = await this.documents.createQueryBuilder('d')
      .where("d.sourceApp <> 'AUTHORIZA' AND d.status <> 'RECHAZADO' AND to_char(d.createdAt AT TIME ZONE 'America/Bogota', 'YYYY-MM') = :m", { m })
      .getCount().catch(() => 0);
    const unitCost = Number(process.env.EINVOICING_PROVIDER_UNIT_COST) || 0;
    const providerCost = unitCost > 0 ? Math.round(docs * unitCost) : null;
    return {
      available: !!this.provider(),
      ...income,
      activePlans: Number(plans?.active) || 0,
      requested: Number(plans?.requested) || 0,
      mrr: Number(plans?.mrr) || 0,
      documents: docs,
      providerUnitCost: unitCost || null,
      providerCost,
      margin: providerCost != null ? income.billed - providerCost : null,
    };
  }

  // ═══════════════════════ Avisos por correo

  /** Datos del negocio para los correos (nombre y correo del dueño del contrato). */
  private async noticeContext(tenantId: string, a: { requestedBy: string; tier: string; includedUnits: number; monthly: number | null; requestedAt: Date }): Promise<NoticeContext> {
    const rows = await this.dataSource.query(
      `SELECT u."strUserName" AS email, le."businessName" AS business, np."firstName" AS first, np."firstSurname" AS last
         FROM "user" u
         LEFT JOIN basic_data bd ON bd.id = u."basicDataId"
         LEFT JOIN legal_entity_data le ON le."basicDataId" = bd.id
         LEFT JOIN natural_person_data np ON np."basicDataId" = bd.id
        WHERE u.id = $1 LIMIT 1`,
      [tenantId],
    ).catch(() => []);
    const r = rows[0] || {};
    const inout = (process.env.INOUT_LOGIN_URL || 'https://app.cyclonet.com.co/login').replace(/\/login\/?$/, '');
    const authoriza = (process.env.AUTHORIZA_LOGIN_URL || 'https://auth.cyclonet.com.co/login').replace(/\/login\/?$/, '');
    return {
      businessName: r.business || [r.first, r.last].filter(Boolean).join(' ') || r.email || 'Negocio',
      tenantEmail: r.email || '',
      requestedBy: a.requestedBy || r.email || '',
      tier: a.tier,
      includedUnits: a.includedUnits,
      monthly: a.monthly != null ? Number(a.monthly) : null,
      requestedAt: new Date(a.requestedAt),
      available: !!this.provider(),
      settingsUrl: `${inout}/setting`,
      adminUrl: `${authoriza}/home`,
    };
  }

  private async sendRequestNotices(ctx: NoticeContext): Promise<void> {
    const admins: { email: string }[] = await this.dataSource.query(
      `SELECT DISTINCT u."strUserName" AS email FROM "user" u
         JOIN user_roles ur ON ur."userId" = u.id AND ur.status = 'ACTIVE'
         JOIN rol r ON r.id = ur."roleId" AND r."strName" = 'adminFactonet'`,
    ).catch(() => []);
    await this.mail('EINVOICING_REQUEST_ADMIN', admins.map((a) => a.email), noticeVariables(ctx, true));
    await this.mail('EINVOICING_REQUEST_RECEIVED', [ctx.requestedBy, ctx.tenantEmail], noticeVariables(ctx));
  }

  /** Envía la plantilla a cada correo distinto (sin repetir); un fallo no detiene a los demás. */
  private async mail(template: string, to: string[], vars: Record<string, string>): Promise<void> {
    if (!this.notifications) return;
    const unique = [...new Set(to.map((e) => String(e || '').trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
    for (const email of unique) {
      await this.notifications.sendByTemplate(template, email, vars).catch((e) => this.logger.warn(`${template} a ${email}: ${e.message}`));
    }
  }

  // ═══════════════════════ Internos

  private async assertCanIssue(tenantId: string, sourceApp: string, type: EinvoiceDocType): Promise<EinvoiceIssuer> {
    const provider = this.provider();
    if (!provider) throw new ServiceUnavailableException({ error: 'EINVOICING_NOT_AVAILABLE', message: NOT_AVAILABLE_MESSAGE });
    if (!provider.supports.includes(type)) throw new BadRequestException(`El proveedor de facturación electrónica no admite ${type}.`);
    // Los negocios necesitan el complemento activo; CycloNet (AUTHORIZA) factura sin complemento
    if (sourceApp !== 'AUTHORIZA') {
      const addon = await this.currentAddon(tenantId);
      if (addon?.status !== 'ACTIVO') throw new BadRequestException({ error: 'EINVOICING_NOT_ACTIVE', message: 'La facturación electrónica no está activa para este negocio.' });
    }
    const issuer = await this.issuers.findOne({ where: { tenantId } });
    if (!issuer || issuer.status !== 'HABILITADO') throw new BadRequestException({ error: 'ISSUER_NOT_READY', message: 'Completa los datos fiscales y la resolución de numeración.' });
    return issuer;
  }

  /** Reserva el siguiente número (con bloqueo) y crea el documento PENDIENTE en la misma transacción. */
  private async reserveAndCreate(issuer: EinvoiceIssuer, type: EinvoiceDocType, data: Partial<EinvoiceDocument>): Promise<EinvoiceDocument> {
    return this.dataSource.transaction(async (m) => {
      let res = await m.createQueryBuilder(EinvoiceResolution, 'r')
        .setLock('pessimistic_write')
        .where('r.issuerId = :id AND r.docType = :type AND r.active = true', { id: issuer.id, type })
        .getOne();
      if (!res && type === 'NOTA_CREDITO') {
        // Las notas no tienen rango autorizado por la DIAN: numeración propia con prefijo NC
        res = await m.save(m.create(EinvoiceResolution, {
          issuerId: issuer.id, docType: 'NOTA_CREDITO', prefix: 'NC', rangeFrom: 1, rangeTo: 99_999_999, lastNumber: 0,
          validFrom: '2020-01-01', validTo: '2099-12-31', active: true,
        }));
      }
      if (!res) throw new BadRequestException({ error: 'NO_RESOLUTION', message: `No hay resolución de numeración activa para ${type === 'POS' ? 'el POS electrónico' : 'facturas'}.` });
      const n = nextNumber(res);
      if ('error' in n) throw new BadRequestException({ error: 'NUMBERING', message: n.error });
      res.lastNumber = n.number;
      await m.save(res);
      return m.save(m.create(EinvoiceDocument, {
        ...data, issuerId: issuer.id, type, prefix: res.prefix, number: n.number, resolutionId: res.id,
        issueDate: new Date(), status: 'PENDIENTE', attempts: 0, nextAttemptAt: new Date(),
      }));
    });
  }

  private async contingency(doc: EinvoiceDocument, message: string): Promise<EinvoiceDocument> {
    const wait = BACKOFF_MIN[Math.min(doc.attempts, BACKOFF_MIN.length - 1)];
    doc.status = 'CONTINGENCIA';
    doc.nextAttemptAt = new Date(Date.now() + wait * 60_000);
    doc.messages = [message.slice(0, 500)];
    return this.documents.save(doc);
  }

  private async refreshIssuerStatus(issuer: EinvoiceIssuer) {
    if (issuer.status === 'HABILITADO') return;
    const hasInvoiceNumbering = await this.resolutions.count({ where: { issuerId: issuer.id, docType: In(['FACTURA', 'POS']), active: true } });
    const ready = !validateIssuer(issuer as any).length && hasInvoiceNumbering > 0;
    issuer.status = ready ? 'LISTO' : 'DATOS_INCOMPLETOS';
    await this.issuers.save(issuer);
  }

  private publicIssuer(i: EinvoiceIssuer) {
    const { providerIssuerId: _p, resolutions: _r, ...rest } = i as any;
    return rest;
  }

  publicDocument(d: EinvoiceDocument) {
    return {
      id: d.id, type: d.type, prefix: d.prefix, number: d.number, fullNumber: `${d.prefix}${d.number}`, status: d.status,
      cufe: d.cufe, qrData: d.qrData, pdfUrl: d.pdfUrl, xmlUrl: d.xmlUrl, total: Number(d.total), issueDate: d.issueDate,
      messages: d.messages || [], events: d.events || [],
    };
  }
}
