import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
// users.service usa rutas 'src/...' que jest no resuelve: no hace falta aquí
jest.mock('./users.service', () => ({ UsersService: class {} }));
jest.mock('../mail/mail.service', () => ({ MailService: class {} }));
import { PasswordRecoveryService } from './password-recovery.service';

const sha = (t: string) => createHash('sha256').update(t).digest('hex');

function setup(user: any) {
  const repo: any = {
    findOne: jest.fn().mockResolvedValue(user),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(() => {
      const qb: any = { addSelect: () => qb, where: (_: string, p: any) => { qb.h = p.h; return qb; }, getOne: async () => (user && user.strResetTokenHash === qb.h ? user : null) };
      return qb;
    }),
  };
  const users: any = { setPasswordByEmail: jest.fn().mockResolvedValue({ message: 'ok' }) };
  const mail: any = { send: jest.fn().mockResolvedValue(true) };
  return { svc: new PasswordRecoveryService(repo, users, mail), repo, users, mail };
}

describe('PasswordRecoveryService', () => {
  it('no revela si el correo no existe', async () => {
    const { svc, mail } = setup(null);
    const r = await svc.forgot('nadie@x.com', 'inout');
    expect(r.message).toBe(PasswordRecoveryService.GENERIC_MESSAGE);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('envía un enlace con token y guarda solo su hash', async () => {
    const { svc, repo, mail } = setup({ id: 'u1', strUserName: 'a@x.com', strStatus: 'ACTIVE' });
    await svc.forgot('a@x.com', 'factonet');
    const html: string = mail.send.mock.calls[0][2];
    const token = /reset-password\?token=([a-f0-9]{64})/.exec(html)![1];
    expect(repo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ strResetTokenHash: sha(token) }));
    expect(html).not.toContain('a%40x.com');
  });

  it('no reenvía si el último enlace se pidió hace menos de un minuto', async () => {
    const { svc, mail } = setup({ id: 'u1', strUserName: 'a@x.com', dtmResetTokenExpires: new Date(Date.now() + 60 * 60 * 1000 - 10_000) });
    await svc.forgot('a@x.com');
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('restablece con un token vigente y lo invalida', async () => {
    const token = 'a'.repeat(64);
    const { svc, repo, users } = setup({ id: 'u1', strUserName: 'a@x.com', strResetTokenHash: sha(token), dtmResetTokenExpires: new Date(Date.now() + 1000) });
    await svc.reset(token, 'nueva123');
    expect(users.setPasswordByEmail).toHaveBeenCalledWith('a@x.com', 'nueva123');
    expect(repo.update).toHaveBeenCalledWith('u1', { strResetTokenHash: null, dtmResetTokenExpires: null });
  });

  it('rechaza un token vencido o desconocido', async () => {
    const token = 'b'.repeat(64);
    const { svc } = setup({ id: 'u1', strUserName: 'a@x.com', strResetTokenHash: sha(token), dtmResetTokenExpires: new Date(Date.now() - 1000) });
    await expect(svc.reset(token, 'nueva123')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.reset('c'.repeat(64), 'nueva123')).rejects.toBeInstanceOf(BadRequestException);
  });
});
