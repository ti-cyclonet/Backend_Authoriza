import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoterSettings } from './quoter-settings.entity';
import { QUOTER_DEFAULTS } from './quoter-defaults';
import { mergeConfig, validateConfig } from './quoter-config';
import { roleCosts } from './quoter-cost';

const ROW_ID = 'default';
/** TRM oficial (Superintendencia Financiera) en datos abiertos. */
const TRM_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1';
const TRM_TTL_MS = 6 * 60 * 60 * 1000;

/** Parámetros del cotizador de la landing de CycloNet (ver quoter-defaults.ts). */
@Injectable()
export class QuoterService {
  private readonly logger = new Logger(QuoterService.name);
  private trmCache: { value: number; date: string; at: number } | null = null;

  constructor(@InjectRepository(QuoterSettings) private readonly repo: Repository<QuoterSettings>) {}

  /** Parámetros vigentes (lo guardado sobre los valores por defecto) con la TRM del día. */
  async getConfig(): Promise<any> {
    const row = await this.repo.findOne({ where: { id: ROW_ID } });
    const config = mergeConfig(QUOTER_DEFAULTS, row?.data);
    if (config?.empresa?.trmAutomatica) {
      const trm = await this.currentTrm();
      if (trm) config.empresa = { ...config.empresa, trm: trm.value, trmFecha: trm.date };
    }
    return { ...config, actualizado: row?.updatedAt || null };
  }

  async saveConfig(data: any, updatedBy?: string): Promise<any> {
    const { actualizado, ...clean } = data || {};
    const merged = mergeConfig(QUOTER_DEFAULTS, clean);
    const errors = validateConfig(merged);
    if (errors.length) throw new BadRequestException({ message: 'Revisa los parámetros del cotizador.', errors });
    if (merged.empresa) delete merged.empresa.trmFecha;
    await this.repo.save({ id: ROW_ID, data: merged, updatedBy: updatedBy || null });
    return this.getConfig();
  }

  /** Vuelve a los valores por defecto. */
  async resetConfig(): Promise<any> {
    await this.repo.delete({ id: ROW_ID });
    return this.getConfig();
  }

  /** Costo por hora y tarifa de cada especialidad (vista previa para el administrador). */
  async costs(): Promise<any> {
    return roleCosts(await this.getConfig());
  }

  /** TRM del día (cacheada 6 horas). null si el servicio no responde. */
  private async currentTrm(): Promise<{ value: number; date: string } | null> {
    if (this.trmCache && Date.now() - this.trmCache.at < TRM_TTL_MS) return this.trmCache;
    try {
      const res = await fetch(TRM_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const [row] = (await res.json()) as any[];
      const value = Math.round(Number(row?.valor));
      if (!(value > 0)) throw new Error('sin valor');
      this.trmCache = { value, date: String(row?.vigenciadesde || '').slice(0, 10), at: Date.now() };
      return this.trmCache;
    } catch (err) {
      this.logger.warn(`No se pudo leer la TRM: ${(err as Error).message}`);
      return this.trmCache;
    }
  }
}
