import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

/**
 * Límite de envíos para los formularios públicos de contacto: máximo 5 por
 * IP cada 15 minutos. En memoria (un solo contenedor de Authoriza en EC2);
 * si se escala a varias instancias, moverlo a un almacén compartido.
 */
@Injectable()
export class ContactRateLimitGuard implements CanActivate {
  private static hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.ip || 'unknown';
    const now = Date.now();

    const recent = (ContactRateLimitGuard.hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
      throw new HttpException('Demasiados mensajes. Intenta de nuevo en unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    ContactRateLimitGuard.hits.set(ip, recent);

    // Limpieza ocasional para que el mapa no crezca sin límite
    if (ContactRateLimitGuard.hits.size > 5000) {
      for (const [key, times] of ContactRateLimitGuard.hits) {
        if (!times.some((t) => now - t < WINDOW_MS)) ContactRateLimitGuard.hits.delete(key);
      }
    }
    return true;
  }
}
