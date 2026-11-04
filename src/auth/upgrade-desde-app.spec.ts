import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SelfRegistrationService } from './self-registration.service';
import { ContractStatus } from '../contract/enums/contract-status.enum';

/**
 * Cambio de plan desde InOut (/auth/plan/upgrade): solo el administrador, a un
 * plan de la landing, y sin dejar la cuenta sin plan mientras se firma el
 * nuevo contrato (el actual sigue ACTIVE; el nuevo nace PENDING).
 */
describe('SelfRegistrationService.upgradePlanFromApp', () => {
  const OWNER = { id: 'u-1', strUserName: 'duena@tienda.co' };
  const FREE = { id: 'pkg-free', name: 'INOUT FREE', price: 0, isBillable: false, targetApplication: 'Inout', showInLanding: true };
  const PRO = { id: 'pkg-pro', name: 'INOUT PRO', price: 90000, isBillable: true, targetApplication: 'Inout', showInLanding: true, usageLimitVariables: [] };
  const consents = { acceptTerms: true, acceptHabeasData: true, termsVersion: 't', habeasDataVersion: 'd' };

  let saved: any[];
  let updated: any[];
  let pendings: any[];
  let service: SelfRegistrationService;

  beforeEach(() => {
    saved = [];
    updated = [];
    pendings = [];
    const active = { id: 'c-free', code: 'CT-1', status: ContractStatus.ACTIVE, codePrefix: 'TIE', businessSector: 'restaurante', user: OWNER, package: FREE };
    const contractRepository = {
      findOne: jest.fn(async (opts: any) => (opts.where?.id ? { id: opts.where.id, user: OWNER, package: PRO } : active)),
      find: jest.fn(async () => pendings),
      count: jest.fn(async () => 1),
      create: jest.fn((c: any) => c),
      save: jest.fn(async (c: any) => { saved.push(c); return { ...c, id: 'c-new' }; }),
      update: jest.fn(async (ids: any, patch: any) => { updated.push({ ids, patch }); }),
      manager: {},
    };
    const repo = (value: any) => ({ findOne: jest.fn(async () => value), save: jest.fn(), create: jest.fn((x: any) => x) });
    const packageRepository = { findOne: jest.fn(async (opts: any) => (opts.where.id === PRO.id ? PRO : FREE)) };
    service = new SelfRegistrationService(
      repo(OWNER) as any, contractRepository as any, packageRepository as any, repo(null) as any,
      repo(null) as any, repo(null) as any, {} as any, {} as any, {} as any,
      { generateCode: jest.fn(async () => 'CT-2') } as any,
      { sendByTemplate: jest.fn() } as any, { info: jest.fn() } as any,
      { hasConsents: (c: any) => !!c?.acceptTerms && !!c?.acceptHabeasData, record: jest.fn() } as any,
    );
    (service as any).notifyAdminFactonetUpgrade = jest.fn(async () => undefined);
  });

  it('un operador no puede cambiar el plan', async () => {
    await expect(service.upgradePlanFromApp({ id: OWNER.id, rol: 'operatorInout' }, PRO.id, consents, {}))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige aceptar Términos y datos', async () => {
    await expect(service.upgradePlanFromApp({ id: OWNER.id, rol: 'adminInout' }, PRO.id, {}, {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea un contrato PENDING nuevo y deja el actual ACTIVE, con su prefijo y sector', async () => {
    const res: any = await service.upgradePlanFromApp({ id: OWNER.id, rol: 'adminInout' }, PRO.id, consents, {});
    expect(res.pendingActivation).toBe(true);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ status: ContractStatus.PENDING, codePrefix: 'TIE', businessSector: 'restaurante', package: { id: PRO.id } });
    // El contrato actual no se tocó
    expect(updated.find((u) => u.ids === 'c-free' || (Array.isArray(u.ids) && u.ids.includes('c-free')))).toBeUndefined();
  });

  it('reemplaza un cambio anterior que nadie había firmado', async () => {
    pendings = [{ id: 'c-old', code: 'CT-0', status: ContractStatus.PENDING, package: PRO }];
    await service.upgradePlanFromApp({ id: OWNER.id, rol: 'adminInout' }, PRO.id, consents, {});
    expect(updated).toContainEqual({ ids: ['c-old'], patch: { status: ContractStatus.CANCELLED } });
  });

  it('no deja pedir otro cambio si el anterior ya está en firma', async () => {
    pendings = [{ id: 'c-old', code: 'CT-0', status: ContractStatus.PENDING, adminSignedAt: new Date(), package: PRO }];
    await expect(service.upgradePlanFromApp({ id: OWNER.id, rol: 'adminInout' }, PRO.id, consents, {}))
      .rejects.toThrow(/en firma/);
  });
});
