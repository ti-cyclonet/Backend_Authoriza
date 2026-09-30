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
