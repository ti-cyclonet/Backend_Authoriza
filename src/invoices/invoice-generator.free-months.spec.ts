import { InvoiceGeneratorService } from './invoice-generator.service';
import { InvoiceStatus } from './entities/invoice.entity';
import { PaymentMode } from '../contract/enums/payment-mode.enum';

/**
 * Meses gratis (Kiri: premios por invitar amigos a quien ya paga su plan):
 * cada factura usa los meses que cubre y, si queda en $0, sale ya pagada.
 */
describe('InvoiceGeneratorService · meses gratis', () => {
  const armar = () => {
    const guardadas: any[] = [];
    const actualizaciones: any[] = [];
    const invoiceRepository = {
      count: jest.fn().mockResolvedValue(1),
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
  // KIRI PLUS mensual ($14.900) que empezó antes del periodo (sin prorrateo)
  const contrato = (credito: number, extra: Record<string, unknown> = {}) => ({
    id: 'c1', value: 178800, mode: PaymentMode.MONTHLY, payday: 1,
    startDate: new Date(2026, 0, 1), user: { id: 'u1' }, freeMonthsCredit: credito, ...extra,
  });
  const generar = (s: InvoiceGeneratorService, c: any) => (s as any).createInvoiceForContract(c, new Date(2026, 9, 27));

  it('mensual con 1 mes gratis → factura en $0, ya pagada, y el crédito queda en 0', async () => {
    const { service, guardadas, actualizaciones } = armar();
    await generar(service, contrato(1));
    expect(guardadas[0].value).toBe(0);
    expect(guardadas[0].status).toBe(InvoiceStatus.PAID);
    expect(guardadas[0].paidAmount).toBe(0);
    expect(actualizaciones).toEqual([{ id: 'c1', data: { freeMonthsCredit: 0 } }]);
  });

  it('mensual con 3 meses gratis → usa 1 y quedan 2', async () => {
    const { service, actualizaciones } = armar();
    await generar(service, contrato(3));
    expect(actualizaciones).toEqual([{ id: 'c1', data: { freeMonthsCredit: 2 } }]);
  });

  it('anual con 1 mes gratis → descuenta 1/12 y sigue por pagar', async () => {
    const { service, guardadas } = armar();
    await generar(service, contrato(1, { mode: PaymentMode.ANNUAL, value: 139000, startDate: new Date(2026, 0, 1) }));
    expect(guardadas[0].value).toBe(Math.round(139000 * (11 / 12) * 100) / 100);
    expect(guardadas[0].status).toBe(InvoiceStatus.UNCONFIRMED);
  });

  it('sin meses gratis → precio normal y no toca el contrato', async () => {
    const { service, guardadas, actualizaciones } = armar();
    await generar(service, contrato(0));
    expect(guardadas[0].value).toBe(14900);
    expect(guardadas[0].status).toBe(InvoiceStatus.UNCONFIRMED);
    expect(actualizaciones).toHaveLength(0);
  });
});
