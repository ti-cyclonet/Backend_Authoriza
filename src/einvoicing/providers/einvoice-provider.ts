import { EinvoiceDocType, IssuerData, BuyerData, Totals } from '../dian';

/**
 * Contrato con el proveedor tecnológico (PT) autorizado por la DIAN. El resto
 * del sistema solo habla con esta interfaz: cambiar de proveedor es escribir
 * otro adaptador (ver registry.ts), sin tocar InOut, FactoNet ni Authoriza.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PENDIENTE (definición del proveedor): implementar el adaptador del PT
 * elegido (Muisca, The Factory HKA…) con su API:
 *   1. registerIssuer → alta del negocio emisor en el PT (si la API lo permite)
 *      y asociación de su resolución/prefijo.
 *   2. issue          → enviar el documento; mapear la respuesta a IssueResult.
 *   3. getStatus      → consultar un documento en proceso (validación tardía).
 *   4. parseWebhook   → validar la firma del webhook del PT y traducir el
 *                       evento (validación, rechazo, eventos RADIAN).
 * Credenciales en variables de entorno EINVOICING_<PROVEEDOR>_* (nunca en el
 * código). Ver README › Facturación electrónica.
 * ─────────────────────────────────────────────────────────────────────────
 */
export interface ProviderIssuer extends IssuerData {
  tenantId: string;
  /** Id del emisor en el PT (si el PT lo asigna). */
  providerIssuerId?: string | null;
}

export interface ProviderDocument {
  /** Id interno (sirve como clave de idempotencia ante el PT). */
  id: string;
  type: EinvoiceDocType;
  prefix: string;
  number: number;
  issueDate: Date;
  /** Clave técnica de la resolución (la usa el PT para el CUFE). */
  technicalKey?: string | null;
  resolutionNumber?: string | null;
  issuer: ProviderIssuer;
  /** null = consumidor final. */
  buyer: BuyerData | null;
  totals: Totals;
  paymentMeans: 'CONTADO' | 'CREDITO';
  paymentMethod?: string | null;
  dueDate?: Date | null;
  notes?: string | null;
  /** Nota crédito/débito: documento que corrige y motivo (códigos DIAN 1–5). */
  reference?: { prefix: string; number: number; cufe: string | null; issueDate: Date; reasonCode: string; reason: string } | null;
}

export type ProviderStatus = 'ACEPTADO' | 'RECHAZADO' | 'EN_PROCESO';

export interface IssueResult {
  status: ProviderStatus;
  /** CUFE (factura) o CUDE (notas y POS). */
  cufe?: string | null;
  providerRef?: string | null;
  qrData?: string | null;
  xmlUrl?: string | null;
  pdfUrl?: string | null;
  /** Mensajes de la DIAN o del PT (rechazos y notificaciones). */
  messages?: string[];
}

export interface WebhookEvent {
  providerRef: string;
  /** Resultado de la validación, o un evento del comprador (RADIAN). */
  kind: 'STATUS' | 'ACUSE' | 'RECIBO_BIEN' | 'ACEPTACION_EXPRESA' | 'ACEPTACION_TACITA' | 'RECLAMO';
  status?: ProviderStatus;
  cufe?: string | null;
  messages?: string[];
}

export interface EinvoiceProvider {
  readonly name: string;
  /** Tipos de documento que soporta este PT (p. ej. algunos no tienen POS electrónico). */
  readonly supports: EinvoiceDocType[];
  registerIssuer(issuer: ProviderIssuer): Promise<{ providerIssuerId: string | null }>;
  issue(doc: ProviderDocument): Promise<IssueResult>;
  getStatus(providerRef: string): Promise<IssueResult>;
  /** null si la firma del webhook no es válida. */
  parseWebhook(headers: Record<string, string | undefined>, body: unknown): WebhookEvent | null;
}

/** Errores temporales (red, PT o DIAN caídos): el documento queda en contingencia y se reintenta. */
export class ProviderUnavailableError extends Error {}
