import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { computeTotals, nextNumber, nitCheckDigit, resolutionWarning, validateBuyer, validateIssuer } from './dian';
import { addonCharges, einvoicingCatalog } from './addon-plans';
import { buyerFromUser, linesFromInvoice } from './cyclonet-invoices';
import { resolveProvider } from './providers/registry';
import { EinvoicingService } from './einvoicing.service';

const ISSUER = {
  idType: '31', idNumber: '901565464', legalName: 'Cyclonet S. A. S.', personType: 'JURIDICA' as const, taxRegime: '48' as const,
  responsibilities: ['R-99-PN'], address: 'Cra 1 # 2-3', municipalityCode: '13001', email: 'facturas@cyclonet.com.co',
};

describe('Facturación electrónica · reglas DIAN', () => {
  it('dígito de verificación del NIT', () => {
    expect(nitCheckDigit('890903938')).toBe(8); // Bancolombia 890.903.938-8
    expect(nitCheckDigit('800.197.268')).toBe(4);
    expect(nitCheckDigit('')).toBeNaN();
  });

  it('valida el emisor y avisa un dígito de verificación equivocado', () => {
    expect(validateIssuer({ ...ISSUER, checkDigit: nitCheckDigit(ISSUER.idNumber) })).toEqual([]);
    expect(validateIssuer({ ...ISSUER, checkDigit: 0 }).join(' ')).toMatch(/dígito de verificación/);
    expect(validateIssuer({ ...ISSUER, municipalityCode: 'Cartagena' }).join(' ')).toMatch(/DANE/);
    expect(validateIssuer({})).not.toHaveLength(0);
  });

  it('el comprador de una factura necesita correo; el POS y el consumidor final no', () => {
    const b = { idType: '13', idNumber: '1047000111', name: 'Laura Gómez' };
    expect(validateBuyer(b, 'FACTURA').join(' ')).toMatch(/correo/);
    expect(validateBuyer(b, 'POS')).toEqual([]);
    expect(validateBuyer(null, 'FACTURA')).toEqual([]);
  });

  it('impuestos y totales por línea, agrupados por tarifa', () => {
    const t = computeTotals([
      { description: 'Arepa', quantity: 2, unitPrice: 10_084.03, taxCode: 'IVA', taxRate: 19 },
      { description: 'Jugo', quantity: 1, unitPrice: 5_000, discount: 500, taxCode: 'INC', taxRate: 8 },
      { description: 'Huevos', quantity: 1, unitPrice: 3_000, taxCode: 'EXCLUIDO', taxRate: 19 },
    ]);
    expect(t.lines[0]).toEqual(expect.objectContaining({ base: 20_168.06, tax: 3_831.93, total: 23_999.99 }));
    expect(t.lines[2].tax).toBe(0);
    expect(t.taxes).toEqual([{ taxCode: 'IVA', taxRate: 19, base: 20_168.06, tax: 3_831.93 }, { taxCode: 'INC', taxRate: 8, base: 4_500, tax: 360 }]);
    expect(t.total).toBe(31_859.99);
    expect(() => computeTotals([])).toThrow();
  });

  it('numeración: dentro del rango y la vigencia', () => {
    const r = { prefix: 'SETP', rangeFrom: 990000000, rangeTo: 990000002, lastNumber: 0, validFrom: '2026-01-01', validTo: '2027-12-31' };
    const now = new Date('2026-11-09T12:00:00');
    expect(nextNumber(r, now)).toEqual({ number: 990000000 });
    expect(nextNumber({ ...r, lastNumber: 990000002 }, now)).toEqual({ error: expect.stringMatching(/agotó/) });
    expect(nextNumber({ ...r, validTo: '2026-10-31' }, now)).toEqual({ error: expect.stringMatching(/venció/) });
    expect(resolutionWarning({ ...r, lastNumber: 990000001 }, now)).toMatch(/Quedan 1/);
  });
});

