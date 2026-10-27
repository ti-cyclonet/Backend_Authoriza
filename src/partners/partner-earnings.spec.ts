import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartnerEarningsService, monthRange, shiftMonth } from './partner-earnings.service';

const OFFER = '11111111-2222-3333-4444-555555555555';

/** Repositorios mínimos en memoria; find filtra por el rango Between de receivedAt. */
function crear(rows: any[] = [], clicks: { offerId: string; clicks: number }[] = []) {
  const saved: any[] = [];
  const repo = {
    saved,
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => { const r = { id: `e${saved.length + 1}`, ...x }; saved.push(r); return r; }),
    find: jest.fn(async ({ where }: any) => {
      const [from, to] = where?.receivedAt?.value || ['0000-00-00', '9999-99-99'];
      return rows.filter((r) => r.receivedAt >= from && r.receivedAt <= to);
    }),
    findOne: jest.fn(async () => null),
    remove: jest.fn(),
  };
  const offers = { findOne: jest.fn(async ({ where }) => (where.id === OFFER ? { id: OFFER, name: 'FacturaYa' } : null)) };
  const qb: any = {};
  ['select', 'addSelect', 'where', 'groupBy'].forEach((k) => (qb[k] = jest.fn(() => qb)));
  qb.getRawMany = jest.fn(async () => clicks);
  const clickRepo = { createQueryBuilder: jest.fn(() => qb) };
  return { service: new PartnerEarningsService(repo as any, offers as any, clickRepo as any), repo };
}

describe('ingresos por aliados: fechas', () => {
  it('rango de un mes y desplazamiento entre años', () => {
    expect(monthRange('2026-02')).toEqual(['2026-02-01', '2026-02-28']);
    expect(monthRange('2028-02')).toEqual(['2028-02-01', '2028-02-29']);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', -5)).toBe('2026-05');
  });
});

describe('ingresos por aliados: registro', () => {
  it('toma el nombre del servicio, redondea y guarda quién lo registró', async () => {
    const { service, repo } = crear();
    await service.create({ offerId: OFFER, amount: '45000.456', receivedAt: '2026-10-20', reference: ' PAGO-123 ' }, 'admin@cyclonet.co');
    expect(repo.saved[0]).toMatchObject({ offerId: OFFER, partnerName: 'FacturaYa', source: 'referido', amount: '45000.46', reference: 'PAGO-123', createdBy: 'admin@cyclonet.co' });
  });

  it('acepta un aliado fuera del catálogo y la comisión de pasarela', async () => {
    const { service, repo } = crear();
    await service.create({ partnerName: 'Mercado Pago', source: 'pasarela', amount: 1200, receivedAt: '2026-10-01' });
    expect(repo.saved[0]).toMatchObject({ offerId: null, partnerName: 'Mercado Pago', source: 'pasarela' });
  });

  it('rechaza valores, fechas o servicios inválidos', async () => {
    const { service } = crear();
    await expect(service.create({ partnerName: 'X', amount: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ partnerName: 'X', amount: 10, receivedAt: '2026-13-45' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ partnerName: 'X', amount: 10, receivedAt: '2999-01-01' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ amount: 10 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ offerId: 'otro', amount: 10 })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ingresos por aliados: resumen del dashboard', () => {
  it('suma el mes, el anterior, el año, los 6 meses y agrupa por aliado con sus clics', async () => {
    const rows = [
      { offerId: OFFER, partnerName: 'FacturaYa', source: 'referido', amount: '40000.00', receivedAt: '2026-10-05' },
      { offerId: OFFER, partnerName: 'FacturaYa', source: 'referido', amount: '10000.50', receivedAt: '2026-10-25' },
      { offerId: null, partnerName: 'Mercado Pago', source: 'pasarela', amount: '3000.00', receivedAt: '2026-10-10' },
      { offerId: OFFER, partnerName: 'FacturaYa', source: 'referido', amount: '20000.00', receivedAt: '2026-09-15' },
      { offerId: OFFER, partnerName: 'FacturaYa', source: 'referido', amount: '5000.00', receivedAt: '2026-02-01' },
      { offerId: OFFER, partnerName: 'FacturaYa', source: 'referido', amount: '999.00', receivedAt: '2025-12-31' },
    ];
    const { service } = crear(rows, [{ offerId: OFFER, clicks: 12 }]);
    const r = await service.summary('2026-10');
    expect(r).toMatchObject({ month: '2026-10', total: 53000.5, prevTotal: 20000, yearTotal: 78000.5, count: 3, clicks: 12 });
    expect(r.byMonth.map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(r.byMonth[5].total).toBe(53000.5);
    expect(r.byPartner).toEqual([
      { offerId: OFFER, name: 'FacturaYa', total: 50000.5, count: 2, clicks: 12 },
      { offerId: null, name: 'Mercado Pago', total: 3000, count: 1, clicks: 0 },
    ]);
    expect(r.bySource).toEqual([{ source: 'referido', total: 50000.5 }, { source: 'pasarela', total: 3000 }]);
  });
});
