/**
 * Reglas de la facturación electrónica de la DIAN que no dependen del
 * proveedor tecnológico: dígito de verificación, validación de los datos
 * fiscales del emisor y del comprador, impuestos y totales por línea, y
 * numeración dentro de la resolución. Funciones puras (dian.spec.ts).
 *
 * El XML (UBL 2.1), la firma y el CUFE los hace el proveedor tecnológico:
 * aquí solo se arma y se valida la información que se le envía.
 */

/** Tipos de documento electrónico que emite CycloNet. */
export const EINVOICE_DOC_TYPES = ['FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'POS'] as const;
export type EinvoiceDocType = (typeof EINVOICE_DOC_TYPES)[number];

/** Tipos de documento de identidad (códigos de la DIAN). */
export const ID_TYPES: Record<string, string> = {
  '13': 'Cédula de ciudadanía',
  '31': 'NIT',
  '22': 'Cédula de extranjería',
  '41': 'Pasaporte',
  '12': 'Tarjeta de identidad',
  '42': 'Documento de identificación extranjero',
};

/** Responsabilidades fiscales más comunes (casilla 53 del RUT). */
export const FISCAL_RESPONSIBILITIES: Record<string, string> = {
  'O-13': 'Gran contribuyente',
  'O-15': 'Autorretenedor',
  'O-23': 'Agente de retención IVA',
  'O-47': 'Régimen simple de tributación',
  'R-99-PN': 'No aplica – otros',
};

/** Consumidor final: comprador sin identificar (POS y ventas de mostrador). */
export const CONSUMIDOR_FINAL = { idType: '13', idNumber: '222222222222', name: 'Consumidor final' } as const;

/** Impuestos por línea: IVA (19 %, 5 %, 0 % exento) o impuesto al consumo (8 %); EXCLUIDO no lleva impuesto. */
export type TaxCode = 'IVA' | 'INC' | 'EXCLUIDO';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Dígito de verificación del NIT (algoritmo módulo 11 de la DIAN). */
export function nitCheckDigit(nit: string | number): number {
  const digits = String(nit ?? '').replace(/\D/g, '');
  if (!digits) return NaN;
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const w = weights[i];
    if (w === undefined) return NaN; // más de 15 dígitos
    sum += Number(digits[digits.length - 1 - i]) * w;
  }
  const r = sum % 11;
  return r > 1 ? 11 - r : r;
}

export interface IssuerData {
  idType: string; // '31' NIT o '13' cédula (persona natural)
  idNumber: string;
  checkDigit?: number | null;
  legalName: string;
  tradeName?: string | null;
  personType: 'JURIDICA' | 'NATURAL';
  /** '48' responsable de IVA, '49' no responsable. */
  taxRegime: '48' | '49';
  responsibilities: string[];
  ciiu?: string | null;
  address: string;
  /** Código DANE del municipio (5 dígitos), p. ej. 11001 Bogotá, 13001 Cartagena. */
  municipalityCode: string;
  email: string;
  phone?: string | null;
}

/** Errores de los datos fiscales del emisor (vacío = listo para facturar). */
export function validateIssuer(d: Partial<IssuerData>): string[] {
  const e: string[] = [];
  const id = String(d.idNumber || '').replace(/\D/g, '');
  if (!d.idType || !ID_TYPES[d.idType]) e.push('Tipo de documento del emisor no válido.');
  if (id.length < 5 || id.length > 15) e.push('Número de documento del emisor no válido.');
  if (d.idType === '31' && d.checkDigit != null && nitCheckDigit(id) !== Number(d.checkDigit)) {
    e.push(`El dígito de verificación del NIT no coincide (debería ser ${nitCheckDigit(id)}).`);
  }
  if (!String(d.legalName || '').trim()) e.push('Escribe la razón social o el nombre del emisor.');
  if (d.personType !== 'JURIDICA' && d.personType !== 'NATURAL') e.push('Indica si es persona jurídica o natural.');
  if (d.taxRegime !== '48' && d.taxRegime !== '49') e.push('Indica si es responsable de IVA.');
  if (!Array.isArray(d.responsibilities) || !d.responsibilities.length) e.push('Indica las responsabilidades fiscales del RUT (casilla 53).');
  else if (d.responsibilities.some((r) => !FISCAL_RESPONSIBILITIES[r])) e.push('Hay una responsabilidad fiscal no válida.');
  if (!String(d.address || '').trim()) e.push('Escribe la dirección del emisor.');
  if (!/^\d{5}$/.test(String(d.municipalityCode || ''))) e.push('El municipio debe ser el código DANE de 5 dígitos.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || ''))) e.push('Escribe el correo de facturación del emisor.');
  return e;
}

export interface BuyerData {
  idType: string;
  idNumber: string;
  checkDigit?: number | null;
  name: string;
  email?: string | null;
  address?: string | null;
  municipalityCode?: string | null;
}

/** Errores del comprador. Sin comprador, la venta va a consumidor final (solo POS o factura a consumidor final). */
export function validateBuyer(b: Partial<BuyerData> | null | undefined, docType: EinvoiceDocType): string[] {
  if (!b) return [];
  const e: string[] = [];
  const id = String(b.idNumber || '').replace(/\D/g, '');
  if (!b.idType || !ID_TYPES[b.idType]) e.push('Tipo de documento del cliente no válido.');
  if (id.length < 5 || id.length > 15) e.push('Número de documento del cliente no válido.');
  if (!String(b.name || '').trim()) e.push('Escribe el nombre del cliente.');
  // La factura se le envía al comprador: sin correo no se puede entregar (en POS es opcional)
  if (docType === 'FACTURA' && b.idNumber !== CONSUMIDOR_FINAL.idNumber && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email || ''))) {
    e.push('Escribe el correo del cliente para enviarle la factura.');
  }
  return e;
}

