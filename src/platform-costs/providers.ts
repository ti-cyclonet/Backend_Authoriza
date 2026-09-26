import { v2 as cloudinary } from 'cloudinary';
import { amzDateNow, signSigV4 } from './aws-sigv4';

export interface AwsDailyCost {
  day: string;
  service: string;
  amountUsd: number;
}

/**
 * AWS Cost Explorer: costo diario (UnblendedCost) agrupado por servicio.
 * Requiere un usuario IAM con permiso ce:GetCostAndUsage
 * (AWS_COST_ACCESS_KEY_ID / AWS_COST_SECRET_ACCESS_KEY). Cada consulta a
 * Cost Explorer cuesta ~USD 0,01: se consulta una vez al día.
 */
export async function fetchAwsDailyCosts(from: string, toExclusive: string): Promise<AwsDailyCost[]> {
  const accessKeyId = process.env.AWS_COST_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_COST_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Faltan AWS_COST_ACCESS_KEY_ID / AWS_COST_SECRET_ACCESS_KEY');
  }
  const host = 'ce.us-east-1.amazonaws.com';
  const results: AwsDailyCost[] = [];
  let nextToken: string | undefined;

  do {
    const body = JSON.stringify({
      TimePeriod: { Start: from, End: toExclusive },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      ...(nextToken ? { NextPageToken: nextToken } : {}),
    });
    const headers = {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSInsightsIndexService.GetCostAndUsage',
    };
    const amzDate = amzDateNow();
    const { authorization } = signSigV4({
      method: 'POST', host, path: '/', headers, body,
      region: 'us-east-1', service: 'ce', accessKeyId, secretAccessKey, amzDate,
    });
    const res = await fetch(`https://${host}/`, {
      method: 'POST',
      headers: { ...headers, 'x-amz-date': amzDate, authorization },
      body,
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`AWS Cost Explorer ${res.status}: ${data?.message || data?.Message || data?.__type || 'error'}`);

    for (const period of data.ResultsByTime || []) {
      for (const g of period.Groups || []) {
        results.push({
          day: period.TimePeriod.Start,
          service: g.Keys?.[0] || 'Otros',
          amountUsd: parseFloat(g.Metrics?.UnblendedCost?.Amount || '0') || 0,
        });
      }
    }
    nextToken = data.NextPageToken;
  } while (nextToken);

  return results;
}

/** Cloudinary Admin API: uso del plan (créditos, almacenamiento, ancho de banda, transformaciones). */
export async function fetchCloudinaryUsage(): Promise<any> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Faltan las credenciales de Cloudinary');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary.api.usage();
}
