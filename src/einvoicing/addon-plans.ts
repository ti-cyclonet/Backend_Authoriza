/**
 * Escalones del complemento "Facturación electrónica" y lo que suma a la
 * factura mensual del contrato. Funciones puras (addon-plans.spec.ts).
 *
 * PENDIENTE (definición del proveedor): los precios dependen de la cotización
 * del PT. Se configuran sin desplegar código con EINVOICING_PRICES (JSON), p. ej.
 *   {"BASICO":{"monthly":39900},"MEDIO":{"monthly":89900},"ALTO":{"monthly":199900},"extraUnit":350}
 * Mientras no estén, la oferta dice "precio por definir" y no se cobra nada.
 */
export const EINVOICING_TERMS_VERSION = '2026-11-09';

export interface AddonTier {
  code: 'BASICO' | 'MEDIO' | 'ALTO';
  name: string;
  includedUnits: number;
  monthly: number | null;
}

const BASE_TIERS: Omit<AddonTier, 'monthly'>[] = [
  { code: 'BASICO', name: 'Básico', includedUnits: 50 },
  { code: 'MEDIO', name: 'Medio', includedUnits: 150 },
  { code: 'ALTO', name: 'Alto', includedUnits: 500 },
];

export interface AddonCatalog {
  code: 'EINVOICING';
  name: string;
  tiers: AddonTier[];
  /** Valor por documento por encima de los incluidos (null = por definir). */
  extraUnit: number | null;
  termsVersion: string;
  pricesDefined: boolean;
}

const price = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function einvoicingCatalog(env: NodeJS.ProcessEnv = process.env): AddonCatalog {
  let cfg: any = {};
  try {
    cfg = env.EINVOICING_PRICES ? JSON.parse(env.EINVOICING_PRICES) : {};
  } catch {
    cfg = {};
  }
  const tiers = BASE_TIERS.map((t) => ({ ...t, monthly: price(cfg?.[t.code]?.monthly) }));
  const extraUnit = price(cfg?.extraUnit);
  return {
    code: 'EINVOICING',
    name: 'Facturación electrónica',
    tiers,
    extraUnit,
    termsVersion: EINVOICING_TERMS_VERSION,
    pricesDefined: tiers.every((t) => t.monthly !== null) && extraUnit !== null,
  };
}

export interface AddonCharge {
  code: string;
  label: string;
  amount: number;
}

/**
 * Lo que suma un complemento ACTIVO a la factura del periodo: el valor
 * mensual (por los meses que cubre la factura) y los documentos por encima de
 * los incluidos en el mes anterior. Sin precio definido no suma nada.
 */
export function addonCharges(
  addon: { status: string; tier: string; monthlyValue: number | null; extraUnitValue: number | null; includedUnits: number },
  ctx: { months: number; unitsUsedLastMonth: number },
): AddonCharge[] {
  if (addon.status !== 'ACTIVO') return [];
  const out: AddonCharge[] = [];
  const monthly = Number(addon.monthlyValue) || 0;
  if (monthly > 0) {
    out.push({
      code: 'complemento_facturacion_electronica',
      label: `Facturación electrónica · plan ${addon.tier.toLowerCase()} (${addon.includedUnits} documentos/mes)`,
      amount: Math.round(monthly * Math.max(1, ctx.months)),
    });
  }
  const extra = Math.max(0, (Number(ctx.unitsUsedLastMonth) || 0) - (Number(addon.includedUnits) || 0));
  const unit = Number(addon.extraUnitValue) || 0;
  if (extra > 0 && unit > 0) {
    out.push({ code: 'documentos_electronicos_adicionales', label: `Documentos electrónicos adicionales (${extra} × $${unit.toLocaleString('es-CO')})`, amount: Math.round(extra * unit) });
  }
  return out;
}
