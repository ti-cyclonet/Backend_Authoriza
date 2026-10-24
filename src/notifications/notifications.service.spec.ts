import { NotificationsService } from './notifications.service';

const nuevo = () => {
  const mail = { send: jest.fn().mockResolvedValue(true) };
  return { mail, service: new NotificationsService({} as any, mail as any) };
};

const solicitud = {
  name: 'Ana Ruiz',
  email: 'ana@empresa.co',
  ref: 'CN-261023-AB12',
  title: 'Sistema web a la medida',
  range: '$41 M – $47 M',
  summary: 'ESTIMADO\nInversión: $41 M – $47 M',
  link: 'https://cyclonet.com.co/cotizador/#p=abc',
};

describe('landing: formulario de contacto', () => {
  it('sigue llegando solo al buzón de contacto', async () => {
    const { mail, service } = nuevo();
    await service.sendContactForm('Ana', 'ana@empresa.co', 'Hola', 'Mensaje');
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0]).toBe('ti.cyclonet@hotmail.com');
  });
});

describe('landing: solicitud del cotizador', () => {
  it('el resumen llega a ti.cyclonet.sas@gmail.com y al cliente, no al buzón de contacto', async () => {
    const { mail, service } = nuevo();
    const r = await service.sendQuoteRequest(solicitud);
    expect(r).toMatchObject({ success: true, clientSent: true });
    const destinos = mail.send.mock.calls.map((c) => c[0]);
    expect(destinos).toEqual(['ti.cyclonet.sas@gmail.com', 'ana@empresa.co']);
    expect(destinos).not.toContain('ti.cyclonet@hotmail.com');
    expect(mail.send.mock.calls[0][1]).toBe('[Cotizador] CN-261023-AB12: Sistema web a la medida · $41 M – $47 M');
    expect(mail.send.mock.calls[1][1]).toBe('Tu cotización CN-261023-AB12 · CycloNet');
    expect(mail.send.mock.calls[1][2]).toContain('https://cyclonet.com.co/cotizador/#p=abc');
  });

  it('escapa el contenido y descarta enlaces que no son del cotizador', async () => {
    const { mail, service } = nuevo();
    await service.sendQuoteRequest({ ...solicitud, summary: '<a href="https://malo.co">clic</a>', link: 'https://malo.co/cotizador/' });
    const html: string = mail.send.mock.calls[1][2];
    expect(html).not.toContain('<a href="https://malo.co">');
    expect(html).toContain('&lt;a href=');
    expect(html).not.toContain('https://malo.co/cotizador/');
  });

  it('si no llega al buzón comercial no le escribe al cliente', async () => {
    const { mail, service } = nuevo();
    mail.send.mockResolvedValueOnce(false);
    const r = await service.sendQuoteRequest(solicitud);
    expect(r).toMatchObject({ success: false, clientSent: false });
    expect(mail.send).toHaveBeenCalledTimes(1);
  });
});

describe('landing: validación de la solicitud del cotizador', () => {
  const { plainToInstance } = require('class-transformer');
  const { validateSync } = require('class-validator');
  const { QuoteRequestDto } = require('./dto/notification.dto');
  const errores = (body: any) => validateSync(plainToInstance(QuoteRequestDto, body), { whitelist: true, forbidNonWhitelisted: true });

  it('acepta lo que envía el cotizador', () => {
    expect(errores({ ...solicitud, name: 'Ana Ruiz (Empresa <b>X</b>)', ref: 'CN-261024-IR5Q', range: '$25 M – $30 M', summary: 'x'.repeat(2500), link: 'https://www.cyclonet.com.co/cotizador/index.html#p=' + 'a'.repeat(640) })).toEqual([]);
  });

  it('rechaza referencias raras y campos de más', () => {
    expect(errores({ ...solicitud, ref: '<script>' }).length).toBeGreaterThan(0);
    expect(errores({ ...solicitud, to: 'otro@correo.co' }).length).toBeGreaterThan(0);
  });
});

describe('landing: cotizaciones que llegan por el formulario de contacto', () => {
  it('versiones viejas del cotizador van al buzón comercial, no al de contacto', async () => {
    const { mail, service } = nuevo();
    await service.sendContactForm('Ana', 'ana@empresa.co', 'Cotizador CN-261024-7P5D: Tienda en línea · $7,7 M – $15 M', 'Solicitud…');
    expect(mail.send.mock.calls[0][0]).toBe('ti.cyclonet.sas@gmail.com');
    expect(mail.send.mock.calls[0][1]).toBe('[Cotizador] Cotizador CN-261024-7P5D: Tienda en línea · $7,7 M – $15 M');
  });

  it('un mensaje que solo menciona el cotizador sigue siendo contacto', async () => {
    const { mail, service } = nuevo();
    await service.sendContactForm('Ana', 'ana@empresa.co', 'Pregunta sobre el Cotizador', 'Hola');
    expect(mail.send.mock.calls[0][0]).toBe('ti.cyclonet@hotmail.com');
  });
});
