import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 10;

/**
 * Límite para endpoints públicos que validan una contraseña (p. ej. activar
 * Shotra en una cuenta existente): máximo 10 intentos por IP cada 15 minutos,
 * para que no sirvan para adivinar contraseñas. En memoria (un solo contenedor
 * de Authoriza en EC2), igual que ContactRateLimitGuard.
 */
@Injectable()
export class PasswordAttemptsRateLimitGuard implements CanActivate {
  private static hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.ip || 'unknown';
    const now = Date.now();

    const recent = (PasswordAttemptsRateLimitGuard.hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
      throw new HttpException('Demasiados intentos. Espera unos minutos e intenta de nuevo.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    PasswordAttemptsRateLimitGuard.hits.set(ip, recent);

    if (PasswordAttemptsRateLimitGuard.hits.size > 5000) {
      for (const [key, times] of PasswordAttemptsRateLimitGuard.hits) {
        if (!times.some((t) => now - t < WINDOW_MS)) PasswordAttemptsRateLimitGuard.hits.delete(key);
      }
    }
    return true;
  }
}
