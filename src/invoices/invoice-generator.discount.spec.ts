import { InvoiceGeneratorService } from './invoice-generator.service';
import { PaymentMode } from '../contract/enums/payment-mode.enum';

/**
 * Descuento de la primera factura (Kiri: invitado por un amigo, 50% en el
 * primer mes de PLUS / 30% en PRO): se aplica solo si el contrato aún no tiene
 * facturas y se borra del contrato al usarse.
 */
describe('InvoiceGeneratorService · descuento de la primera factura', () => {
  const armar = (facturasPrevias: number) => {
    const guardadas: any[] = [];
    const actualizaciones: any[] = [];
    const invoiceRepository = {
      count: jest.fn().mockResolvedValue(facturasPrevias),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => { guardadas.push(x); return x; }),
    };
    const contractRepository = { update: jest.fn(async (id, data) => { actualizaciones.push({ id, data }); }) };
    const qb: any = { leftJoinAndSelect: () => qb, where: () => qb, andWhere: () => qb, getMany: async () => [] };
    const service = new InvoiceGeneratorService(
      invoiceRepository as any,
      contractRepository as any,
      {} as any,
      { createQueryBuilder: () => qb } as any,
      { generateCode: async () => 'FAC-1' } as any,
    );
    return { service, guardadas, actualizaciones };
  };
  // Contrato mensual de KIRI PLUS ($14.900/mes → value anual 178.800) que empezó
  // antes del periodo (sin prorrateo)
  const contrato = (pct: number | null) => ({
    id: 'c1', value: 178800, mode: PaymentMode.MONTHLY, payday: 1,
    startDate: new Date(2026, 0, 1), user: { id: 'u1' }, firstInvoiceDiscountPct: pct,
  });

  it('primera factura con 50% → 7.450 y se borra el descuento del contrato', async () => {
    const { service, guardadas, actualizaciones } = armar(0);
    await (service as any).createInvoiceForContract(contrato(50), new Date(2026, 9, 27));
    expect(guardadas[0].value).toBe(7450);
    expect(actualizaciones).toEqual([{ id: 'c1', data: { firstInvoiceDiscountPct: null } }]);
  });

  it('si el contrato ya tiene facturas, no descuenta (y limpia el campo)', async () => {
    const { service, guardadas, actualizaciones } = armar(1);
    await (service as any).createInvoiceForContract(contrato(50), new Date(2026, 9, 27));
    expect(guardadas[0].value).toBe(14900);
    expect(actualizaciones).toHaveLength(1);
  });

  it('sin descuento → precio normal y no toca el contrato', async () => {
    const { service, guardadas, actualizaciones } = armar(0);
    await (service as any).createInvoiceForContract(contrato(null), new Date(2026, 9, 27));
    expect(guardadas[0].value).toBe(14900);
    expect(actualizaciones).toHaveLength(0);
  });

  it('30% en PRO ($24.900) → 17.430', async () => {
    const { service, guardadas } = armar(0);
    await (service as any).createInvoiceForContract({ ...contrato(30), value: 24900 * 12 }, new Date(2026, 9, 27));
    expect(guardadas[0].value).toBe(17430);
  });
});
