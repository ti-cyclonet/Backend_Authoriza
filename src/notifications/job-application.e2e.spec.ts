import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';

/**
 * POST /notifications/job-application de punta a punta (multer + validación,
 * con la misma ValidationPipe de main.ts): el formulario de la landing manda
 * multipart con los campos y el PDF «cv».
 */
describe('POST /notifications/job-application', () => {
  let app: INestApplication;
  const send = jest.fn(async () => true);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useFactory: () => new NotificationsService({} as any, { send } as any) },
        { provide: MailService, useValue: { send } },
        // Lo pide el guard de las otras rutas del controlador
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
  });
  afterAll(() => app?.close());
  beforeEach(() => send.mockClear());

  const fields = (r: request.Test) => r
    .field('nombre', 'Ana Ruiz').field('correo', 'ana@correo.co').field('celular', '3001234567')
    .field('area', 'Diseño UX/UI').field('experiencia', '1 a 3 años');

  it('recibe el PDF y lo adjunta', async () => {
    const res = await fields(request(app.getHttpServer()).post('/notifications/job-application'))
      .attach('cv', Buffer.from('%PDF-1.7\n%%EOF'), { filename: 'mi hoja.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, attached: true });
    const attachments = (send.mock.calls[0] as any[])[4];
    expect(attachments[0].content.toString()).toContain('%PDF-');
  });

  it('rechaza un archivo que no es PDF', async () => {
    const res = await fields(request(app.getHttpServer()).post('/notifications/job-application'))
      .attach('cv', Buffer.from('hola'), { filename: 'cv.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('rechaza un PDF de más de 5 MB', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await fields(request(app.getHttpServer()).post('/notifications/job-application'))
      .attach('cv', big, { filename: 'cv.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it('exige los datos básicos', async () => {
    const res = await request(app.getHttpServer()).post('/notifications/job-application').field('nombre', 'Ana');
    expect(res.status).toBe(400);
  });
});
