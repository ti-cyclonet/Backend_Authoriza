import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';

/** Apps con pantalla de "restablecer contraseña" (el enlace del correo va a la suya). */
const APP_LOGIN_URLS: Record<string, () => string> = {
  inout: () => process.env.INOUT_LOGIN_URL || 'http://localhost:4201/login',
  factonet: () => process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login',
  // Sin AUTHORIZA_LOGIN_URL: en producción (las otras URLs apuntan a cyclonet.com.co) va a auth.cyclonet.com.co
  authoriza: () => process.env.AUTHORIZA_LOGIN_URL
    || ((process.env.INOUT_LOGIN_URL || '').includes('cyclonet.com.co') ? 'https://auth.cyclonet.com.co/login' : 'http://localhost:4200/login'),
};
const APP_NAMES: Record<string, string> = { inout: 'InOut', factonet: 'FactoNet', authoriza: 'Authoriza' };

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const RESEND_WAIT_MS = 60 * 1000; // un correo por minuto por cuenta

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * "¿Olvidaste tu contraseña?" para InOut, FactoNet y Authoriza.
 *
 * 1. forgot: envía al correo un enlace con un token aleatorio de un solo uso
 *    (1 hora). Se guarda solo su SHA-256. La respuesta es la misma exista o
 *    no la cuenta, para no revelar qué correos están registrados.
 * 2. reset: con el token y la nueva contraseña la fija (setPasswordByEmail,
 *    que también avisa por correo del cambio) y borra el token.
 */
@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  static readonly GENERIC_MESSAGE = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.';

  async forgot(email: string, app?: string): Promise<{ message: string }> {
    const userName = (email || '').trim();
    const appKey = APP_LOGIN_URLS[(app || '').toLowerCase()] ? (app || '').toLowerCase() : 'inout';
    if (!userName) throw new BadRequestException('Ingresa tu correo electrónico.');

    const user = await this.userRepository.findOne({ where: { strUserName: userName } });
    if (!user || (user.strStatus || '').toUpperCase() === 'INACTIVE') {
      return { message: PasswordRecoveryService.GENERIC_MESSAGE };
    }
    // Evita reenvíos seguidos (el token vigente se generó hace menos de un minuto)
    const expires = user.dtmResetTokenExpires ? new Date(user.dtmResetTokenExpires).getTime() : 0;
    if (expires - TOKEN_TTL_MS + RESEND_WAIT_MS > Date.now()) {
      return { message: PasswordRecoveryService.GENERIC_MESSAGE };
    }

    const token = randomBytes(32).toString('hex');
    await this.userRepository.update(user.id, {
      strResetTokenHash: hashToken(token),
      dtmResetTokenExpires: new Date(Date.now() + TOKEN_TTL_MS),
    });

    const base = APP_LOGIN_URLS[appKey]().replace(/\/login\/?$/, '');
    const link = `${base}/reset-password?token=${token}`;
    const appName = APP_NAMES[appKey];
    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b3d91;margin:0 0 12px">Restablece tu contraseña</h2>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta CycloNet (<b>${esc(userName)}</b>) desde ${esc(appName)}.</p>
  <p style="margin:24px 0"><a href="${esc(link)}" style="background:#f97316;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p>
  <p style="font-size:13px;color:#6b7280">El enlace vence en 1 hora y sirve una sola vez. Tu nueva contraseña aplica en todas las aplicaciones CycloNet.</p>
  <p style="font-size:13px;color:#6b7280">Si no lo solicitaste, ignora este correo: tu contraseña seguirá igual.</p>
</div>`;
    const sent = await this.mailService.send(userName, 'Restablece tu contraseña — CycloNet', html, { application: appName });
    if (!sent) this.logger.warn(`No se pudo enviar el enlace de recuperación a ${userName}`);
    return { message: PasswordRecoveryService.GENERIC_MESSAGE };
  }

  async reset(token: string, newPassword: string): Promise<{ message: string }> {
    const invalid = new BadRequestException('El enlace no es válido o ya venció. Solicita uno nuevo.');
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) throw invalid;

    const user = await this.userRepository
      .createQueryBuilder('u')
      .addSelect('u.strResetTokenHash')
      .where('u.strResetTokenHash = :h', { h: hashToken(token) })
      .getOne();
    if (!user || !user.dtmResetTokenExpires || new Date(user.dtmResetTokenExpires).getTime() < Date.now()) throw invalid;

    // Valida largo y que sea distinta a la actual; avisa por correo del cambio
    await this.usersService.setPasswordByEmail(user.strUserName, newPassword);
    await this.userRepository.update(user.id, { strResetTokenHash: null, dtmResetTokenExpires: null });
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }
}
