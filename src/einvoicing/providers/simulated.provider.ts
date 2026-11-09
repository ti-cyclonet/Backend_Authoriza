import { createHash } from 'crypto';
import { EinvoiceProvider, IssueResult, ProviderDocument, ProviderIssuer, WebhookEvent } from './einvoice-provider';

/**
 * Proveedor SIMULADO para desarrollo y pruebas: acepta todo y devuelve un CUFE
 * de mentira (nunca llega a la DIAN). El registro (registry.ts) no lo permite
 * en producción. Sirve para probar el flujo completo mientras se define el PT.
 */
export class SimulatedEinvoiceProvider implements EinvoiceProvider {
  readonly name = 'simulado';
  readonly supports = ['FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'POS'] as const as any;

  async registerIssuer(issuer: ProviderIssuer) {
    return { providerIssuerId: `SIM-${issuer.idNumber}` };
  }

  async issue(doc: ProviderDocument): Promise<IssueResult> {
    const cufe = createHash('sha384')
      .update([doc.prefix, doc.number, doc.issueDate.toISOString(), doc.totals.total, doc.issuer.idNumber, doc.buyer?.idNumber || '222222222222'].join('|'))
      .digest('hex');
    return {
      status: 'ACEPTADO',
      cufe,
      providerRef: `SIM-${doc.id}`,
      qrData: `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cufe}`,
      messages: ['Documento SIMULADO: no se envió a la DIAN.'],
    };
  }

  async getStatus(providerRef: string): Promise<IssueResult> {
    return { status: 'ACEPTADO', providerRef };
  }

  parseWebhook(_headers: Record<string, string | undefined>, body: any): WebhookEvent | null {
    return body?.providerRef ? { providerRef: String(body.providerRef), kind: body.kind || 'STATUS', status: body.status, messages: body.messages } : null;
  }
}
