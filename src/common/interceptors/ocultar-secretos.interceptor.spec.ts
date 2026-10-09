import { StreamableFile } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { OcultarSecretosInterceptor, ocultarSecretos } from './ocultar-secretos.interceptor';

class User { id = 'u1'; strUserName = 'dueno@x.co'; strPassword = '$2b$10$hash'; verificationCode = '123456'; verificationExpires = new Date(); }

describe('ocultarSecretos', () => {
  it('quita hash y código de verificación del usuario dentro de un contrato (forma de GET /contracts/tenant/:id)', () => {
    const contrato = { id: 'c1', businessSector: 'restaurant', user: Object.assign(new User(), { basicData: { legalEntityData: { businessName: 'JimmyLon', contactPhone: '3001112233' } } }) };
    const r: any = ocultarSecretos(contrato);
    expect(r.user.strPassword).toBeUndefined();
    expect(r.user.verificationCode).toBeUndefined();
    expect(r.user.verificationExpires).toBeUndefined();
    expect(r.user.strUserName).toBe('dueno@x.co');
    expect(r.user.basicData.legalEntityData.businessName).toBe('JimmyLon');
    expect(r.businessSector).toBe('restaurant');
  });

  it('funciona en listas y no modifica el objeto original', () => {
    const u = new User();
    const r: any = ocultarSecretos([{ user: u }, { user: u }]);
    expect(r[0].user.strPassword).toBeUndefined();
    expect(r[1].user.strPassword).toBeUndefined();
    expect(u.strPassword).toBe('$2b$10$hash');
  });

  it('conserva fechas, binarios, archivos y el prototipo de las entidades', () => {
    const fecha = new Date('2026-10-08T00:00:00Z');
    const buf = Buffer.from('pdf');
    const archivo = new StreamableFile(buf);
    const r: any = ocultarSecretos({ fecha, buf, user: new User() });
    expect(r.fecha).toBe(fecha);
    expect(r.buf).toBe(buf);
    expect(r.user).toBeInstanceOf(User);
    expect(ocultarSecretos(archivo)).toBe(archivo);
    expect(ocultarSecretos('texto')).toBe('texto');
    expect(ocultarSecretos(null)).toBeNull();
  });

  it('soporta referencias circulares (relaciones de TypeORM)', () => {
    const contrato: any = { id: 'c1' };
    const user: any = Object.assign(new User(), { contracts: [contrato] });
    contrato.user = user;
    const r: any = ocultarSecretos(contrato);
    expect(r.user.strPassword).toBeUndefined();
    expect(r.user.contracts[0]).toBe(r);
  });

  it('el interceptor lo aplica a la respuesta', async () => {
    const r: any = await lastValueFrom(new OcultarSecretosInterceptor().intercept({} as any, { handle: () => of({ user: new User() }) }));
    expect(r.user.strPassword).toBeUndefined();
  });
});
