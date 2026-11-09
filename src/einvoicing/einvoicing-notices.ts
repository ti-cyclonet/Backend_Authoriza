/**
 * Variables de los correos del complemento de facturación electrónica
 * (plantillas-facturacion-electronica.ts). Funciones puras (einvoicing.spec.ts).
 */

/** Las plantillas insertan las variables en HTML: se escapan aquí. */
export const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const TIER_NAMES: Record<string, string> = { BASICO: 'Básico', MEDIO: 'Medio', ALTO: 'Alto' };

export function priceText(monthly: number | null | undefined): string {
  const n = Number(monthly);
  return n > 0 ? `$${Math.round(n).toLocaleString('es-CO')} al mes` : 'precio por confirmar antes de activarla';
}

export function availabilityText(available: boolean, forAdmin = false): string {
  if (forAdmin) {
    return available
      ? 'El proveedor tecnológico está disponible: se activará sola cuando el negocio complete sus datos fiscales y su resolución.'
      : 'La facturación electrónica está en configuración (falta definir el proveedor tecnológico): el negocio queda en espera y se le avisará al activarla.';
  }
  return available
    ? 'Se activará en cuanto completes tus datos fiscales y tu resolución de numeración.'
    : 'La facturación electrónica está en configuración: te avisaremos por correo en cuanto la activemos.';
}

export interface NoticeContext {
  businessName: string;
  tenantEmail: string;
  requestedBy: string;
  tier: string;
  includedUnits: number;
  monthly: number | null;
  requestedAt: Date;
  available: boolean;
  settingsUrl: string;
  adminUrl: string;
}

const fecha = (d: Date) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(d);

export function noticeVariables(c: NoticeContext, forAdmin = false): Record<string, string> {
  return {
    businessName: esc(c.businessName),
    tenantEmail: esc(c.tenantEmail),
    requestedBy: esc(c.requestedBy),
    plan: esc(TIER_NAMES[c.tier] || c.tier),
    includedUnits: esc(c.includedUnits),
    priceText: esc(priceText(c.monthly)),
    requestedAt: esc(fecha(c.requestedAt)),
    availabilityText: esc(availabilityText(c.available, forAdmin)),
    settingsUrl: esc(c.settingsUrl),
    adminUrl: esc(c.adminUrl),
    year: String(new Date().getFullYear()),
  };
}
