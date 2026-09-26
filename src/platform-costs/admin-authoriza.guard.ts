import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** Solo administradores de Authoriza (rol adminAuthoriza) con sesión válida. */
@Injectable()
export class AdminAuthorizaGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers['authorization'] || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) throw new UnauthorizedException('Se requiere autenticación.');
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
    if (payload?.rol !== 'adminAuthoriza') throw new ForbiddenException('Solo administradores de Authoriza.');
    return true;
  }
}