describe('Facturación electrónica · complemento del contrato', () => {
  it('sin precios configurados: "por definir" y no se cobra', () => {
    const c = einvoicingCatalog({});
    expect(c.pricesDefined).toBe(false);
    expect(c.tiers.map((t) => [t.code, t.includedUnits, t.monthly])).toEqual([['BASICO', 50, null], ['MEDIO', 150, null], ['ALTO', 500, null]]);
    expect(addonCharges({ status: 'ACTIVO', tier: 'MEDIO', monthlyValue: null, extraUnitValue: null, includedUnits: 150 }, { months: 1, unitsUsedLastMonth: 300 })).toEqual([]);
  });

  it('con precios: valor mensual por los meses de la factura y el excedente del mes anterior', () => {
    const c = einvoicingCatalog({ EINVOICING_PRICES: JSON.stringify({ BASICO: { monthly: 39900 }, MEDIO: { monthly: 89900 }, ALTO: { monthly: 199900 }, extraUnit: 350 }) });
    expect(c.pricesDefined).toBe(true);
    const charges = addonCharges({ status: 'ACTIVO', tier: 'BASICO', monthlyValue: 39900, extraUnitValue: 350, includedUnits: 50 }, { months: 1, unitsUsedLastMonth: 62 });
    expect(charges.map((x) => x.amount)).toEqual([39900, 4200]);
    expect(addonCharges({ status: 'ACTIVO', tier: 'BASICO', monthlyValue: 39900, extraUnitValue: 350, includedUnits: 50 }, { months: 12, unitsUsedLastMonth: 0 })[0].amount).toBe(478800);
    expect(addonCharges({ status: 'SOLICITADO', tier: 'BASICO', monthlyValue: 39900, extraUnitValue: 350, includedUnits: 50 }, { months: 1, unitsUsedLastMonth: 0 })).toEqual([]);
  });
});

describe('Facturación electrónica · facturas de CycloNet', () => {
  it('comprador desde el cliente de Authoriza', () => {
    const user = { strUserName: 'pagos@jimmylon.co', basicData: { documentNumber: '1.047.000.111', documentType: { documentType: 'CC' }, naturalPersonData: { firstName: 'Jimena', firstSurname: 'Ríos' } } };
    expect(buyerFromUser(user)).toEqual({ idType: '13', idNumber: '1047000111', name: 'Jimena Ríos', email: 'pagos@jimmylon.co' });
    expect(buyerFromUser({ basicData: {} })).toBeNull();
  });

  it('una línea por el servicio con su IVA y los descuentos de la factura', () => {
    const [l] = linesFromInvoice({ code: 'DF00012', value: 89000, globalParameters: { iva: 16910, global_discount: 1000, late_fee_penalty: 500 }, operationTypes: { iva: 'add', global_discount: 'subtract', late_fee_penalty: 'add' }, percentages: { iva: 19 }, contract: { package: { name: 'InOut PRO' } } });
    expect(l).toEqual(expect.objectContaining({ unitPrice: 89000, discount: 1000, taxCode: 'IVA', taxRate: 19 }));
    expect(l.description).toMatch(/InOut PRO/);
  });
});

describe('Facturación electrónica · proveedor', () => {
  it('sin proveedor: en configuración; el simulado nunca en producción', () => {
    expect(resolveProvider({})).toBeNull();
    expect(resolveProvider({ EINVOICING_PROVIDER: 'simulado', NODE_ENV: 'production' })).toBeNull();
    expect(resolveProvider({ EINVOICING_PROVIDER: 'simulado' })?.name).toBe('simulado');
    expect(resolveProvider({ EINVOICING_PROVIDER: 'proveedor-que-no-existe' })).toBeNull();
  });
});

