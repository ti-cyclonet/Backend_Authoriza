import { Logger } from '@nestjs/common';
import { Invoice } from './entities/invoice.entity';

/**
 * Avisa a Kiri Finance de los eventos de una factura de un plan de Kiri
 * (emitida, recordatorios, recargo, suspensión, pagada) para que el usuario
 * lo vea también dentro de Kiri (campana + celular) y, al tocar el aviso,
 * llegue al acceso a FactoNet desde "Mi plan".
 *
 * Servidor a servidor con x-internal-key (INTERNAL_API_KEY, la misma que usa
 * /api/plan/activate-user). Nunca bloquea ni hace fallar el flujo de facturas.
 */
export type EventoFacturaKiri = 'emitida' | 'vence_hoy' | 'aviso_mora' | 'recargo' | 'suspendida' | 'pagada' | 'pago_rechazado';

const logger = new Logger('KiriInvoiceNotifier');

/** ¿La factura es de un contrato de Kiri? (el paquete del contrato se carga solo: eager) */
export function esFacturaDeKiri(invoice: Invoice): boolean {
  const app = invoice.contract?.package?.targetApplication;
  return !!app && app.toLowerCase() === 'kiri';
}

export function notificarFacturaAKiri(invoice: Invoice, evento: EventoFacturaKiri): void {
  if (!esFacturaDeKiri(invoice)) return;
  const email = invoice.user?.strUserName;
  const clave = process.env.INTERNAL_API_KEY || '';
  if (!email || clave.length < 16) return;

  const kiriApiUrl = (process.env.KIRI_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const fecha = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

  fetch(`${kiriApiUrl}/api/plan/factura-evento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': clave },
    body: JSON.stringify({
      email,
      evento,
      factura: {
        codigo: invoice.code || `DF${invoice.id}`,
        valor: Number(invoice.value),
        emitida: fecha(invoice.issueDate),
        vence: fecha(invoice.expirationDate),
        periodo: invoice.periodStart ? fecha(invoice.periodStart) : null,
        estado: invoice.status,
        plan: invoice.contract?.package?.displayName || invoice.contract?.package?.name || null,
      },
    }),
    signal: AbortSignal.timeout(8000),
  })
    .then((res) => {
      if (!res.ok && res.status !== 404) logger.warn(`Kiri respondió ${res.status} al aviso "${evento}" de ${email}`);
    })
    .catch((err) => logger.warn(`No se pudo avisar a Kiri (${evento}) de ${email}: ${err.message}`));
}
