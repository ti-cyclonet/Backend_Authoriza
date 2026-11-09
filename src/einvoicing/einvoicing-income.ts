/**
 * Ingresos de CycloNet por el complemento de facturación electrónica: lo que
 * se cobró en las facturas de los contratos (invoices.addonCharges: valor
 * mensual del plan y documentos adicionales, sin IVA). Funciones puras
 * (einvoicing.spec.ts).
 */

export const ADDON_CHARGE_CODES = ['complemento_facturacion_electronica', 'documentos_electronicos_adicionales'] as const;

export interface IncomeInvoiceRow {
  issueDate: string | Date;
  status: string;
  addonCharges: { code: string; amount: number }[] | null;
  client?: string | null;
}

export interface EinvoicingIncome {
  month: string;
  /** Facturado por el complemento en el mes (planes + adicionales). */
  billed: number;
  /** De lo facturado en el mes, lo ya pagado. */
  collected: number;
  plans: number;
  extraDocs: number;
  prevBilled: number;
  yearBilled: number;
  byMonth: { month: string; billed: number; collected: number }[];
  byClient: { client: string; billed: number }[];
}

const ym = (d: string | Date) => (typeof d === 'string' ? d.slice(0, 7) : new Date(d).toISOString().slice(0, 7));

/** Mes anterior y los 6 meses que terminan en `month` (YYYY-MM). */
export function lastMonths(month: string, n = 6): string[] {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export function einvoicingIncome(rows: IncomeInvoiceRow[], month: string): EinvoicingIncome {
  const months = lastMonths(month, 6);
  const prev = lastMonths(month, 2)[0];
  const byMonth = new Map(months.map((mm) => [mm, { month: mm, billed: 0, collected: 0 }]));
  const byClient = new Map<string, number>();
  let billed = 0, collected = 0, plans = 0, extraDocs = 0, prevBilled = 0, yearBilled = 0;
  for (const r of rows) {
    const charges = (r.addonCharges || []).filter((c) => (ADDON_CHARGE_CODES as readonly string[]).includes(c.code));
    if (!charges.length) continue;
    const amount = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const paid = r.status === 'Paid';
    const m = ym(r.issueDate);
    const slot = byMonth.get(m);
    if (slot) { slot.billed += amount; if (paid) slot.collected += amount; }
    if (m === prev) prevBilled += amount;
    if (m.slice(0, 4) === month.slice(0, 4) && m <= month) yearBilled += amount;
    if (m === month) {
      billed += amount;
      if (paid) collected += amount;
      for (const c of charges) {
        if (c.code === 'complemento_facturacion_electronica') plans += Number(c.amount) || 0;
        else extraDocs += Number(c.amount) || 0;
      }
      const k = r.client || 'Cliente';
      byClient.set(k, (byClient.get(k) || 0) + amount);
    }
  }
  return {
    month, billed, collected, plans, extraDocs, prevBilled, yearBilled,
    byMonth: [...byMonth.values()],
    byClient: [...byClient.entries()].map(([client, b]) => ({ client, billed: b })).sort((a, b) => b.billed - a.billed).slice(0, 10),
  };
}
