import { BadRequestException } from '@nestjs/common';
import { NotificationsService, JOBS_INBOX } from './notifications.service';

/** «Trabaja con nosotros»: la hoja de vida en PDF llega adjunta al buzón de selección. */
describe('NotificationsService.sendJobApplication', () => {
  const dto = {
    nombre: 'Ana <b>Ruiz</b>', correo: 'ana@correo.co', celular: '3001234567',
    area: 'Desarrollo web y móvil', experiencia: '1 a 3 años', ciudad: 'Cartagena',
    enlace: 'https://linkedin.com/in/ana', sobre: 'Hago apps\ncon Angular',
  };
  const pdf = (content = '%PDF-1.7 contenido') => ({
    mimetype: 'application/pdf', size: Buffer.byteLength(content), buffer: Buffer.from(content), originalname: 'cv.pdf',
  }) as any;

  let send: jest.Mock;
  let service: NotificationsService;
  beforeEach(() => {
    send = jest.fn(async () => true);
    service = new NotificationsService({} as any, { send } as any);
  });

  it('adjunta el PDF y lo envía al buzón de selección, con los datos escapados', async () => {
    const res = await service.sendJobApplication(dto, pdf());
    expect(res).toMatchObject({ success: true, attached: true });
    const [to, subject, html, , attachments] = send.mock.calls[0];
    expect(to).toBe(JOBS_INBOX);
    expect(subject).toContain('Desarrollo web y móvil');
    expect(html).toContain('Ana &lt;b&gt;Ruiz&lt;/b&gt;');
    expect(html).not.toContain('<b>Ruiz</b>');
    expect(html).toContain('Hago apps<br>con Angular');
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({ filename: 'HV Ana b Ruiz b.pdf', contentType: 'application/pdf' });
  });

  it('sin PDF también se envía, sin adjunto', async () => {
    const res = await service.sendJobApplication(dto);
    expect(res.attached).toBe(false);
    expect(send.mock.calls[0][4]).toBeUndefined();
  });

  it('rechaza un archivo que no es PDF aunque diga serlo', async () => {
    await expect(service.sendJobApplication(dto, pdf('MZ ejecutable'))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.sendJobApplication(dto, { ...pdf(), mimetype: 'image/png' })).rejects.toBeInstanceOf(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });

  it('un enlace que no es http(s) no se vuelve clicable', async () => {
    await service.sendJobApplication({ ...dto, enlace: 'javascript:alert(1)' });
    expect(send.mock.calls[0][2]).not.toContain('javascript:');
  });
});