describe('Facturación electrónica · servicio', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  const repo = (rows: any[] = []) => ({
    rows,
    findOne: jest.fn(async ({ where }: any) => rows.find((r) => Object.entries(where).every(([k, v]: any) => (v && typeof v === 'object' && v._type === 'in' ? v._value.includes(r[k]) : r[k] === v))) ?? null),
    find: jest.fn(async () => rows),
    count: jest.fn(async () => rows.length),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => { if (!rows.includes(x)) rows.push(x); return x; }),
    update: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(() => ({ where: () => ({ getCount: async () => 0 }) })),
  });

  const make = () => {
    const issuers = repo();
    const resolutions = repo();
    const documents = repo();
    const addons = repo();
    const contracts = { findTenantLimits: jest.fn(async () => ({ contractId: 'c-1' })) };
    const service = new EinvoicingService(issuers as any, resolutions as any, documents as any, addons as any, {} as any, contracts as any);
    return { service, issuers, resolutions, documents, addons };
  };

  it('en configuración: el estado lo dice y no se puede emitir', async () => {
    delete process.env.EINVOICING_PROVIDER;
    const { service } = make();
    const s = await service.status('t1');
    expect(s.available).toBe(false);
    expect(s.message).toMatch(/en configuración/);
    await expect(service.issue({ tenantId: 't1', sourceApp: 'INOUT', sourceId: 's1', type: 'FACTURA', buyer: null, lines: [] }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('solicitar el complemento exige aceptar los términos y queda SOLICITADO', async () => {
    delete process.env.EINVOICING_PROVIDER;
    const { service, addons } = make();
    await expect(service.requestAddon('t1', { tier: 'MEDIO', acceptTerms: false, requestedBy: 'x@y.co' })).rejects.toBeInstanceOf(BadRequestException);
    await service.requestAddon('t1', { tier: 'MEDIO', acceptTerms: true, requestedBy: 'dueno@tienda.co' });
    expect(addons.rows[0]).toEqual(expect.objectContaining({ tenantId: 't1', contractId: 'c-1', tier: 'MEDIO', includedUnits: 150, status: 'SOLICITADO', monthlyValue: null }));
  });

  it('con proveedor y emisor listo, el complemento se activa con el precio vigente', async () => {
    process.env.EINVOICING_PROVIDER = 'simulado';
    process.env.EINVOICING_PRICES = JSON.stringify({ BASICO: { monthly: 39900 }, MEDIO: { monthly: 89900 }, ALTO: { monthly: 199900 }, extraUnit: 350 });
    const { service, issuers, addons } = make();
    addons.rows.push({ tenantId: 't1', code: 'EINVOICING', tier: 'MEDIO', includedUnits: 150, status: 'SOLICITADO', monthlyValue: null, extraUnitValue: null });
    issuers.rows.push({ tenantId: 't1', ...ISSUER, status: 'LISTO' });
    expect(await service.maybeActivate('t1')).toBe(true);
    expect(addons.rows[0]).toEqual(expect.objectContaining({ status: 'ACTIVO', monthlyValue: 89900, extraUnitValue: 350 }));
    expect(issuers.rows[0]).toEqual(expect.objectContaining({ status: 'HABILITADO', providerName: 'simulado', providerIssuerId: 'SIM-901565464' }));
  });

  it('emite: reserva el número de la resolución, no duplica y el proveedor lo acepta', async () => {
    process.env.EINVOICING_PROVIDER = 'simulado';
    const issuers = repo([{ id: 'i1', tenantId: 't1', ...ISSUER, status: 'HABILITADO' }]);
    const resolutions = repo();
    const documents = repo();
    const addons = repo([{ tenantId: 't1', code: 'EINVOICING', status: 'ACTIVO', tier: 'BASICO', includedUnits: 50 }]);
    const resolution = { id: 'r1', issuerId: 'i1', docType: 'FACTURA', prefix: 'FE', rangeFrom: 1, rangeTo: 100, lastNumber: 0, validFrom: '2026-01-01', validTo: '2099-12-31', technicalKey: 'tk' };
    const manager = {
      createQueryBuilder: () => { const qb: any = { setLock: () => qb, where: () => qb, addSelect: () => qb, getOne: async () => resolution }; return qb; },
      save: jest.fn(async (x: any) => { if (x.idempotencyKey) { x.id = 'd1'; documents.rows.push(x); } return x; }),
      create: (_e: any, x: any) => ({ ...x }),
    };
    (resolutions as any).createQueryBuilder = manager.createQueryBuilder;
    (documents as any).findOneOrFail = jest.fn(async ({ where }: any) => documents.rows.find((d) => d.id === where.id));
    (issuers as any).findOneOrFail = jest.fn(async () => issuers.rows[0]);
    const service = new EinvoicingService(issuers as any, resolutions as any, documents as any, addons as any, { transaction: (fn: any) => fn(manager) } as any, {} as any);
    const input = { tenantId: 't1', sourceApp: 'INOUT' as const, sourceId: 'venta-1', type: 'FACTURA' as const,
      buyer: { idType: '13', idNumber: '1047000111', name: 'Laura Gómez', email: 'laura@correo.co' },
      lines: [{ description: 'Arepa', quantity: 2, unitPrice: 10_000, taxCode: 'IVA' as const, taxRate: 19 }] };
    const doc = await service.issue(input);
    expect(doc).toEqual(expect.objectContaining({ prefix: 'FE', number: 1, status: 'PENDIENTE', idempotencyKey: 'INOUT:venta-1:FACTURA', total: 23_800 }));
    expect(resolution.lastNumber).toBe(1);
    expect(await service.issue(input)).toBe(doc);
    const sent = await service.send('d1');
    expect(sent.status).toBe('ACEPTADO');
    expect(sent.cufe).toHaveLength(96);
  });

  it('sin complemento activo, un negocio no puede emitir', async () => {
    process.env.EINVOICING_PROVIDER = 'simulado';
    const { service } = make();
    await expect(service.issue({ tenantId: 't1', sourceApp: 'INOUT', sourceId: 's1', type: 'FACTURA', buyer: null, lines: [{ description: 'x', quantity: 1, unitPrice: 1000, taxCode: 'IVA', taxRate: 19 }] }))
      .rejects.toMatchObject({ response: { error: 'EINVOICING_NOT_ACTIVE' } });
  });
});

describe('Facturación electrónica · avisos por correo', () => {
  const { esc, noticeVariables, priceText } = require('./einvoicing-notices');
  it('variables escapadas, precio "por confirmar" y texto según disponibilidad', () => {
    expect(esc('<b>Arepas & Co</b>')).toBe('&lt;b&gt;Arepas &amp; Co&lt;/b&gt;');
    expect(priceText(null)).toMatch(/por confirmar/);
    expect(priceText(89900)).toBe('$89.900 al mes');
    const ctx = { businessName: 'Arepas <SAS>', tenantEmail: 'a@b.co', requestedBy: 'dueno@b.co', tier: 'MEDIO', includedUnits: 150, monthly: null, requestedAt: new Date('2026-11-09T21:33:56Z'), available: false, settingsUrl: 'https://app/setting', adminUrl: 'https://auth/home' };
    const v = noticeVariables(ctx);
    expect(v).toEqual(expect.objectContaining({ businessName: 'Arepas &lt;SAS&gt;', plan: 'Medio', includedUnits: '150' }));
    expect(v.availabilityText).toMatch(/te avisaremos/);
    expect(noticeVariables(ctx, true).availabilityText).toMatch(/en espera/);
  });

  it('al solicitar avisa a CycloNet (adminFactonet) y confirma al negocio, sin repetir correos', async () => {
    delete process.env.EINVOICING_PROVIDER;
    const sent: any[] = [];
    const rows: any[] = [];
    const repo = { findOne: jest.fn(async () => null), find: jest.fn(async () => []), create: (x: any) => x, save: jest.fn(async (x: any) => { rows.push(x); return x; }), count: jest.fn(async () => 0), createQueryBuilder: () => ({ where: () => ({ getCount: async () => 0 }) }) };
    const dataSource = { query: jest.fn(async (sql: string) => (sql.includes('adminFactonet') ? [{ email: 'admin@cyclonet.co' }, { email: 'ADMIN@cyclonet.co' }] : [{ email: 'ti.cyclonet.sas@gmail.com', business: 'Cyclonet S. A. S.' }])) };
    const notifications = { sendByTemplate: jest.fn(async (code: string, to: string) => { sent.push([code, to]); }) };
    const service = new EinvoicingService(repo as any, repo as any, repo as any, repo as any, dataSource as any, { findTenantLimits: async () => ({ contractId: 'c1' }) } as any, notifications as any);
    await service.requestAddon('t1', { tier: 'MEDIO', acceptTerms: true, requestedBy: 'ti.cyclonet.sas@gmail.com' });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(sent).toEqual([['EINVOICING_REQUEST_ADMIN', 'admin@cyclonet.co'], ['EINVOICING_REQUEST_RECEIVED', 'ti.cyclonet.sas@gmail.com']]);
  });

  it('al activarse avisa al negocio una sola vez', async () => {
    process.env.EINVOICING_PROVIDER = 'simulado';
    const sent: string[] = [];
    const addon: any = { tenantId: 't1', code: 'EINVOICING', tier: 'MEDIO', includedUnits: 150, status: 'SOLICITADO', monthlyValue: 89900, extraUnitValue: 350, requestedBy: 'dueno@tienda.co', requestedAt: new Date(), notifiedAt: null };
    const issuer: any = { tenantId: 't1', idType: '31', idNumber: '901565464', status: 'LISTO' };
    const addons = { findOne: jest.fn(async () => (addon.status === 'CANCELADO' ? null : addon)), save: jest.fn(async (x: any) => x) };
    const issuers = { findOne: jest.fn(async () => issuer), save: jest.fn(async (x: any) => x) };
    const dataSource = { query: jest.fn(async () => [{ email: 'dueno@tienda.co', business: 'Tienda' }]) };
    const notifications = { sendByTemplate: jest.fn(async (code: string, to: string) => { sent.push(`${code}:${to}`); }) };
    const service = new EinvoicingService(issuers as any, {} as any, {} as any, addons as any, dataSource as any, {} as any, notifications as any);
    expect(await service.maybeActivate('t1')).toBe(true);
    expect(sent).toEqual(['EINVOICING_ACTIVATED:dueno@tienda.co']);
    expect(addon.notifiedAt).toBeInstanceOf(Date);
    addon.status = 'SOLICITADO';
    await service.maybeActivate('t1');
    expect(sent).toHaveLength(1);
  });
});
