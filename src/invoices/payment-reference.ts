/**
 * Referencia del soporte de pago (volante, transferencia, Nequi…) con que se
 * reporta el pago de una factura: un mismo soporte no se usa en dos facturas.
 * Mismas reglas que InOut (Backend_Inout/src/payment-references). Funciones
 * puras (invoice-payment-reference.spec.ts).
 */

/** Referencias más cortas no se comparan (p. ej. "1", "OK"). */
export const MIN_REFERENCE_LENGTH = 4;

/**
 * Forma comparable: mayúsculas, sin espacios, guiones, puntos ni símbolos, y
 * sin prefijos como "Ref.", "No." o "#". "ref: m-8721 4093" → "M87214093".
 * Vacío si queda muy corta para compararla.
 */
export function normalizeReference(raw: unknown): string {
  let s = String(raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .trim();
  // Prefijos ("Ref.", "No. ", "#"): solo con separador, para no recortar una referencia que empiece por "NO"
  s = s.replace(/^(?:(?:REFERENCIA|REF|NUMERO|NRO|NO|N[°º])(?:\s*[.:#°º-]+\s*|\s+)|#\s*)/u, '');
  s = s.replace(/[^A-Z0-9]/g, '');
  return s.length >= MIN_REFERENCE_LENGTH ? s : '';
}

export const REFERENCE_REQUIRED_MESSAGE = 'Escribe el número de referencia del comprobante.';

/** Mensaje para quien intenta reutilizar el soporte en otra factura. */
export function duplicateMessage(reference: string, invoiceCode: string, date: Date | string | null): string {
  const d = date ? new Date(date) : null;
  const when = d && !isNaN(d.getTime())
    ? ` del ${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })}`
    : '';
  return `Este soporte de pago ya se usó: la referencia ${reference} está registrada en el pago de la factura ${invoiceCode}${when}. Un mismo soporte no se puede usar en dos pagos.`;
}
