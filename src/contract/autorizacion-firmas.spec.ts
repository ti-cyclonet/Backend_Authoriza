import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { ContractStatus } from './enums/contract-status.enum';

/**
 * Firmas, PDF y emisión de contratos: quien actúa es siempre el usuario del
 * JWT. Antes cualquiera podía mandar el userId de un firmante autorizado en el
 * body (u omitirlo) y contrafirmar, o reemplazar el PDF de otro cliente.
 */
describe('ContractService · autorización de firmas, PDF y emisión', () => {
  const OWNER = { id: 'owner-1', strUserName: 'dueno@tienda.co', isVerified: true };
  const ADMIN_ID = 'admin-1';
  const DEPENDENT_ID = 'dep-1';
  const STRANGER_ID = 'stranger-1';

  let contract: any;
  let service: ContractService;
  let contractRepository: any;
  let roles: Record<string, string[]>; // userId -> roles activos
  let users: Record<string, any>;
  let dependencies: any[];
  let cloudinary: any;

  beforeEach(() => {
    contract = {
      id: 'c-1', code: 'CT-9', status: ContractStatus.PENDING, pdfUrl: 'https://pdf', issuedAt: new Date(),
      user: OWNER, package: { name: 'CN-01 PRO', targetApplication: 'Inout', usageLimitVariables: [] },
    };
    roles = { [ADMIN_ID]: ['adminFactonet'] };
    users = { [ADMIN_ID]: { id: ADMIN_ID, isAuthorizedSigner: true }, [OWNER.id]: { ...OWNER } };
    dependencies = [
      { principalUserId: OWNER.id, dependentUserId: DEPENDENT_ID, status: 'ACTIVE', isAuthorizedSigner: true },
    ];

    contractRepository = {
      findOne: jest.fn(async () => contract),
      save: jest.fn(async (c: any) => Object.assign(contract, c)),
      createQueryBuilder: jest.fn(() => {
        const qb: any = { innerJoin: () => qb, where: () => qb, andWhere: () => qb, getMany: async () => [], update: () => qb, set: () => qb, whereInIds: () => qb, execute: async () => undefined };
        return qb;
      }),
      manager: { query: jest.fn() },
    };

    const userRepository: any = {
      findOne: jest.fn(async ({ where }: any) => users[where.id] ?? null),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        const params: any = {};
        const qb: any = {
          update: () => qb, set: () => qb, execute: async () => undefined, innerJoin: () => qb, getMany: async () => [],
          where: (_: string, p?: any) => { Object.assign(params, p); return qb; },
          andWhere: (_: string, p?: any) => { Object.assign(params, p); return qb; },
          getCount: async () => ((roles[params.userId] || []).includes(params.roleName) ? 1 : 0),
        };
        return qb;
      }),
    };

    const userDependencyRepository: any = {
      findOne: jest.fn(async ({ where }: any) =>
        dependencies.find((d) => Object.entries(where).every(([k, v]) => d[k] === v)) ?? null),
    };

    cloudinary = {
      deletePDFByUrl: jest.fn(async () => undefined),
      uploadPDF: jest.fn(async () => ({ secure_url: 'https://pdf/nuevo' })),
    };
    const notifications: any = { sendByTemplate: jest.fn(async () => undefined) };

    service = new ContractService(
      contractRepository, userRepository, {} as any, userDependencyRepository,
      {} as any, cloudinary, {} as any, {} as any, notifications,
    );
    (global as any).fetch = jest.fn(async () => ({ ok: true }));
  });

  describe('sign-admin', () => {
    it('un adminFactonet firmante autorizado contrafirma', async () => {
      const r = await service.signAsAdmin('c-1', 'Admin', '2.2.2.2', ADMIN_ID);
      expect(r.adminSignedAt).toBeInstanceOf(Date);
    });

    it('sin usuario autenticado se rechaza', async () => {
      await expect(service.signAsAdmin('c-1', 'X', 'ip', undefined)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(contractRepository.save).not.toHaveBeenCalled();
    });

    it('el dueño del contrato no puede contrafirmar como CycloNet', async () => {
      users[OWNER.id].isAuthorizedSigner = true; // firmante en su propia cuenta, pero sin rol admin
      await expect(service.signAsAdmin('c-1', 'X', 'ip', OWNER.id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(contract.adminSignedAt).toBeUndefined();
    });

    it('un adminFactonet que no es firmante autorizado no firma', async () => {
      users[ADMIN_ID].isAuthorizedSigner = false;
      await expect(service.signAsAdmin('c-1', 'X', 'ip', ADMIN_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un adminFactonet firmante vía su dependencia activa sí firma', async () => {
      users[ADMIN_ID].isAuthorizedSigner = false;
      dependencies.push({ principalUserId: 'cyclonet', dependentUserId: ADMIN_ID, status: 'ACTIVE', isAuthorizedSigner: true });
      const r = await service.signAsAdmin('c-1', 'Admin', 'ip', ADMIN_ID);
      expect(r.adminSignedAt).toBeInstanceOf(Date);
    });
  });

  describe('sign-client', () => {
    it('el dueño firma y el contrato se activa', async () => {
      const r = await service.signAsClient('c-1', 'Dueño', 'ip', OWNER.id);
      expect(r.status).toBe(ContractStatus.ACTIVE);
      expect(r.clientSignedByUserId).toBe(OWNER.id);
    });

    it('un dependiente firmante autorizado del dueño firma', async () => {
      const r = await service.signAsClient('c-1', 'Dependiente', 'ip', DEPENDENT_ID);
      expect(r.clientSignedByUserId).toBe(DEPENDENT_ID);
      expect(r.status).toBe(ContractStatus.ACTIVE);
    });

    it('un dependiente sin autorización de firma no firma', async () => {
      dependencies[0].isAuthorizedSigner = false;
      await expect(service.signAsClient('c-1', 'X', 'ip', DEPENDENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(contract.status).toBe(ContractStatus.PENDING);
    });

    it('un usuario ajeno al contrato no firma (ni siendo adminFactonet)', async () => {
      await expect(service.signAsClient('c-1', 'X', 'ip', STRANGER_ID)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.signAsClient('c-1', 'X', 'ip', ADMIN_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(contract.clientSignedAt).toBeUndefined();
    });

    it('sin usuario autenticado se rechaza (antes se aceptaba sin validar)', async () => {
      await expect(service.signAsClient('c-1', 'X', 'ip', null)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(contract.status).toBe(ContractStatus.PENDING);
    });
  });

  describe('subir PDF', () => {
    it.each([
      ['el dueño', OWNER.id],
      ['un dependiente firmante autorizado', DEPENDENT_ID],
      ['un adminFactonet', ADMIN_ID],
    ])('%s puede subirlo', async (_: string, userId: string) => {
      await expect(service.uploadContractPDF('c-1', Buffer.from('pdf'), userId)).resolves.toBe('https://pdf/nuevo');
    });

    it('otro cliente no puede reemplazar el PDF', async () => {
      await expect(service.uploadContractPDF('c-1', Buffer.from('pdf'), STRANGER_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(cloudinary.deletePDFByUrl).not.toHaveBeenCalled();
      expect(cloudinary.uploadPDF).not.toHaveBeenCalled();
      expect(contract.pdfUrl).toBe('https://pdf');
    });

    it('sin usuario autenticado se rechaza', async () => {
      await expect(service.uploadContractPDF('c-1', Buffer.from('pdf'), undefined)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(cloudinary.uploadPDF).not.toHaveBeenCalled();
    });
  });

  describe('emitir', () => {
    it('un adminFactonet emite', async () => {
      const r = await service.issueContract('c-1', ADMIN_ID);
      expect(r.issuedAt).toBeInstanceOf(Date);
    });

    it('el dueño del contrato no puede emitirlo', async () => {
      await expect(service.issueContract('c-1', OWNER.id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(contractRepository.save).not.toHaveBeenCalled();
    });
  });
});

describe('ContractController · el firmante sale del JWT', () => {
  const contractService: any = {
    signAsAdmin: jest.fn(async () => ({})),
    signAsClient: jest.fn(async () => ({})),
    issueContract: jest.fn(async () => ({})),
    uploadContractPDF: jest.fn(async () => 'https://pdf'),
  };
  const controller = new ContractController(contractService);
  const req = (userId?: string) => ({ headers: {}, ip: '9.9.9.9', user: userId ? { id: userId } : undefined });

  beforeEach(() => jest.clearAllMocks());

  it('sign-admin ignora el userId del body', async () => {
    await controller.signAsAdmin('c-1', { signedBy: 'X', userId: 'admin-autorizado' } as any, req('atacante'));
    expect(contractService.signAsAdmin).toHaveBeenCalledWith('c-1', 'X', '9.9.9.9', 'atacante');
  });

  it('sign-client ignora el userId del body', async () => {
    await controller.signAsClient('c-1', { signedBy: 'X', userId: 'dueno' } as any, req('atacante'));
    expect(contractService.signAsClient).toHaveBeenCalledWith('c-1', 'X', '9.9.9.9', 'atacante');
  });

  it('sin JWT pasa undefined (el servicio lo rechaza)', async () => {
    await controller.signAsAdmin('c-1', { signedBy: 'X', userId: 'admin-autorizado' } as any, req());
    expect(contractService.signAsAdmin).toHaveBeenCalledWith('c-1', 'X', '9.9.9.9', undefined);
  });

  it('issue y pdf pasan el usuario del JWT', async () => {
    await controller.issueContract('c-1', req('admin-1'));
    expect(contractService.issueContract).toHaveBeenCalledWith('c-1', 'admin-1');
    await controller.uploadPDF('c-1', { pdfBuffer: Buffer.from('x').toString('base64') }, req('owner-1'));
    expect(contractService.uploadContractPDF).toHaveBeenCalledWith('c-1', expect.any(Buffer), 'owner-1');
  });
});
