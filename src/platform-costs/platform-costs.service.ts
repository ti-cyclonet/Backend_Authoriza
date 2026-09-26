import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Between, DataSource, Repository } from 'typeorm';
import {
  PlatformCostDaily, PlatformCostSettings, PlatformRate, PlatformSnapshot, PlatformUsageDaily,
} from './entities/platform-cost.entities';
import { fetchAwsDailyCosts, fetchCloudinaryUsage } from './providers';

/** Aplicaciones del ecosistema (nombres como en Package.targetApplication). */
export const APPLICATIONS = ['Authoriza', 'Inout', 'FactoNet', 'Shotra', 'Kiri'] as const;
export const PLATFORMS = ['AWS', 'CLOUDINARY', 'BELVO'] as const;

export interface UsageEventInput {
  application: string;
  tenantId?: string | null;
  platform: string;
  metric: string;
  quantity: number;
  day?: string;
}

const DEFAULT_RATES: PlatformRate[] = [
  { platform: 'SES', metric: 'emails', label: 'Amazon SES · por correo', usdPerUnit: 0.0001 },
  { platform: 'BELVO', metric: 'api_calls', label: 'Belvo · por llamada', usdPerUnit: 0 },
];

const num = (v: any) => {
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Día de hoy en Colombia (UTC-5). */
const todayCo = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Mes inválido (AAAA-MM).');
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  return { start, last, next, daysInMonth, prev };
}

/**
 * Consumo y costos de plataformas externas por aplicación y cliente:
 * - Consumo medido: las apps reportan sus eventos (subidas a Cloudinary,
 *   correos, llamadas a Belvo) y Authoriza los acumula por día.
 * - Costo real: AWS Cost Explorer (por servicio, diario) y el uso del plan
 *   de Cloudinary, sincronizados una vez al día.
 * La infraestructura compartida de AWS se reparte entre las apps según
 * porcentajes configurables; SES y Cloudinary según su consumo medido.
 */
@Injectable()
export class PlatformCostsService {
  private readonly logger = new Logger(PlatformCostsService.name);

  constructor(
    @InjectRepository(PlatformUsageDaily) private readonly usageRepo: Repository<PlatformUsageDaily>,
    @InjectRepository(PlatformCostDaily) private readonly costRepo: Repository<PlatformCostDaily>,
    @InjectRepository(PlatformSnapshot) private readonly snapshotRepo: Repository<PlatformSnapshot>,
    @InjectRepository(PlatformCostSettings) private readonly settingsRepo: Repository<PlatformCostSettings>,
    private readonly dataSource: DataSource,
  ) {}

  // ═══════════════ Consumo medido ═══════════════

  /** Acumula eventos de consumo (idempotente por día/app/cliente/plataforma/métrica). */
  async recordUsage(events: UsageEventInput[]): Promise<{ recorded: number }> {
    let recorded = 0;
    for (const e of events || []) {
      const quantity = num(e.quantity);
      if (!e.application || !e.platform || !e.metric || !(quantity > 0)) continue;
      await this.dataSource.query(
        `INSERT INTO platform_usage_daily (day, application, "tenantKey", platform, metric, quantity, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (day, application, "tenantKey", platform, metric)
         DO UPDATE SET quantity = platform_usage_daily.quantity + EXCLUDED.quantity, "updatedAt" = now()`,
        [
          e.day && /^\d{4}-\d{2}-\d{2}$/.test(e.day) ? e.day : todayCo(),
          String(e.application).slice(0, 30),
          (e.tenantId || '-').slice(0, 100),
          String(e.platform).toUpperCase().slice(0, 30),
          String(e.metric).slice(0, 40),
          quantity,
        ],
      );
      recorded++;
    }
    return { recorded };
  }

  /** Para uso interno de Authoriza (p. ej. correos enviados). No bloquea al llamador. */
  track(event: UsageEventInput): void {
    this.recordUsage([event]).catch((err) => this.logger.warn(`No se pudo registrar consumo: ${err.message}`));
  }

  // ═══════════════ Configuración ═══════════════

