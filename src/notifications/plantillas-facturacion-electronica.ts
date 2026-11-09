import { PlantillaFacturacion } from './plantillas-facturacion';

/**
 * Avisos del complemento "Facturación electrónica" de InOut (los envía
 * einvoicing.service). Las variables llegan ya escapadas para HTML.
 */

function correo(o: { titulo: string; color: string; cuerpo: string; boton: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <tr><td style="background:${o.color};padding:22px 28px;color:#ffffff;">
      <div style="font-size:13px;opacity:0.85;">InOut · CycloNet</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px;">${o.titulo}</div>
    </td></tr>
    <tr><td style="padding:22px 28px 6px;font-size:14px;line-height:1.55;">${o.cuerpo}</td></tr>
    <tr><td style="padding:6px 28px 24px;text-align:center;">
      <a href="${o.url}" style="display:inline-block;background:#FF6600;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">${o.boton}</a>
    </td></tr>
    <tr><td style="background:#f9fafb;padding:12px 28px;text-align:center;font-size:11px;color:#9ca3af;">InOut · CycloNet S.A.S. © {{year}}</td></tr>
  </table>
</body>
</html>`;
}

const fila = (k: string, v: string) =>
  `<tr><td style="padding:6px 0;color:#6b7280;">${k}</td><td style="padding:6px 0;text-align:right;font-weight:700;">${v}</td></tr>`;

/** A CycloNet (usuarios con adminFactonet): un negocio solicitó el complemento. */
export const PLANTILLA_EI_SOLICITUD_ADMIN: PlantillaFacturacion = {
  code: 'EINVOICING_REQUEST_ADMIN',
  subject: 'Nueva solicitud de facturación electrónica · {{businessName}}',
  htmlBody: correo({
    titulo: 'Nueva solicitud de facturación electrónica',
    color: '#0057B8',
    cuerpo: `<p style="margin:0 0 12px;"><strong>{{businessName}}</strong> solicitó la facturación electrónica desde InOut y aceptó los términos del servicio.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
        ${fila('Negocio', '{{businessName}}')}
        ${fila('Cuenta', '{{tenantEmail}}')}
        ${fila('Solicitó', '{{requestedBy}}')}
        ${fila('Plan', '{{plan}} · {{includedUnits}} documentos/mes')}
        ${fila('Fecha', '{{requestedAt}}')}
      </table>
      <p style="margin:14px 0 0;color:#6b7280;font-size:13px;">{{availabilityText}}</p>`,
    boton: 'Ver solicitudes en Authoriza',
    url: '{{adminUrl}}',
  }),
};

/** Al negocio: recibimos su solicitud. */
export const PLANTILLA_EI_SOLICITUD_RECIBIDA: PlantillaFacturacion = {
  code: 'EINVOICING_REQUEST_RECEIVED',
  subject: 'Recibimos tu solicitud de facturación electrónica',
  htmlBody: correo({
    titulo: 'Recibimos tu solicitud',
    color: '#0057B8',
    cuerpo: `<p style="margin:0 0 12px;">Hola, <strong>{{businessName}}</strong>: recibimos tu solicitud de <strong>facturación electrónica</strong> en el plan <strong>{{plan}}</strong> ({{includedUnits}} documentos al mes, {{priceText}}).</p>
      <p style="margin:0 0 12px;">{{availabilityText}}</p>
      <p style="margin:0 0 6px;">Mientras tanto, adelanta esto en <strong>Configuración › Facturación electrónica</strong>:</p>
      <ol style="margin:0 0 12px;padding-left:20px;">
        <li>Tus datos fiscales (como aparecen en el RUT).</li>
        <li>En la DIAN: la responsabilidad 52 (facturador electrónico) en el RUT y la resolución de numeración (formulario 1876).</li>
        <li>Tu resolución de numeración en InOut.</li>
      </ol>
      <p style="margin:0;color:#6b7280;font-size:13px;">No se cobra nada hasta que la facturación electrónica esté activa.</p>`,
    boton: 'Ir a Facturación electrónica',
    url: '{{settingsUrl}}',
  }),
};

/** Al negocio: el complemento quedó activo. */
export const PLANTILLA_EI_ACTIVADA: PlantillaFacturacion = {
  code: 'EINVOICING_ACTIVATED',
  subject: 'Tu facturación electrónica ya está activa',
  htmlBody: correo({
    titulo: 'Tu facturación electrónica ya está activa',
    color: '#16a34a',
    cuerpo: `<p style="margin:0 0 12px;">Hola, <strong>{{businessName}}</strong>: desde ahora tus ventas en InOut salen como <strong>factura electrónica</strong> (cliente con documento y correo) o <strong>POS electrónico</strong> (mostrador), validados por la DIAN.</p>
      <ul style="margin:0 0 12px;padding-left:20px;">
        <li>Plan <strong>{{plan}}</strong>: {{includedUnits}} documentos al mes, {{priceText}}.</li>
        <li>Al anular una venta, InOut emite su nota crédito.</li>
        <li>Si la DIAN no responde, la venta no se detiene: el documento se envía solo después.</li>
      </ul>
      <p style="margin:0;color:#6b7280;font-size:13px;">El valor del plan se suma a la factura mensual de tu contrato desde hoy.</p>`,
    boton: 'Ver mi facturación electrónica',
    url: '{{settingsUrl}}',
  }),
};

export const PLANTILLAS_FACTURACION_ELECTRONICA = [PLANTILLA_EI_SOLICITUD_ADMIN, PLANTILLA_EI_SOLICITUD_RECIBIDA, PLANTILLA_EI_ACTIVADA];
