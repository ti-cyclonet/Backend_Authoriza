/**
 * Plantillas de correo del ciclo de cobro de FactoNet.
 *
 * El cron de facturas (invoice-lifecycle.cron.ts) y la confirmación o el
 * rechazo de pagos envían estos códigos, pero las plantillas nunca se
 * sembraban: sin plantilla, sendByTemplate falla en silencio y el cliente no
 * recibía ni el recordatorio, ni la advertencia, ni el aviso de mora o de
 * suspensión.
 *
 * Mismo diseño que INVOICE_ISSUED. Variables: {{customerName}},
 * {{invoiceCode}}, {{factonetUrl}}, {{year}} y, según la plantilla,
 * {{amount}}, {{dueDate}} y {{reason}}.
 */

export interface PlantillaFacturacion {
  code: string;
  subject: string;
  htmlBody: string;
  /**
   * Asunto con el que se sembró antes una versión que se debe reemplazar (p.
   * ej. la de PAYMENT_REJECTED en inglés). Solo se reemplaza si la plantilla
   * guardada conserva ese asunto: si un administrador la editó, se respeta.
   */
  reemplazaAsunto?: string;
}

const AZUL = '#1a237e';

function correo(o: { titulo: string; color?: string; parrafos: string[]; destacado?: string; boton: string }): string {
  const color = o.color || AZUL;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:30px;text-align:center;">
        <img src="https://res.cloudinary.com/dn8ki4idz/image/upload/v1783997360/cyclonet_nit_utsq85.png" alt="CycloNet" style="max-width:160px;margin-bottom:10px;" />
        <p style="color:#bbdefb;margin:5px 0 0;font-size:14px;">Sistema de Facturación</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <h2 style="color:${color};margin:0 0 15px;">${o.titulo}</h2>
        <p style="color:#333;line-height:1.6;">Estimado(a) <strong>{{customerName}}</strong>,</p>
        ${o.parrafos.map(p => `<p style="color:#333;line-height:1.6;">${p}</p>`).join('\n        ')}
        ${o.destacado ? `<div style="background:#f5f7ff;border-left:4px solid ${color};padding:14px 18px;border-radius:6px;margin:20px 0;color:#333;line-height:1.6;">${o.destacado}</div>` : ''}
        <div style="text-align:center;margin:28px 0;">
          <a href="{{factonetUrl}}" style="display:inline-block;background-color:#1565c0;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-size:16px;font-weight:700;mso-padding-alt:14px 44px;">${o.boton}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#1a237e;padding:20px;text-align:center;">
        <p style="color:#bbdefb;margin:0;font-size:12px;">&copy; {{year}} CycloNet S.A.S. — Todos los derechos reservados</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const PLANTILLAS_FACTURACION: PlantillaFacturacion[] = [
  {
    code: 'INVOICE_DUE_SOON',
    subject: 'Tu factura {{invoiceCode}} vence el {{dueDate}} - FactoNet',
    htmlBody: correo({
      titulo: 'Tu factura vence pronto',
      parrafos: ['Te recordamos que la factura <strong>{{invoiceCode}}</strong> vence el <strong>{{dueDate}}</strong>.'],
      destacado: 'Valor a pagar: <strong>{{amount}}</strong>',
      boton: 'Pagar en FactoNet',
    }),
  },
  {
    code: 'INVOICE_REMINDER',
    subject: 'Hoy vence tu factura {{invoiceCode}} - FactoNet',
    htmlBody: correo({
      titulo: 'Hoy vence tu factura',
      parrafos: [
        'La factura <strong>{{invoiceCode}}</strong> vence hoy.',
        'Si ya la pagaste, reporta el pago en FactoNet con tu constancia para que la confirmemos.',
      ],
      destacado: 'Valor a pagar: <strong>{{amount}}</strong>',
      boton: 'Pagar en FactoNet',
    }),
  },
  {
    code: 'INVOICE_WARNING',
    subject: 'Tu factura {{invoiceCode}} está vencida - FactoNet',
    htmlBody: correo({
      titulo: 'Tu factura está vencida',
      color: '#e65100',
      parrafos: [
        'La factura <strong>{{invoiceCode}}</strong> está vencida y aún no registramos su pago.',
        'Págala en los próximos dos días para evitar intereses de mora.',
      ],
      boton: 'Pagar en FactoNet',
    }),
  },
  {
    code: 'INVOICE_LATE_FEE_START',
    subject: 'Tu factura {{invoiceCode}} está generando intereses de mora - FactoNet',
    htmlBody: correo({
      titulo: 'Tu factura genera intereses de mora',
      color: '#c62828',
      parrafos: [
        'La factura <strong>{{invoiceCode}}</strong> sigue sin pago y desde hoy genera intereses de mora diarios.',
        'Si no se paga, el servicio se suspenderá en ocho días.',
      ],
      boton: 'Pagar en FactoNet',
    }),
  },
  {
    code: 'CONTRACT_SUSPENDED',
    subject: 'Servicio suspendido por la factura {{invoiceCode}} - FactoNet',
    htmlBody: correo({
      titulo: 'Tu servicio fue suspendido',
      color: '#c62828',
      parrafos: [
        'Suspendimos tu servicio porque la factura <strong>{{invoiceCode}}</strong> sigue sin pago.',
        'Paga la factura para reactivarlo. Si no se paga en los próximos cinco días, el contrato se cancelará.',
      ],
      boton: 'Pagar en FactoNet',
    }),
  },
  {
    code: 'PAYMENT_CONFIRMED',
    subject: 'Recibimos tu pago de la factura {{invoiceCode}} - FactoNet',
    htmlBody: correo({
      titulo: '¡Pago confirmado!',
      color: '#2e7d32',
      parrafos: ['Confirmamos el pago de la factura <strong>{{invoiceCode}}</strong>. Gracias.'],
      destacado: 'Valor pagado: <strong>{{amount}}</strong>',
      boton: 'Ver mis facturas',
    }),
  },
  {
    code: 'PAYMENT_REJECTED',
    subject: 'No pudimos confirmar el pago de la factura {{invoiceCode}} - FactoNet',
    reemplazaAsunto: 'Payment rejected for invoice {{invoiceCode}} - Action required',
    htmlBody: correo({
      titulo: 'No pudimos confirmar tu pago',
      color: '#c62828',
      parrafos: [
        'Revisamos el pago que reportaste para la factura <strong>{{invoiceCode}}</strong> y no pudimos confirmarlo.',
        'Entra a FactoNet y repórtalo de nuevo con una constancia válida.',
      ],
      destacado: '<strong>Motivo:</strong> {{reason}}',
      boton: 'Ir a FactoNet',
    }),
  },
];

/** Pesos colombianos sin decimales: $105.910. */
export function pesos(valor: number | string | null | undefined): string {
  return '$' + Math.round(Number(valor) || 0).toLocaleString('es-CO');
}

/** Fecha legible en español: 10 de octubre de 2026. */
export function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Valor de la factura más o menos sus conceptos (IVA, descuentos), como en FactoNet. */
export function totalFactura(invoice: { value?: any; globalParameters?: Record<string, any> | null; operationTypes?: Record<string, string> | null }): number {
  let total = Number(invoice?.value) || 0;
  const conceptos = invoice?.globalParameters || {};
  for (const [clave, operacion] of Object.entries(invoice?.operationTypes || {})) {
    const valor = Number(conceptos[clave]);
    if (!valor) continue;
    total += operacion === 'subtract' ? -valor : valor;
  }
  return Math.round(total * 100) / 100;
}
