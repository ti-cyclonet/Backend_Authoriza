import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SelfRegistrationService } from './self-registration.service';

/**
 * Activar Shotra en una cuenta CycloNet existente, y el registro de Shotra con
 * un correo que ya existe: solo el dueño (con su contraseña) puede hacerlo, y
 * nunca se reactiva un acceso suspendido ni una cuenta desactivada.
 */
describe('SelfRegistrationService · Shotra con cuenta existente', () => {
  const PASSWORD = 'clave-correcta-123';
  let hash: string;
  const consents = { acceptTerms: true, acceptHabeasData: true, termsVersion: 't1', habeasDataVersion: 'h1' };

  /** Arma el servicio con lo justo: usuario, contratos/roles de Shotra y paquete FREE. */
  function setup(opts: {
    user?: any;
    shotraContracts?: { id: string; status: string }[];
    roles?: { status: string }[];
  }) {
    const userRepository = { findOne: jest.fn(async () => opts.user ?? null), save: jest.fn() };
    const packageRepository = { findOne: jest.fn(async () => ({ id: 'pkg-free', name: 'SHOTRA FREE' })) };
    const queries: string[] = [];
    const dataSource = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM contract c JOIN package')) return opts.shotraContracts ?? [];
        if (sql.includes('FROM user_roles ur WHERE ur."contractId"')) return opts.roles ?? [];
        return [];
      }),
      transaction: jest.fn(async (cb: any) => cb({
        createQueryBuilder: () => ({ innerJoin() { return this; }, where() { return this; }, andWhere() { return this; }, getOne: async () => null }),
        findOne: jest.fn(async () => null),
        create: jest.fn((_e: any, v: any) => v),
        save: jest.fn(async (v: any) => ({ ...v, id: 'contract-nuevo' })),
        query: jest.fn(async (sql: string) => { queries.push(sql); return []; }),
      })),
    };
    const consentsService = {
      assertAccepted: jest.fn((c: any) => { if (!c?.acceptTerms || !c?.acceptHabeasData) throw new Error('CONSENT_REQUIRED'); }),
      record: jest.fn(async () => undefined),
    };
    const service = new SelfRegistrationService(
      userRepository as any, {} as any, packageRepository as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      dataSource as any, { generateCode: jest.fn(async () => 'CTR-1') } as any, {} as any, {} as any, consentsService as any,
    );
    jest.spyOn(service as any, 'generateUniqueCodePrefix').mockResolvedValue('PRE');
    return { service, dataSource, consentsService, queries };
  }

  beforeAll(async () => { hash = await bcrypt.hash(PASSWORD, 4); });

  const verifiedUser = () => ({ id: 'u1', strUserName: 'ana@x.co', strPassword: hash, isVerified: true, strStatus: 'ACTIVE' });

  describe('activateShotraForExistingUser', () => {
    it('contraseña errada → 401 y no registra términos ni crea contrato', async () => {
      const { service, consentsService, dataSource } = setup({ user: verifiedUser() });
      await expect(service.activateShotraForExistingUser({ email: 'ana@x.co', password: 'otra', ...consents }))
        .rejects.toBeInstanceOf(UnauthorizedException);
      expect(consentsService.record).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('correo inexistente → el mismo 401 (no revela cuentas)', async () => {
      const { service } = setup({ user: null });
      await expect(service.activateShotraForExistingUser({ email: 'nadie@x.co', password: PASSWORD, ...consents }))
        .rejects.toThrow('Correo o contraseña incorrectos.');
    });

    it('sin aceptar los términos → no sigue', async () => {
      const { service, dataSource } = setup({ user: verifiedUser() });
      await expect(service.activateShotraForExistingUser({ email: 'ana@x.co', password: PASSWORD } as any)).rejects.toThrow();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('acceso a Shotra suspendido → 403 y no lo reactiva', async () => {
      const { service, consentsService, dataSource } = setup({
        user: verifiedUser(), shotraContracts: [{ id: 'c1', status: 'SUSPENDED' }],
      });
      await expect(service.activateShotraForExistingUser({ email: 'ana@x.co', password: PASSWORD, ...consents }))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(consentsService.record).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rol de Shotra desactivado (contrato activo) → 403', async () => {
      const { service } = setup({
        user: verifiedUser(), shotraContracts: [{ id: 'c1', status: 'ACTIVE' }], roles: [{ status: 'INACTIVE' }],
      });
      await expect(service.activateShotraForExistingUser({ email: 'ana@x.co', password: PASSWORD, ...consents }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('cuenta CycloNet desactivada → 403', async () => {
      const { service } = setup({ user: { ...verifiedUser(), strStatus: 'INACTIVE' } });
      await expect(service.activateShotraForExistingUser({ email: 'ana@x.co', password: PASSWORD, ...consents }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('todo bien → registra términos (SHOTRA_ACTIVATE), crea el contrato y no fuerza ACTIVE a cualquier cuenta', async () => {
      const { service, consentsService, dataSource, queries } = setup({ user: verifiedUser() });
      const r = await service.activateShotraForExistingUser({ email: 'ana@x.co', password: PASSWORD, ...consents });
      expect(r.success).toBe(true);
      expect(consentsService.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', application: 'Shotra', source: 'SHOTRA_ACTIVATE' }));
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const statusUpdate = queries.find((q) => q.includes('"strStatus" = \'ACTIVE\''));
      expect(statusUpdate).toContain("IN ('UNCONFIRMED', 'CONFIRMED')");
    });
  });

  describe('registerShotraUser con un correo que ya existe', () => {
    const form = { email: 'ana@x.co', firstName: 'Ana', firstSurname: 'Ruiz', phone: '3001234567', ...consents };

    it('contraseña distinta → 409 ACCOUNT_EXISTS, sin términos ni contrato', async () => {
      const { service, consentsService, dataSource } = setup({ user: verifiedUser() });
      await expect(service.registerShotraUser({ ...form, password: 'otra' })).rejects.toBeInstanceOf(ConflictException);
      expect(consentsService.record).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('su misma contraseña → habilita Shotra', async () => {
      const { service, dataSource } = setup({ user: verifiedUser() });
      const r = await service.registerShotraUser({ ...form, password: PASSWORD });
      expect(r.verificationRequired).toBe(false);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('su contraseña pero acceso suspendido → 403 (antes lo reactivaba)', async () => {
      const { service, dataSource } = setup({ user: verifiedUser(), shotraContracts: [{ id: 'c1', status: 'CANCELLED' }] });
      await expect(service.registerShotraUser({ ...form, password: PASSWORD })).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
