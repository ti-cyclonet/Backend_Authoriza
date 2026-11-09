import { BuyerData, LineInput } from './dian';

/**
 * Factura de CycloNet a su cliente (tabla invoices) → documento electrónico.
 * Funciones puras (cyclonet-invoices.spec.ts).
 */

/** Tipos de documento de Authoriza → códigos de la DIAN. */
const DOC_TYPE_DIAN: Record<string, string> = { CC: '13', CE: '22', PP: '41', TI: '12', NIT: '31' };

/** Comprador a partir del usuario dueño del contrato (null si faltan datos para facturarle). */
export function buyerFromUser(user: any): BuyerData | null {
  const bd = user?.basicData;
  const idType = DOC_TYPE_DIAN[String(bd?.documentType?.documentType || '').toUpperCase()];
  const idNumber = String(bd?.documentNumber || '').replace(/\D/g, '');
  const name = bd?.legalEntityData?.businessName
    || [bd?.naturalPersonData?.firstName, bd?.naturalPersonData?.secondName, bd?.naturalPersonData?.firstSurname, bd?.naturalPersonData?.secondSurname].filter(Boolean).join(' ');
  if (!idType || idNumber.length < 5 || !name) return null;
  return { idType, idNumber, name, email: user?.strUserName || null };
}

/**
 * Líneas del documento: el servicio por el valor de la factura (que ya incluye
 * los complementos), con el IVA de la factura si lo tiene, y los descuentos
 * restados de esa línea. La mora no entra: se calcula al pagar.
 */
export function linesFromInvoice(invoice: {
  code?: string | null;
  value: number | string;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  globalParameters?: Record<string, any> | null;
  operationTypes?: Record<string, string> | null;
  percentages?: Record<string, number> | null;
  contract?: { package?: { name?: string } } | null;
}): LineInput[] {
  const value = Math.round((Number(invoice.value) || 0) * 100) / 100;
  const params = invoice.globalParameters || {};
  const ops = invoice.operationTypes || {};
  const pct = invoice.percentages || {};
  let discount = 0;
  for (const [k, op] of Object.entries(ops)) {
    if (op === 'subtract' && k !== 'late_fee_penalty') discount += Number(params[k]) || 0;
  }
  const ivaRate = ops['iva'] === 'add' ? Number(pct['iva']) || 0 : 0;
  const fmt = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const period = invoice.periodStart ? ` (${fmt(invoice.periodStart)} a ${fmt(invoice.periodEnd)})` : '';
  return [{
    description: `Servicio CycloNet · ${invoice.contract?.package?.name || 'plan'}${period}`,
    quantity: 1,
    unitPrice: value,
    discount: Math.min(value, Math.round(discount * 100) / 100),
    taxCode: ivaRate > 0 ? 'IVA' : 'EXCLUIDO',
    taxRate: ivaRate,
    unitCode: '94',
    code: invoice.code || undefined,
  }];
}