  async getSettings(): Promise<PlatformCostSettings> {
    let s = await this.settingsRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!s) {
      s = await this.settingsRepo.save(this.settingsRepo.create({
        usdToCop: 4000,
        rates: DEFAULT_RATES,
        budgets: {},
        awsAllocation: Object.fromEntries(APPLICATIONS.map((a) => [a, 20])),
        cloudinaryMonthlyUsd: 0,
        cloudinaryUsdPerCredit: 0,
      }));
    }
    // Asegura que existan las tarifas por defecto nuevas
    const rates = [...(s.rates || [])];
    for (const d of DEFAULT_RATES) {
      if (!rates.some((r) => r.platform === d.platform && r.metric === d.metric)) rates.push(d);
    }
    s.rates = rates;
    s.usdToCop = num(s.usdToCop);
    s.cloudinaryMonthlyUsd = num(s.cloudinaryMonthlyUsd);
    s.cloudinaryUsdPerCredit = num(s.cloudinaryUsdPerCredit);
    return s;
  }

  async updateSettings(dto: Partial<PlatformCostSettings>) {
    const s = await this.getSettings();
    if (dto.usdToCop !== undefined) s.usdToCop = Math.max(1, num(dto.usdToCop));
    if (dto.rates) {
      s.rates = dto.rates
        .filter((r) => r && r.platform && r.metric)
        .map((r) => ({ platform: String(r.platform).toUpperCase(), metric: String(r.metric), label: String(r.label || ''), usdPerUnit: Math.max(0, num(r.usdPerUnit)) }));
    }
    if (dto.budgets) s.budgets = Object.fromEntries(Object.entries(dto.budgets).map(([k, v]) => [k, Math.max(0, num(v))]));
    if (dto.awsAllocation) {
      const alloc = Object.fromEntries(Object.entries(dto.awsAllocation).map(([k, v]) => [k, Math.max(0, num(v))]));
      const total = Object.values(alloc).reduce((a, b) => a + b, 0);
      if (total <= 0) throw new BadRequestException('El reparto de AWS debe sumar más de 0 %.');
      s.awsAllocation = alloc;
    }
    if (dto.cloudinaryMonthlyUsd !== undefined) s.cloudinaryMonthlyUsd = Math.max(0, num(dto.cloudinaryMonthlyUsd));
    if (dto.cloudinaryUsdPerCredit !== undefined) s.cloudinaryUsdPerCredit = Math.max(0, num(dto.cloudinaryUsdPerCredit));
    return this.settingsRepo.save(s);
  }

  // ═══════════════ Sincronización de costos reales ═══════════════

  /**
   * AWS Cost Explorer cobra ~USD 0,01 por consulta: mientras arrancan en firme
   * los arriendos a clientes se consulta una vez por semana (lunes 6:00 a. m.,
   * hora de Colombia). El botón "Sincronizar ahora" sigue disponible.
   */
  @Cron('0 6 * * 1', { timeZone: 'America/Bogota' })
  async weeklyAwsSync() {
    const result = await this.sync({ aws: true, cloudinary: false });
    this.logger.log(`Sincronización semanal de AWS: ${JSON.stringify(result)}`);
  }

  /** La API de uso de Cloudinary no tiene costo: se lee todos los días. */
  @Cron('0 6 * * *', { timeZone: 'America/Bogota' })
  async dailyCloudinarySync() {
    const result = await this.sync({ aws: false, cloudinary: true });
    this.logger.log(`Sincronización diaria de Cloudinary: ${JSON.stringify(result)}`);
  }

  async sync(opts: { aws?: boolean; cloudinary?: boolean } = { aws: true, cloudinary: true }) {
    const result: Record<string, string> = {};
    const today = todayCo();
    const { start, prev } = monthRange(today.slice(0, 7));
    // Con consulta semanal, la primera semana del mes aún trae días (y ajustes)
    // del mes anterior: se refresca también
    const from = Number(today.slice(8, 10)) <= 7 ? `${prev}-01` : start;

    if (opts.aws && process.env.AWS_COST_ACCESS_KEY_ID) {
      try {
        // Fin exclusivo = hoy: el día en curso aún no está consolidado
        const rows = await fetchAwsDailyCosts(from, today);
        for (const r of rows) {
          await this.dataSource.query(
            `INSERT INTO platform_cost_daily (day, platform, service, "amountUsd", "updatedAt")
             VALUES ($1, 'AWS', $2, $3, now())
             ON CONFLICT (day, platform, service) DO UPDATE SET "amountUsd" = EXCLUDED."amountUsd", "updatedAt" = now()`,
            [r.day, r.service.slice(0, 150), r.amountUsd],
          );
        }
        await this.saveSnapshot('AWS', { lastSync: new Date().toISOString(), rows: rows.length, from, to: today }, null);
        result.AWS = `ok (${rows.length} registros)`;
      } catch (err) {
        await this.saveSnapshot('AWS', { lastSync: new Date().toISOString() }, (err as Error).message);
        result.AWS = `error: ${(err as Error).message}`;
      }
    } else if (opts.aws) {
      result.AWS = 'sin credenciales (AWS_COST_ACCESS_KEY_ID)';
    }

    if (opts.cloudinary) {
      try {
        const usage = await fetchCloudinaryUsage();
        await this.saveSnapshot('CLOUDINARY', usage, null);
        result.CLOUDINARY = 'ok';
      } catch (err) {
        await this.saveSnapshot('CLOUDINARY', {}, (err as Error).message);
        result.CLOUDINARY = `error: ${(err as Error).message}`;
      }
    }
    return result;
  }

  private async saveSnapshot(platform: string, data: any, error: string | null) {
    const existing = await this.snapshotRepo.findOne({ where: { platform } });
    const snap = existing || this.snapshotRepo.create({ platform });
    if (!error || !existing) snap.data = data;
    snap.error = error;
    await this.snapshotRepo.save(snap);
  }

  // ═══════════════ Dashboard ═══════════════

  private async computeMonth(month: string, settings: PlatformCostSettings) {
    const { start, last, next } = monthRange(month);
    const rate = (platform: string, metric: string) =>
      num(settings.rates.find((r) => r.platform === platform && r.metric === metric)?.usdPerUnit);

    const [costs, usage] = await Promise.all([
      this.costRepo.find({ where: { day: Between(start, last) } }),
      this.usageRepo.find({ where: { day: Between(start, last) } }),
    ]);

    // ── AWS (real) ──
    const awsByService = new Map<string, number>();
    costs.filter((c) => c.platform === 'AWS').forEach((c) => awsByService.set(c.service, (awsByService.get(c.service) || 0) + num(c.amountUsd)));
    const awsTotal = [...awsByService.values()].reduce((a, b) => a + b, 0);
    const isSes = (s: string) => /simple email service|\bses\b/i.test(s);
    const sesReal = [...awsByService.entries()].filter(([k]) => isSes(k)).reduce((a, [, v]) => a + v, 0);
    const hasAws = costs.some((c) => c.platform === 'AWS');
    // Último día con costo de AWS (con sincronización semanal va rezagado)
    const awsLastDay = costs.filter((c) => c.platform === 'AWS').reduce((m, c) => (String(c.day) > m ? String(c.day) : m), '');

    // ── Consumo medido ──
    const sumBy = (platform: string, metric: string, key: 'application' | 'tenantKey') => {
      const m = new Map<string, number>();
      usage.filter((u) => u.platform === platform && u.metric === metric)
        .forEach((u) => m.set(u[key], (m.get(u[key]) || 0) + num(u.quantity)));
      return m;
    };
    const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
    const emailsByApp = sumBy('SES', 'emails', 'application');
    const bytesByApp = sumBy('CLOUDINARY', 'upload_bytes', 'application');
    const uploadsByApp = sumBy('CLOUDINARY', 'uploads', 'application');
    const belvoByApp = sumBy('BELVO', 'api_calls', 'application');

    // SES: real si AWS lo reporta; si no, estimado por correo
    const sesEstimated = total(emailsByApp) * rate('SES', 'emails');
    const sesCost = hasAws ? sesReal : sesEstimated;

    // Cloudinary: plan fijo mensual o créditos × valor por crédito
    const cloudSnap = await this.snapshotRepo.findOne({ where: { platform: 'CLOUDINARY' } });
    const credits = num(cloudSnap?.data?.credits?.usage);
    const cloudinaryCost = settings.cloudinaryMonthlyUsd > 0 ? settings.cloudinaryMonthlyUsd : credits * settings.cloudinaryUsdPerCredit;

    const belvoCost = total(belvoByApp) * rate('BELVO', 'api_calls');

    // ── Reparto por aplicación ──
    const allocTotal = Object.values(settings.awsAllocation || {}).reduce((a, b) => a + num(b), 0) || 1;
    const share = (m: Map<string, number>, app: string) => {
      const t = total(m);
      return t > 0 ? (m.get(app) || 0) / t : 0;
    };
    const cloudBasis = total(bytesByApp) > 0 ? bytesByApp : uploadsByApp;
    const byApplication = APPLICATIONS.map((app) => {
      const aws = (hasAws ? awsTotal - sesReal : 0) * (num(settings.awsAllocation?.[app]) / allocTotal);
      const ses = sesCost * share(emailsByApp, app);
      const cloud = cloudinaryCost * share(cloudBasis, app);
      const belvo = (belvoByApp.get(app) || 0) * rate('BELVO', 'api_calls');
      return { application: app, awsUsd: round(aws), sesUsd: round(ses), cloudinaryUsd: round(cloud), belvoUsd: round(belvo), totalUsd: round(aws + ses + cloud + belvo) };
    });

    // ── Por cliente (solo lo atribuible por consumo medido) ──
    const tenants = new Map<string, number>();
    const addTenant = (platform: string, metric: string, unitCost: number) => {
      usage.filter((u) => u.platform === platform && u.metric === metric && u.tenantKey !== '-')
        .forEach((u) => tenants.set(u.tenantKey, (tenants.get(u.tenantKey) || 0) + num(u.quantity) * unitCost));
    };
    const emailsTotal = total(emailsByApp);
    addTenant('SES', 'emails', emailsTotal > 0 ? sesCost / emailsTotal : 0);
    const cloudBasisMetric = total(bytesByApp) > 0 ? 'upload_bytes' : 'uploads';
    const cloudBasisTotal = total(cloudBasis);
    addTenant('CLOUDINARY', cloudBasisMetric, cloudBasisTotal > 0 ? cloudinaryCost / cloudBasisTotal : 0);
    addTenant('BELVO', 'api_calls', rate('BELVO', 'api_calls'));

    return {
      range: { start, last, next },
      awsDaysCovered: awsLastDay ? Number(awsLastDay.slice(8, 10)) : 0,
      platforms: {
        AWS: { costUsd: round(hasAws ? awsTotal : sesEstimated), estimated: !hasAws, services: [...awsByService.entries()].map(([service, usd]) => ({ service, usd: round(usd) })).sort((a, b) => b.usd - a.usd) },
        CLOUDINARY: { costUsd: round(cloudinaryCost), estimated: settings.cloudinaryMonthlyUsd <= 0, credits },
        BELVO: { costUsd: round(belvoCost), estimated: true },
      },
      byApplication,
      tenantCosts: tenants,
      usage: {
        emails: emailsTotal,
        uploads: total(uploadsByApp),
        uploadBytes: total(bytesByApp),
        belvoCalls: total(belvoByApp),
      },
    };
  }

  /** Ingresos facturados en el mes (COP) por aplicación y por cliente. */
  private async revenue(start: string, last: string) {
    const byApp: any[] = await this.dataSource.query(
      `SELECT COALESCE(p."targetApplication", 'Authoriza') AS app, COALESCE(SUM(i.value), 0) AS total
         FROM invoices i
         LEFT JOIN contract c ON c.id = i."contractId"
         LEFT JOIN package p ON p.id = c."packageId"
        WHERE i."issueDate" BETWEEN $1 AND $2 AND i.status <> 'Unconfirmed'
        GROUP BY 1`,
      [start, last],
    ).catch(() => []);
    const byUser: any[] = await this.dataSource.query(
      `SELECT i."userId" AS "userId", COALESCE(SUM(i.value), 0) AS total
         FROM invoices i
        WHERE i."issueDate" BETWEEN $1 AND $2 AND i.status <> 'Unconfirmed'
        GROUP BY 1`,
      [start, last],
    ).catch(() => []);
    return {
      byApp: new Map(byApp.map((r) => [String(r.app).toLowerCase(), num(r.total)])),
      byUser: new Map(byUser.map((r) => [r.userId, num(r.total)])),
    };
  }

  private async tenantNames(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows: any[] = await this.dataSource.query(
      `SELECT u.id, u."strUserName" AS email,
              COALESCE(le."businessName", NULLIF(TRIM(CONCAT(np."firstName", ' ', np."firstSurname")), '')) AS name
         FROM "user" u
         LEFT JOIN basic_data bd ON bd.id = u."basicDataId"
         LEFT JOIN legal_entity_data le ON le."basicDataId" = bd.id
         LEFT JOIN natural_person_data np ON np."basicDataId" = bd.id
        WHERE u.id = ANY($1)`,
      [ids],
    ).catch(() => []);
    return new Map(rows.map((r) => [r.id, r.name || r.email]));
  }

  async dashboard(month?: string) {
    const settings = await this.getSettings();
    const today = todayCo();
    const m = month || today.slice(0, 7);
    const { daysInMonth, prev } = monthRange(m);
    const isCurrent = m === today.slice(0, 7);
    const daysElapsed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth;

    const [cur, previous] = await Promise.all([this.computeMonth(m, settings), this.computeMonth(prev, settings)]);
    const rev = await this.revenue(cur.range.start, cur.range.last);
    const fx = settings.usdToCop;

    // Plan fijo (Cloudinary) no se proyecta; lo variable sí
    // AWS se proyecta sobre los días que ya trae Cost Explorer, no sobre los transcurridos
    const projection = (platform: string, usd: number) => {
      if (!isCurrent) return usd;
      if (platform === 'CLOUDINARY' && settings.cloudinaryMonthlyUsd > 0) return usd;
      const days = platform === 'AWS' && cur.platforms.AWS.estimated === false ? cur.awsDaysCovered : daysElapsed;
      return round((usd / Math.max(1, days)) * daysInMonth);
    };

    const platforms = (Object.keys(cur.platforms) as (keyof typeof cur.platforms)[]).map((p) => {
      const c: any = cur.platforms[p];
      const projectedUsd = projection(p, c.costUsd);
      const budgetUsd = num(settings.budgets?.[p]);
      return {
        platform: p,
        costUsd: c.costUsd,
        costCop: round(c.costUsd * fx, 0),
        previousUsd: (previous.platforms as any)[p].costUsd,
        projectedUsd,
        budgetUsd,
        budgetPct: budgetUsd > 0 ? round((projectedUsd / budgetUsd) * 100, 1) : null,
        alert: budgetUsd > 0 && projectedUsd >= budgetUsd * 0.8,
        estimated: c.estimated,
        services: c.services || undefined,
        credits: c.credits ?? undefined,
      };
    });

    const byApplication = cur.byApplication.map((a) => {
      const revenueCop = rev.byApp.get(a.application.toLowerCase()) || 0;
      const costCop = round(a.totalUsd * fx, 0);
      return { ...a, costCop, revenueCop, marginCop: round(revenueCop - costCop, 0), marginPct: revenueCop > 0 ? round(((revenueCop - costCop) / revenueCop) * 100, 1) : null };
    });

    const topIds = [...cur.tenantCosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
    const names = await this.tenantNames(topIds);
    const topTenants = topIds.map((id) => {
      const costUsd = round(cur.tenantCosts.get(id) || 0, 4);
      const revenueCop = rev.byUser.get(id) || 0;
      return { tenantId: id, name: names.get(id) || id, costUsd, costCop: round(costUsd * fx, 0), revenueCop, marginCop: round(revenueCop - costUsd * fx, 0) };
    });

    const [awsSnap, cloudSnap] = await Promise.all([
      this.snapshotRepo.findOne({ where: { platform: 'AWS' } }),
      this.snapshotRepo.findOne({ where: { platform: 'CLOUDINARY' } }),
    ]);
    const totalUsd = round(platforms.reduce((s, p) => s + p.costUsd, 0));

    return {
      month: m,
      isCurrent,
      daysElapsed,
      daysInMonth,
      usdToCop: fx,
      totals: {
        costUsd: totalUsd,
        costCop: round(totalUsd * fx, 0),
        previousUsd: round(platforms.reduce((s, p) => s + p.previousUsd, 0)),
        projectedUsd: round(platforms.reduce((s, p) => s + p.projectedUsd, 0)),
        revenueCop: round([...rev.byApp.values()].reduce((a, b) => a + b, 0), 0),
      },
      platforms,
      byApplication,
      topTenants,
      usage: cur.usage,
      cloudinary: cloudSnap?.data?.credits
        ? { creditsUsed: num(cloudSnap.data.credits.usage), creditsLimit: num(cloudSnap.data.credits.limit), usedPercent: num(cloudSnap.data.credits.used_percent), plan: cloudSnap.data.plan || null }
        : null,
      sources: {
        aws: { configured: !!process.env.AWS_COST_ACCESS_KEY_ID, lastSync: awsSnap?.capturedAt || null, error: awsSnap?.error || null },
        cloudinary: { lastSync: cloudSnap?.capturedAt || null, error: cloudSnap?.error || null },
      },
    };
  }
}
