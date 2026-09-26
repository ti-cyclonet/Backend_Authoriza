import { createHash, createHmac } from 'crypto';

/**
 * Firma AWS Signature Version 4 (sin SDK), suficiente para llamar APIs JSON
 * como Cost Explorer. Referencia: "Create a signed AWS API request"
 * (docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html).
 */
export interface SigV4Request {
  method: string;
  host: string;
  path: string;
  query?: string; // ya codificada y ordenada, sin '?'
  headers: Record<string, string>; // se firman todas (nombres en minúscula)
  body: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  amzDate: string; // AAAAMMDDTHHMMSSZ
}

const sha256hex = (data: string) => createHash('sha256').update(data, 'utf8').digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data, 'utf8').digest();

export function signSigV4(req: SigV4Request): { authorization: string; signature: string; canonicalRequestHash: string } {
  const dateStamp = req.amzDate.slice(0, 8);
  const headers = Object.entries({ ...req.headers, host: req.host, 'x-amz-date': req.amzDate })
    .map(([k, v]) => [k.toLowerCase().trim(), String(v).trim().replace(/\s+/g, ' ')] as [string, string])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonicalHeaders = headers.map(([k, v]) => `${k}:${v}\n`).join('');
  const signedHeaders = headers.map(([k]) => k).join(';');

  const canonicalRequest = [
    req.method.toUpperCase(),
    req.path || '/',
    req.query || '',
    canonicalHeaders,
    signedHeaders,
    sha256hex(req.body || ''),
  ].join('\n');
  const canonicalRequestHash = sha256hex(canonicalRequest);

  const scope = `${dateStamp}/${req.region}/${req.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', req.amzDate, scope, canonicalRequestHash].join('\n');

  const kDate = hmac(`AWS4${req.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, req.region);
  const kService = hmac(kRegion, req.service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${req.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    signature,
    canonicalRequestHash,
  };
}

export function amzDateNow(d = new Date()): string {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, '');
}
