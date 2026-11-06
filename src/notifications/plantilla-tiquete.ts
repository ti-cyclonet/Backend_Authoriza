import { PlantillaFacturacion } from './plantillas-facturacion';

/**
 * Comprobante de una venta de InOut que el negocio le envía a su cliente
 * (el PDF del tiquete va adjunto). Lleva la marca del negocio, no la de
 * CycloNet. Variables (InOut las envía ya escapadas): {{businessName}},
 * {{logoBlock}}, {{customerName}}, {{documentCode}}, {{date}}, {{itemsRows}},
 * {{totalsRows}}, {{total}}, {{paymentText}}, {{businessInfo}}, {{year}}.
 */
export const PLANTILLA_TIQUETE_VENTA: PlantillaFacturacion = {
  code: 'INOUT_SALE_RECEIPT',
  subject: 'Tu compra en {{businessName}} · {{documentCode}}',
  htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <tr><td style="padding:28px 28px 8px;text-align:center;">
      {{logoBlock}}
      <div style="font-size:20px;font-weight:800;color:#111827;">{{businessName}}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">{{businessInfo}}</div>
    </td></tr>
    <tr><td style="padding:12px 28px 0;">
      <p style="margin:0 0 6px;font-size:15px;">Hola <strong>{{customerName}}</strong>, gracias por tu compra.</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Comprobante <strong style="color:#111827;">{{documentCode}}</strong> · {{date}}</p>
    </td></tr>
    <tr><td style="padding:16px 28px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
        {{itemsRows}}
        {{totalsRows}}
        <tr><td style="padding:10px 0 0;font-size:17px;font-weight:800;border-top:2px solid #111827;">Total</td><td style="padding:10px 0 0;font-size:17px;font-weight:800;text-align:right;border-top:2px solid #111827;">{{total}}</td></tr>
      </table>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;text-align:right;">{{paymentText}}</p>
    </td></tr>
    <tr><td style="padding:20px 28px 26px;">
      <p style="margin:0;font-size:12px;color:#6b7280;">Adjuntamos el comprobante en PDF. Si tienes alguna pregunta sobre tu compra, responde a {{businessName}} por sus canales de siempre.</p>
    </td></tr>
    <tr><td style="background:#f9fafb;padding:12px 28px;text-align:center;font-size:11px;color:#9ca3af;">Enviado con InOut · CycloNet S.A.S. © {{year}}</td></tr>
  </table>
</body>
</html>`,
};
