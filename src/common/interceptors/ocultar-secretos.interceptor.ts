import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Campos que NUNCA deben salir en una respuesta HTTP. Varias rutas devuelven la
 * entidad User completa dentro de otras (p. ej. GET /contracts/tenant/:id, que
 * el MarketPlace de InOut llama desde el navegador sin sesión): sin este
 * filtro viajaban el hash de la contraseña y el código de verificación del
 * dueño de cada negocio.
 */
export const CAMPOS_SECRETOS = new Set(['strPassword', 'verificationCode', 'verificationExpires']);

/** Copia de `valor` sin los campos secretos, a cualquier profundidad. Respeta ciclos y deja intactos binarios y fechas. */
export function ocultarSecretos<T>(valor: T, vistos = new WeakMap<object, unknown>()): T {
  if (valor === null || typeof valor !== 'object') return valor;
  if (valor instanceof Date || Buffer.isBuffer(valor) || ArrayBuffer.isView(valor) || valor instanceof ArrayBuffer) return valor;
  if (valor instanceof StreamableFile || typeof (valor as any).pipe === 'function') return valor;
  if (vistos.has(valor as object)) return vistos.get(valor as object) as T;

  if (Array.isArray(valor)) {
    const copia: unknown[] = [];
    vistos.set(valor, copia);
    for (const v of valor) copia.push(ocultarSecretos(v, vistos));
    return copia as T;
  }

  // Se conserva el prototipo (entidades, DTO) para no alterar su toJSON ni sus getters
  const copia = Object.create(Object.getPrototypeOf(valor));
  vistos.set(valor as object, copia);
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (CAMPOS_SECRETOS.has(clave)) continue;
    copia[clave] = ocultarSecretos(v, vistos);
  }
  return copia;
}

/** Interceptor global: aplica ocultarSecretos a toda respuesta. */
@Injectable()
export class OcultarSecretosInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((cuerpo) => ocultarSecretos(cuerpo)));
  }
}