export interface LineInput {
  description: string;
  quantity: number;
  /** Precio unitario ANTES de impuestos. */
  unitPrice: number;
  discount?: number;
  taxCode: TaxCode;
  /** Tarifa en %: IVA 19/5/0, INC 8; EXCLUIDO 0. */
  taxRate: number;
  /** Unidad de medida (código UN/ECE de la DIAN), p. ej. 94 unidad, KGM kilo. */
  unitCode?: string;
  code?: string;
}

export interface LineComputed extends Required<Omit<LineInput, 'code'>> {
  code: string | null;
  base: number;
  tax: number;
  total: number;
}

export interface Totals {
  lines: LineComputed[];
  subtotal: number;
  discounts: number;
  base: number;
  taxes: { taxCode: TaxCode; taxRate: number; base: number; tax: number }[];
  taxTotal: number;
  total: number;
}

/** Impuestos y totales por línea, con el redondeo a 2 decimales que valida la DIAN. */
export function computeTotals(lines: LineInput[]): Totals {
  if (!Array.isArray(lines) || !lines.length) throw new Error('El documento no tiene líneas.');
  const computed: LineComputed[] = lines.map((l) => {
    const quantity = Number(l.quantity);
    const unitPrice = Number(l.unitPrice);
    if (!(quantity > 0)) throw new Error(`Cantidad no válida en «${l.description}».`);
    if (!(unitPrice >= 0)) throw new Error(`Precio no válido en «${l.description}».`);
    const discount = round2(Math.max(0, Number(l.discount) || 0));
    const gross = round2(quantity * unitPrice);
    if (discount > gross) throw new Error(`El descuento supera el valor de «${l.description}».`);
    const base = round2(gross - discount);
    const taxRate = l.taxCode === 'EXCLUIDO' ? 0 : Number(l.taxRate) || 0;
    const tax = round2(base * taxRate / 100);
    return {
      description: String(l.description || '').slice(0, 300),
      quantity,
      unitPrice,
      discount,
      taxCode: l.taxCode,
      taxRate,
      unitCode: l.unitCode || '94',
      code: l.code || null,
      base,
      tax,
      total: round2(base + tax),
    };
  });
  const byTax = new Map<string, { taxCode: TaxCode; taxRate: number; base: number; tax: number }>();
  for (const l of computed) {
    if (l.taxCode === 'EXCLUIDO') continue;
    const k = `${l.taxCode}:${l.taxRate}`;
    const t = byTax.get(k) || { taxCode: l.taxCode, taxRate: l.taxRate, base: 0, tax: 0 };
    t.base = round2(t.base + l.base);
    t.tax = round2(t.tax + l.tax);
    byTax.set(k, t);
  }
  const subtotal = round2(computed.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const discounts = round2(computed.reduce((s, l) => s + l.discount, 0));
  const base = round2(computed.reduce((s, l) => s + l.base, 0));
  const taxes = [...byTax.values()];
  const taxTotal = round2(taxes.reduce((s, t) => s + t.tax, 0));
  return { lines: computed, subtotal, discounts, base, taxes, taxTotal, total: round2(base + taxTotal) };
}

export interface ResolutionRange {
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  /** Último número emitido (0 = ninguno). */
  lastNumber: number;
  validFrom: Date | string;
  validTo: Date | string;
}

/** Siguiente número de la resolución, o el motivo por el que no se puede numerar. */
export function nextNumber(r: ResolutionRange, now = new Date()): { number: number } | { error: string } {
  const from = new Date(r.validFrom);
  const to = new Date(r.validTo);
  to.setHours(23, 59, 59, 999);
  if (now < from) return { error: `La resolución del prefijo ${r.prefix} aún no está vigente.` };
  if (now > to) return { error: `La resolución del prefijo ${r.prefix} venció: pide una nueva a la DIAN.` };
  const n = Math.max(Number(r.lastNumber) || 0, Number(r.rangeFrom) - 1) + 1;
  if (n > Number(r.rangeTo)) return { error: `Se agotó la numeración del prefijo ${r.prefix}: pide una nueva resolución a la DIAN.` };
  return { number: n };
}

/** Aviso cuando quedan pocos números (10 % o menos) o la resolución vence en 30 días. */
export function resolutionWarning(r: ResolutionRange, now = new Date()): string | null {
  const total = Number(r.rangeTo) - Number(r.rangeFrom) + 1;
  const used = Math.max(0, (Number(r.lastNumber) || 0) - Number(r.rangeFrom) + 1);
  const left = total - used;
  const days = Math.ceil((new Date(r.validTo).getTime() - now.getTime()) / 86_400_000);
  if (left <= Math.max(10, Math.ceil(total * 0.1))) return `Quedan ${left} números del prefijo ${r.prefix}.`;
  if (days <= 30) return `La resolución del prefijo ${r.prefix} vence en ${Math.max(0, days)} día(s).`;
  return null;
}
