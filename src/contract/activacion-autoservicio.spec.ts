import { ContractService } from './contract.service';
import { ContractStatus } from './enums/contract-status.enum';

/**
 * Autoservicio (exclusión de IVA, computación en la nube): la firma del
 * cliente activa el contrato; la del administrador es una contrafirma.
 */
describe('ContractService · activación con la firma del cliente', () => {
  const OWNER = { id: 'u-1', strUserName: 'dueno@tienda.co', isVerified: true };
  let contract: any;
  let service: ContractService;
  let sentTemplates: string[];

  beforeEach(() => {
    sentTemplates = [];
    contract = {
      id: 'c-1', code: 'CT-9', status: ContractStatus.PENDING, pdfUrl: 'https://pdf', issuedAt: new Date(),
      user: OWNER, package: { name: 'CN-01 PRO', targetApplication: 'Inout', usageLimitVariables: [] },
    };
    const contractRepository: any = {
      findOne: jest.fn(async () => contract),
      save: jest.fn(async (c: any) => Object.assign(contract, c)),
      createQueryBuilder: jest.fn(() => {
        const qb: any = { innerJoin: () => qb, where: () => qb, andWhere: () => qb, getMany: async () => [], update: () => qb, set: () => qb, whereInIds: () => qb, execute: async () => undefined };
        return qb;
      }),
      manager: { query: jest.fn() },
    };
    const userRepository: any = {
      findOne: jest.fn(async () => ({ ...OWNER, isAuthorizedSigner: true })),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        const qb: any = { update: () => qb, set: () => qb, where: () => qb, execute: async () => undefined, innerJoin: () => qb, andWhere: () => qb, getMany: async () => [] };
        return qb;
      }),
    };
    const notifications: any = { sendByTemplate: jest.fn(async (t: string) => { sentTemplates.push(t); }) };
    service = new ContractService(contractRepository, userRepository, {} as any, { findOne: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, notifications);
    (global as any).fetch = jest.fn(async () => ({ ok: true }));
  });

  it('el cliente firma y el contrato queda ACTIVE sin esperar al administrador', async () => {
    const r = await service.signAsClient('c-1', 'Dueño', '1.1.1.1', OWNER.id);
    expect(r.status).toBe(ContractStatus.ACTIVE);
    expect(r.adminSignedAt).toBeUndefined();
    expect(r.endDate).toBeInstanceOf(Date);
  });

  it('la contrafirma del administrador no cambia un contrato ya activo', async () => {
    await service.signAsClient('c-1', 'Dueño', '1.1.1.1', OWNER.id);
    const startDate = contract.startDate;
    const r = await service.signAsAdmin('c-1', 'Admin', '2.2.2.2', 'admin-1');
    expect(r.status).toBe(ContractStatus.ACTIVE);
    expect(r.adminSignedAt).toBeInstanceOf(Date);
    expect(contract.startDate).toBe(startDate);
  });

  it('al verificar el correo invita a firmar aunque el PDF aún no exista', async () => {
    contract.pdfUrl = null;
    await service.sendContractOnVerification(OWNER.id);
    expect(sentTemplates).toEqual(['CONTRACT_READY']);
  });

  it('no invita si el cliente ya firmó', async () => {
    contract.clientSignedAt = new Date();
    await service.sendContractOnVerification(OWNER.id);
    expect(sentTemplates).toEqual([]);
  });
});
