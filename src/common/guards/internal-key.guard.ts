import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Solo servidor-a-servidor: exige la cabecera `x-internal-key` igual a
 * INTERNAL_API_KEY. A diferencia de InternalOrAdminGuard, NO acepta un JWT de
 * administrador — se usa en endpoints que validan o fijan contraseñas en nombre
 * de otra app del ecosistema (p. ej. Kiri). Sin la variable configurada, la ruta
 * queda CERRADA.
 */
/** true si la petición trae la `x-internal-key` correcta (otra app del ecosistema). */
export function isInternalRequest(req: { headers: Record<string, any> }): boolean {
  const expected = process.env.INTERNAL_API_KEY || '';
  const provided = String(req.headers['x-internal-key'] || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return expected.length >= 16 && a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (isInternalRequest(context.switchToHttp().getRequest())) return true;
    throw new UnauthorizedException('No autorizado.');
  }
}
