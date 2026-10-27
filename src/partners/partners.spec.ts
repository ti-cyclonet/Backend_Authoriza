import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartnersService } from './partners.service';

const ID = '11111111-2222-3333-4444-555555555555';

/** Repositorios mínimos en memoria. */
function crear(rows: any[] = []) {
  const clicks: any[] = [];
  const repo = {
    rows,
    find: jest.fn(async () => rows),
    findOne: jest.fn(async ({ where }) => rows.find((r) => r.id === where.id && (where.active === undefined || r.active === where.active)) || null),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: x.id || ID, ...x })),
    remove: jest.fn(async (x) => x),
  };
  const clickRepo = {
    clicks,
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => { clicks.push(x); return x; }),
    delete: jest.fn(async () => ({})),
  };
  return { service: new PartnersService(repo as any, clickRepo as any), repo, clickRepo };
}

const oferta = (over: any = {}) => ({
  id: ID, name: 'Factura Fácil', category: 'facturacion', description: 'Facturación electrónica DIAN.', benefit: '1 mes gratis',
  url: 'https://aliado.co/?ref=cyclonet', logoUrl: null, applications: ['inout'], placements: ['ventas'], isAffiliate: true, active: true, sortOrder: 1,
  ...over,
});

describe('servicios recomendados: catálogo de la app', () => {
  it('no entrega el enlace de destino y filtra por app y pantalla', async () => {
    const { service } = crear([oferta(), oferta({ id: 'x2', name: 'Otro', applications: ['shotra'] }), oferta({ id: 'x3', name: 'Datáfono', placements: ['cartera'] })]);
    const todos = await service.publicList('inout');
    expect(todos.map((o) => o.name)).toEqual(['Factura Fácil', 'Datáfono']);
    expect(todos[0]).not.toHaveProperty('url');
    expect((await service.publicList('inout', 'ventas')).map((o) => o.name)).toEqual(['Factura Fácil']);
    expect((await service.publicList('inout', 'catalogo')).length).toBe(2);
  });
});

describe('servicios recomendados: clic', () => {
  it('cuenta el clic con el negocio y la pantalla, y devuelve el enlace del aliado', async () => {
    const { service, clickRepo } = crear([oferta()]);
    const url = await service.click(ID, { app: 'inout', tenant: 'tn-1', placement: 'ventas' });
    expect(url).toBe('https://aliado.co/?ref=cyclonet');
    expect(clickRepo.clicks[0]).toEqual({ offerId: ID, application: 'inout', tenantId: 'tn-1', placement: 'ventas' });
  });

  it('un servicio pausado o un id inválido no redirige', async () => {
    const { service } = crear([oferta({ active: false })]);
    await expect(service.click(ID, {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.click('../../etc', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('si no se puede guardar el clic igual lleva al aliado', async () => {
    const { service, clickRepo } = crear([oferta()]);
    clickRepo.save.mockRejectedValueOnce(new Error('db'));
    await expect(service.click(ID, {})).resolves.toBe('https://aliado.co/?ref=cyclonet');
  });
});

describe('servicios recomendados: administración', () => {
  it('solo acepta enlaces https y normaliza categoría, apps y pantallas', async () => {
    const { service } = crear();
    await expect(service.create({ name: 'X', description: 'Descripción larga', url: 'javascript:alert(1)' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ name: 'X', description: 'Descripción larga', url: 'http://aliado.co' })).rejects.toBeInstanceOf(BadRequestException);
    const r = await service.create({
      name: '  Datáfonos  Ya ', description: 'Datáfono sin arriendo.', url: 'https://aliado.co/r/abc', category: 'Hardware',
      applications: ['inout', 'otra'], placements: ['ventas', 'ventas', 'nope'], sortOrder: '5',
    });
    expect(r).toMatchObject({ name: 'Datáfonos Ya', category: 'hardware', applications: ['inout'], placements: ['ventas'], sortOrder: 5 });
  });

  it('editar solo cambia lo enviado', async () => {
    const { service } = crear([oferta()]);
    const r = await service.update(ID, { active: false });
    expect(r).toMatchObject({ active: false, name: 'Factura Fácil', url: 'https://aliado.co/?ref=cyclonet' });
  });
});
