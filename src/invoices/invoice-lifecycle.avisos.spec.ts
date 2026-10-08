import { InvoiceLifecycleCron, DIAS_AVISO_PREVIO, fechaSinHora } from './invoice-lifecycle.cron';

describe('fechaSinHora', () => {
  it('lee la columna date como fecha local, sin correrse un día por la zona horaria', () => {
    const d = fechaSinHora('2026-09-01')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 1]);
    const deDate = fechaSinHora(new Date(Date.UTC(2026, 8, 1)))!;
    expect([deDate.getMonth(), deDate.getDate()]).toEqual([8, 1]);
    expect(fechaSinHora(null)).toBeNull();
  });
});
import { InvoiceStatus } from './entities/invoice.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PLANTILLAS_FACTURACION, pesos, totalFactura } from '../notifications/plantillas-facturacion';

/**
 * Avisos de cobro: además del recordatorio del día de pago, ahora se avisa
 * DIAS_AVISO_PREVIO días antes, con el valor y la fecha.
 */
describe('InvoiceLifecycleCron · avisos de cobro', () => {
  const armar = () => {
    const enviados: Array<{ code: string; to: string; vars: Record<string, string> }> = [];
    const actualizaciones: any[] = [];
    const notifications = {
      sendByTemplate: jest.fn(async (code: string, to: string, vars: Record<string, string>) => { enviados.push({ code, to, vars }); }),
    };
    const cron = new InvoiceLifecycleCron(
      { update: jest.fn(async (id, data) => actualizaciones.push({ id, data })) } as any,
      { update: jest.fn() } as any,
      {} as any,
      {} as any,
      notifications as any,
    );
    return { cron, enviados, actualizaciones };
  };

  // Periodo de septiembre, día de pago 10 → paga el 10 de octubre de 2026
  const factura = (status = InvoiceStatus.ISSUED) => ({
    id: 7, code: 'DF00007', status, value: 89000,
    globalParameters: { iva: 16910 }, operationTypes: { iva: 'add' },
    periodStart: '2026-09-01', contract: { payday: 10 },
    user: { strUserName: 'cliente@x.co', basicData: { legalEntityData: { businessName: 'Panadería La Espiga' } } },
  });
  const dia = (d: number) => { const t = new Date(2026, 9, d); t.setHours(0, 0, 0, 0); return t; };

  it(`${DIAS_AVISO_PREVIO} días antes: "vence pronto" con valor (IVA incluido) y fecha, sin cambiar el estado`, async () => {
    const { cron, enviados, actualizaciones } = armar();
    await (cron as any).processInvoice(factura(), dia(10 - DIAS_AVISO_PREVIO));
    expect(enviados).toHaveLength(1);
    expect(enviados[0].code).toBe('INVOICE_DUE_SOON');
    expect(enviados[0].to).toBe('cliente@x.co');
    expect(enviados[0].vars).toEqual(expect.objectContaining({
      customerName: 'Panadería La Espiga', invoiceCode: 'DF00007', amount: '$105.910', dueDate: expect.stringContaining('octubre'),
    }));
    expect(actualizaciones).toEqual([]);
  });

  it('otros días antes del vencimiento: nada', async () => {
    const { cron, enviados } = armar();
    await (cron as any).processInvoice(factura(), dia(5));
    await (cron as any).processInvoice(factura(), dia(9));
    expect(enviados).toEqual([]);
  });

  it('el día de pago: recordatorio con el valor', async () => {
    const { cron, enviados } = armar();
    await (cron as any).processInvoice(factura(), dia(10));
    expect(enviados.map(e => e.code)).toEqual(['INVOICE_REMINDER']);
    expect(enviados[0].vars.amount).toBe('$105.910');
  });

  it('una factura con pago reportado no recibe el "vence pronto"', async () => {
    const { cron, enviados } = armar();
    await (cron as any).processInvoice(factura(InvoiceStatus.PAYMENT_REPORTED), dia(7));
    expect(enviados).toEqual([]);
  });

  it('a los 5 días sigue escalando a primer aviso (sin cambios en el ciclo)', async () => {
    const { cron, enviados, actualizaciones } = armar();
    await (cron as any).processInvoice(factura(), dia(15));
    expect(actualizaciones).toEqual([{ id: 7, data: { status: InvoiceStatus.NOTIFICATION1 } }]);
    expect(enviados.map(e => e.code)).toEqual(['INVOICE_WARNING']);
  });
});

describe('Plantillas del ciclo de cobro', () => {
  const armar = (existentes: any[]) => {
    const guardadas: any[] = [];
    const actualizadas: any[] = [];
    const repo = {
      findOne: jest.fn(async ({ where: { code } }) => existentes.find(t => t.code === code) || null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => { guardadas.push(x); return x; }),
      update: jest.fn(async (id, data) => { actualizadas.push({ id, data }); }),
    };
    return { service: new NotificationsService(repo as any, {} as any), guardadas, actualizadas };
  };

  it('el cron y los pagos usan códigos que ahora sí existen', () => {
    const codigos = PLANTILLAS_FACTURACION.map(p => p.code);
    for (const c of ['INVOICE_DUE_SOON', 'INVOICE_REMINDER', 'INVOICE_WARNING', 'INVOICE_LATE_FEE_START', 'CONTRACT_SUSPENDED', 'PAYMENT_CONFIRMED', 'PAYMENT_REJECTED']) {
      expect(codigos).toContain(c);
    }
  });

  it('crea las que faltan, activas', async () => {
    const { service, guardadas } = armar([]);
    await service.sembrarPlantillasFacturacion();
    expect(guardadas.map(g => g.code)).toEqual(PLANTILLAS_FACTURACION.map(p => p.code));
    expect(guardadas.every(g => g.isActive)).toBe(true);
  });

  it('PAYMENT_REJECTED en inglés sin editar se pasa a español', async () => {
    const { service, actualizadas } = armar([{ id: 'r1', code: 'PAYMENT_REJECTED', subject: 'Payment rejected for invoice {{invoiceCode}} - Action required' }]);
    await service.sembrarPlantillasFacturacion();
    expect(actualizadas).toHaveLength(1);
    expect(actualizadas[0].id).toBe('r1');
    expect(actualizadas[0].data.subject).toContain('No pudimos confirmar');
  });

  it('una plantilla que un administrador editó no se toca', async () => {
    const { service, actualizadas, guardadas } = armar([
      { id: 'r1', code: 'PAYMENT_REJECTED', subject: 'Asunto personalizado' },
      { id: 'w1', code: 'INVOICE_WARNING', subject: 'Otro asunto' },
    ]);
    await service.sembrarPlantillasFacturacion();
    expect(actualizadas).toEqual([]);
    expect(guardadas.map(g => g.code)).not.toContain('PAYMENT_REJECTED');
    expect(guardadas.map(g => g.code)).not.toContain('INVOICE_WARNING');
  });

  it('cada plantilla usa las variables que se le envían', () => {
    for (const p of PLANTILLAS_FACTURACION) {
      expect(p.htmlBody).toContain('{{customerName}}');
      expect(p.htmlBody).toContain('{{invoiceCode}}');
      expect(p.htmlBody).toContain('{{factonetUrl}}');
    }
  });

  it('pesos y totalFactura', () => {
    expect(pesos(105910)).toBe('$105.910');
    expect(totalFactura({ value: '89000.00', globalParameters: { iva: 16910, descuento: 1000 }, operationTypes: { iva: 'add', descuento: 'subtract' } })).toBe(104910);
    expect(totalFactura({ value: 50000 })).toBe(50000);
  });
});
