import { amzDateNow, signSigV4 } from './aws-sigv4';

/**
 * Vector de ejemplo de la documentación de AWS (IAM ListUsers, 2015-08-30):
 * credenciales de ejemplo AKIDEXAMPLE / wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY.
 */
describe('signSigV4', () => {
  const signed = signSigV4({
    method: 'GET',
    host: 'iam.amazonaws.com',
    path: '/',
    query: 'Action=ListUsers&Version=2010-05-08',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: '',
    region: 'us-east-1',
    service: 'iam',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    amzDate: '20150830T123600Z',
  });

  it('produce el hash de la solicitud canónica del ejemplo de AWS', () => {
    expect(signed.canonicalRequestHash).toBe('f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59');
  });

  it('produce la firma del ejemplo de AWS', () => {
    expect(signed.signature).toBe('5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7');
    expect(signed.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, ' +
        'SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7',
    );
  });

  it('formatea x-amz-date', () => {
    expect(amzDateNow(new Date('2026-09-26T08:05:09.123Z'))).toBe('20260926T080509Z');
  });
});
