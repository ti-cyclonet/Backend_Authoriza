import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/** Comprobante de venta de InOut: plantilla sembrada y PDF adjunto. */
function repo() {
  const rows: any[] = [];
  return {
    rows,
    findOne: jest.fn(async ({ where }) => rows.find((r) => r.code === where.code) || null),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => { const r = { id: String(rows.length + 1), isActive: true, ...x }; rows.push(r); return r; }),
    update: jest.fn(),
  };
}

describe('INOUT_SALE_RECEIPT', () => {
  const pdf = Buffer.from('%PDF-1.3 tiquete').toString('base64');
  let send: jest.Mock;
  let service: NotificationsService;
  beforeEach(async () => {
    const r = repo();
    send = jest.fn(async () => true);
    service = new NotificationsService(r as any, { send } as any);
    await service.seedDefaultTemplates();
  });

  it('se siembra y envía el comprobante con el PDF adjunto', async () => {
    const res = await service.sendEmail({
      to: 'cliente@correo.co', templateCode: 'INOUT_SALE_RECEIPT', tenantId: 't1',
      variables: { businessName: 'Arepas La Esquina', documentCode: 'SC-F-00232', customerName: 'María' },
      attachments: [{ filename: 'Comprobante SC-F-00232.pdf', contentBase64: pdf, contentType: 'application/pdf' }],
    });
    expect(res.success).toBe(true);
    const [to, subject, html, meta, attachments] = send.mock.calls[0];
    expect(to).toBe('cliente@correo.co');
    expect(subject).toBe('Tu compra en Arepas La Esquina · SC-F-00232');
    expect(html).toContain('Hola <strong>María</strong>');
    expect(meta).toMatchObject({ application: 'Inout', tenantId: 't1' });
    expect(attachments[0]).toMatchObject({ filename: 'Comprobante SC-F-00232.pdf', contentType: 'application/pdf' });
    expect(attachments[0].content.toString('latin1')).toContain('%PDF-');
  });

  it('rechaza un adjunto que no es PDF', async () => {
    await expect(service.sendEmail({
      to: 'a@b.co', templateCode: 'INOUT_SALE_RECEIPT',
      attachments: [{ filename: 'x.pdf', contentBase64: Buffer.from('MZ ejecutable').toString('base64'), contentType: 'application/pdf' }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });
});
