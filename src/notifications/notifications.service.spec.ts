import { NotificationsService } from './notifications.service';

describe('formulario de contacto y cotizador de la landing', () => {
  it('llega a los dos buzones de CycloNet', async () => {
    const mail = { send: jest.fn().mockResolvedValue(true) };
    const service = new NotificationsService({} as any, mail as any);

    const r = await service.sendContactForm('Ana', 'ana@empresa.co', 'Cotizador CN-1: Sistema web', 'Detalle');

    expect(r.success).toBe(true);
    const to: string = mail.send.mock.calls[0][0];
    expect(to.split(',').map((s) => s.trim())).toEqual(['ti.cyclonet@hotmail.com', 'ti.cyclonet.sas@gmail.com']);
    expect(mail.send.mock.calls[0][1]).toBe('[Contacto Web] Cotizador CN-1: Sistema web');
  });
});
