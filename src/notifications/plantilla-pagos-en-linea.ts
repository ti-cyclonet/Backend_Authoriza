import { PlantillaFacturacion } from './plantillas-facturacion';

/**
 * Aviso a los negocios de InOut que pidieron "Avísame cuando esté disponible"
 * en Formas de pago: los pagos en línea con Mercado Pago ya se pueden usar.
 * Lo envía InOut (online-payments) una sola vez por negocio. Variables:
 * {{settingsUrl}} (Formas de pago de la tienda) y {{year}}.
 */
export const PLANTILLA_PAGOS_EN_LINEA: PlantillaFacturacion = {
  code: 'INOUT_ONLINE_PAYMENTS_AVAILABLE',
  subject: 'Ya puedes recibir pagos en línea en tu tienda de InOut',
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <tr><td style="background:#0057B8;padding:22px 28px;color:#ffffff;">
      <div style="font-size:13px;opacity:0.85;">InOut · CycloNet</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px;">Los pagos en línea ya están disponibles</div>
    </td></tr>
    <tr><td style="padding:22px 28px 0;font-size:14px;line-height:1.55;">
      <p style="margin:0 0 12px;">Hola, te escribimos porque nos pediste avisarte: tu tienda de InOut ya puede recibir pagos en línea con <strong>Mercado Pago</strong> (tarjeta, PSE y efectivo).</p>
      <p style="margin:0 0 12px;">Conecta tu propia cuenta de Mercado Pago en <strong>MarketPlace › Formas de pago</strong>. El dinero llega directo a tu cuenta y cada pago aprobado se registra solo en el pedido, sin revisar comprobantes.</p>
      <p style="margin:0 0 18px;font-size:13px;color:#6b7280;">Por cada pago aprobado se descuentan la tarifa de Mercado Pago y la comisión de CycloNet del 1 %.</p>
      <p style="margin:0 0 22px;text-align:center;"><a href="{{settingsUrl}}" style="display:inline-block;background:#FF6600;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Conectar mi cuenta</a></p>
    </td></tr>
    <tr><td style="background:#f9fafb;padding:12px 28px;text-align:center;font-size:11px;color:#9ca3af;">InOut · CycloNet S.A.S. © {{year}}</td></tr>
  </table>
</body>
</html>`,
};
