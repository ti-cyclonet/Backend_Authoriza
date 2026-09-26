import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';

/** Roles de Authoriza que pueden administrar plantillas y enviar correos a mano. */
const ADMIN_ROLES = ['adminAuthoriza'];

/**
 * Protege el envío de correos y la gestión de plantillas. Deja pasar:
 * - Otros servicios del ecosistema (p. ej. InOut) con la cabecera
 *   `x-internal-key` igual a INTERNAL_API_KEY. Si la variable no está
 *   configurada, esta vía queda CERRADA (nunca abierta por defecto).
 * - Un usuario con sesión y rol de administrador de Authoriza.
 */
@Injectable()
export class InternalOrAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const expected = process.env.INTERNAL_API_KEY || '';
    const provided = String(req.headers['x-internal-key'] || '');
    if (expected.length >= 16 && provided && this.safeEqual(provided, expected)) {
      return true;
    }

    const auth = String(req.headers['authorization'] || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) throw new UnauthorizedException('Se requiere autenticación.');
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
    if (!ADMIN_ROLES.includes(payload?.rol)) {
      throw new ForbiddenException('Solo administradores de Authoriza.');
    }
    return true;
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
