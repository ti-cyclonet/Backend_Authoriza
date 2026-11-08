import { SelfRegistrationService } from './self-registration.service';

/**
 * Los avisos de contratos nuevos / mejoras de plan / planes gratis van solo a
 * quienes tienen el rol adminFactonet. Antes también les llegaban a todos los
 * dependientes de esos usuarios (p. ej. un dependiente con solo adminKiri).
 */
describe('Destinatarios de los avisos de contratos', () => {
  it('solo usuarios con adminFactonet activo, sin repetir y sin consultar dependientes', async () => {
    const qb: any = {};
    ['innerJoin', 'where', 'andWhere'].forEach((m) => (qb[m] = jest.fn(() => qb)));
    qb.getMany = jest.fn(async () => [{ strUserName: 'admin@cyclonet.co' }, { strUserName: 'admin@cyclonet.co' }]);
    const service = Object.create(SelfRegistrationService.prototype);
    service.userRepository = { createQueryBuilder: jest.fn(() => qb) };

    await expect(service.adminFactonetEmails()).resolves.toEqual(['admin@cyclonet.co']);
    expect(service.userRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(qb.innerJoin).not.toHaveBeenCalledWith('user_dependencies', expect.anything(), expect.anything());
    expect(qb.where).toHaveBeenCalledWith('r."strName" = :roleName', { roleName: 'adminFactonet' });
  });
});
