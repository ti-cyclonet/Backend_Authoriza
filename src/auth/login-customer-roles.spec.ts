process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-esta-prueba';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthService } = require('./auth.service');

/**
 * Ser cliente del MarketPlace de otro negocio (clienteInout) no debe obligar a
 * un usuario de staff a elegir empresa al entrar al panel de InOut.
 */
describe('AuthService.validateUser · roles de cliente del MarketPlace', () => {
  const PASSWORD = 'Clave123*';
  let hash: string;
  const owner = (id: string, businessName: string) => ({ id, basicData: { strPersonType: 'J', legalEntityData: { businessName } } });
  const role = (strName: string, contractId: string | null, ownerUser: any = null) => ({
    status: 'ACTIVE', role: { strName }, contractId,
    contract: contractId ? { user: ownerUser, package: { name: 'P' }, codePrefix: 'CYC' } : null,
  });
  const service = (userRoles: any[]) => new AuthService(
    { sign: jest.fn(() => 'token') } as any,
    { findRolesByApplicationName: jest.fn(async () => ['adminInout', 'operatorInout', 'viewerInout', 'clienteInout']) } as any,
    {
      findEntityByEmail: jest.fn(async () => ({ id: 'u1', strUserName: 'admin@x.co', strPassword: hash, strStatus: 'ACTIVE', userRoles, principals: [] })),
      isUserAuthorizedSigner: jest.fn(async () => false),
    } as any,
    { info: jest.fn() } as any,
  );
  const login = (s: any) => s.validateUser({ email: 'admin@x.co', password: PASSWORD, applicationName: 'INOUT' });

  beforeAll(async () => { hash = await bcrypt.hash(PASSWORD, 4); });

  it('admin de su empresa y cliente de otra → entra directo como admin', async () => {
    const r = await login(service([
      role('adminInout', 'c-propio', owner('u1', 'Cyclonet S. A. S.')),
      role('clienteInout', 'c-otro', owner('u2', 'Cyclonet [PRUEBAS]')),
    ]));
    expect(r.contracts).toBeUndefined();
    expect(r.user.rol).toBe('adminInout');
    expect(r.access_token).toBe('token');
  });

  it('staff en dos empresas → sigue pidiendo elegir', async () => {
    const r = await login(service([
      role('adminInout', 'c1', owner('u1', 'A')),
      role('operatorInout', 'c2', owner('u2', 'B')),
    ]));
    expect(r.contracts).toHaveLength(2);
  });

  it('solo cliente en dos tiendas → se conserva el comportamiento (elige)', async () => {
    const r = await login(service([
      role('clienteInout', 'c1', owner('u2', 'A')),
      role('clienteInout', 'c2', owner('u3', 'B')),
    ]));
    expect(r.contracts).toHaveLength(2);
  });
});
