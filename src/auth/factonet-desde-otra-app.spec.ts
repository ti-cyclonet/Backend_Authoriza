process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-esta-prueba';
import { SelfRegistrationService } from './self-registration.service';
import { ContractStatus } from '../contract/enums/contract-status.enum';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthService } = require('./auth.service');

/**
 * Un cliente que ya usa InOut (y paga con FactoNet) agrega la contabilidad de
 * FactoNet desde la app: contrato nuevo en el mismo titular (mismo tenant), su
 * plan de InOut sigue igual, recibe empresaFactonet y el primer mes es gratis.
 */
describe('Cliente de otra app que contrata la contabilidad de FactoNet', () => {
  const OWNER = { id: 'u-1', strUserName: 'duena@tienda.co' };
  const INOUT_PRO = { id: 'pkg-inout', name: 'CN-01 PRO', price: 85000, isBillable: true, targetApplication: 'Inout', showInLanding: true };
  const FN_INICIA = { id: 'pkg-fn', name: 'FACTONET INICIA', price: 59000, isBillable: true, targetApplication: 'FactoNet', showInLanding: true, usageLimitVariables: [] };
  const consents = { acceptTerms: true, acceptHabeasData: true, termsVersion: 't', habeasDataVersion: 'd' };

  let savedContracts: any[];
  let savedRoles: any[];
  let previousFactonet: number;
  let service: SelfRegistrationService;

  beforeEach(() => {
    savedContracts = [];
    savedRoles = [];
    previousFactonet = 0;
    const inoutContract = { id: 'c-inout', code: 'CT-1', status: ContractStatus.ACTIVE, codePrefix: 'TIE', user: OWNER, package: INOUT_PRO };
    const contractRepository = {
      findOne: jest.fn(async (opts: any) => {
        if (opts.where?.id) return { id: opts.where.id, user: OWNER, package: FN_INICIA };
        if (opts.where?.package?.targetApplication === 'FactoNet') return null;
        return inoutContract;
      }),
      find: jest.fn(async () => []),
      count: jest.fn(async (opts: any) => (opts?.where?.package?.targetApplication ? previousFactonet : 1)),
      create: jest.fn((c: any) => c),
      save: jest.fn(async (c: any) => { savedContracts.push(c); return { ...c, id: 'c-fn' }; }),
      update: jest.fn(),
      manager: { createQueryBuilder: () => ({ where: () => ({ getOne: async () => null }) }) },
    };
    const repo = (value: any) => ({ findOne: jest.fn(async () => value), save: jest.fn(), create: jest.fn((x: any) => x) });
    const rolRepository = { findOne: jest.fn(async (o: any) => ({ id: `r-${o.where.strName}`, strName: o.where.strName })) };
    const userRoleRepository = { findOne: jest.fn(async () => null), create: jest.fn((x: any) => x), save: jest.fn(async (x: any) => { savedRoles.push(x); return x; }) };
    service = new SelfRegistrationService(
      repo(OWNER) as any, contractRepository as any, { findOne: jest.fn(async () => FN_INICIA) } as any, repo(null) as any,
      userRoleRepository as any, rolRepository as any, {} as any, {} as any, {} as any,
      { generateCode: jest.fn(async () => 'CT-2') } as any,
      { sendByTemplate: jest.fn() } as any, { info: jest.fn() } as any,
      { hasConsents: () => true, record: jest.fn() } as any,
    );
    (service as any).notifyAdminFactonetUpgrade = jest.fn(async () => undefined);
  });

  it('crea un contrato nuevo de FactoNet (no toca el de InOut), con mes gratis y rol de empresa', async () => {
    await service.upgradePlanFromApp({ id: OWNER.id, rol: 'adminInvoices' }, FN_INICIA.id, consents, {});
    const fn = savedContracts.find((c) => c.package?.id === FN_INICIA.id);
    expect(fn).toEqual(expect.objectContaining({ user: { id: OWNER.id }, freeMonthsCredit: 1 }));
    expect(savedContracts.some((c) => c.id === 'c-inout')).toBe(false);
    expect(savedRoles).toContainEqual(expect.objectContaining({ userId: OWNER.id, roleId: 'r-empresaFactonet', contractId: 'c-fn', status: 'ACTIVE' }));
  });

  it('si ya tuvo FactoNet antes, no hay otro mes gratis', async () => {
    previousFactonet = 1;
    await service.upgradePlanFromApp({ id: OWNER.id, rol: 'adminInvoices' }, FN_INICIA.id, consents, {});
    expect(savedContracts.find((c) => c.package?.id === FN_INICIA.id).freeMonthsCredit).toBe(0);
  });

  it('al entrar a FactoNet prefiere el rol de empresa sobre el de cliente del mismo titular', () => {
    const roles = [
      { role: { strName: 'adminInvoices' }, contract: { user: { id: 'u-1' } } },
      { role: { strName: 'empresaFactonet' }, contract: { user: { id: 'u-1' } } },
      { role: { strName: 'adminInvoices' }, contract: { user: { id: 'otro' } } },
    ];
    expect(AuthService.preferFactonetCompany(roles).map((r: any) => `${r.role.strName}:${r.contract.user.id}`)).toEqual(['empresaFactonet:u-1', 'adminInvoices:otro']);
    expect(AuthService.preferFactonetCompany(roles.slice(0, 1))).toHaveLength(1);
  });
});
