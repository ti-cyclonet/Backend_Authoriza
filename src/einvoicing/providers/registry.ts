import { EinvoiceProvider } from './einvoice-provider';
import { SimulatedEinvoiceProvider } from './simulated.provider';

/**
 * Proveedores tecnológicos disponibles. EINVOICING_PROVIDER elige cuál se usa;
 * vacío = facturación electrónica "en configuración" (nada se emite).
 *
 * PENDIENTE (definición del proveedor): agregar aquí el adaptador del PT
 * elegido, p. ej.
 *   muisca: () => new MuiscaProvider(readMuiscaConfig()),
 *   hka:    () => new TheFactoryHkaProvider(readHkaConfig()),
 * y documentar sus variables en el README.
 */
const PROVIDERS: Record<string, () => EinvoiceProvider> = {
  simulado: () => new SimulatedEinvoiceProvider(),
};

/** Proveedor configurado, o null si la facturación electrónica no está disponible. */
export function resolveProvider(env: NodeJS.ProcessEnv = process.env): EinvoiceProvider | null {
  const name = String(env.EINVOICING_PROVIDER || '').trim().toLowerCase();
  if (!name) return null;
  // El simulado nunca en producción: emitiría documentos que no existen ante la DIAN
  if (name === 'simulado' && env.NODE_ENV === 'production') return null;
  const factory = PROVIDERS[name];
  return factory ? factory() : null;
}

export const NOT_AVAILABLE_MESSAGE =
  'La facturación electrónica está en configuración y todavía no está disponible. Te avisaremos cuando puedas activarla.';
