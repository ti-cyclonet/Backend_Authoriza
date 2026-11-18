// auth.constants exige JWT_SECRET al importar: se define antes de cargar el controlador
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-esta-prueba';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthController } = require('./auth.controller');

/**
 * /auth/upgrade-plan es pública (email + contraseña). El descuento de la
 * primera factura solo lo puede pedir el backend de Kiri con x-internal-key:
 * sin la clave, se ignora aunque venga en el cuerpo.
 */
describe('AuthController.upgradePlan · descuento de invitado', () => {
  const CLAVE = 'clave-interna-de-prueba-1234567890';
  let recibido: number | undefined;
  const selfRegistration = { upgradePlan: jest.fn(async (...args: any[]) => { recibido = args[6]; return { success: true }; }) };
  const controller = new AuthController({} as any, selfRegistration as any, {} as any, {} as any);
  const req = (headers: Record<string, string>) => ({ headers, ip: '1.1.1.1', socket: {} }) as any;
  const body = { email: 'a@b.co', password: 'x', packageId: 'p', billingCycle: 'monthly' as const, firstInvoiceDiscountPct: 50 };

  beforeAll(() => { process.env.INTERNAL_API_KEY = CLAVE; });

  it('con la clave interna de Kiri → pasa el 50%', async () => {
    await controller.upgradePlan(body, req({ 'x-internal-key': CLAVE }));
    expect(recibido).toBe(50);
  });

  it('sin clave (alguien llamando directo) → 0%', async () => {
    await controller.upgradePlan(body, req({}));
    expect(recibido).toBe(0);
  });

  it('con una clave equivocada → 0%', async () => {
    await controller.upgradePlan(body, req({ 'x-internal-key': 'otra-clave-cualquiera-12345678' }));
    expect(recibido).toBe(0);
  });
});

/**
 * /auth/internal/upgrade-plan (2026-11): Kiri cambia el plan con la sesión de Kiri,
 * sin contraseña. La ruta tiene InternalKeyGuard; aquí se revisa que pase el
 * descuento y el ciclo, y que el servicio exija los consentimientos.
 */
describe('Cambio de plan interno desde Kiri (sin contraseña)', () => {
  it('el controlador pasa correo, plan, ciclo y descuento al servicio', async () => {
    const llamado: any[] = [];
    const selfRegistration = { upgradePlanInternal: jest.fn(async (...args: any[]) => { llamado.push(...args); return { success: true }; }) };
    const controller = new AuthController({} as any, selfRegistration as any, {} as any, {} as any);
    await controller.upgradePlanInternal({ email: 'a@b.co', packageId: 'p', billingCycle: 'annual', firstInvoiceDiscountPct: 30 } as any, { headers: {}, ip: '1.1.1.1', socket: {} } as any);
    expect(llamado[0]).toBe('a@b.co');
    expect(llamado[1]).toBe('p');
    expect(llamado[4]).toBe('annual');
    expect(llamado[5]).toBe(30);
  });

  it('la ruta exige la clave interna (InternalKeyGuard)', () => {
    const guards = Reflect.getMetadata('__guards__', AuthController.prototype.upgradePlanInternal) || [];
    expect(guards.map((g: any) => g.name)).toContain('InternalKeyGuard');
  });
});
