import { NotificationsService } from './notifications.service';

/** Repositorio de plantillas en memoria: lo justo para sembrar y enviar. */
function repo(inicial: any[] = []) {
  const rows = inicial.map((r, i) => ({ id: String(i + 1), isActive: true, ...r }));
  return {
    rows,
    findOne: jest.fn(async ({ where }) => rows.find((r) => r.code === where.code) || null),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => { const r = { id: String(rows.length + 1), isActive: true, ...x }; rows.push(r); return r; }),
    update: jest.fn(async (id, patch) => Object.assign(rows.find((r) => r.id === id), patch)),
  };
}

const VIEJO = `<table><tr>
      <td style="background:#1f2a44;padding:24px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:800;">{{businessName}}</h1>
        <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Recordatorio de pago</p>
      </td>
    </tr><tr><td>Hola {{customerName}}</td></tr></table>`;

describe('recordatorio de cartera: logo y nombre de la tienda', () => {
  it('actualiza solo el encabezado de la plantilla ya sembrada', async () => {
    const r = repo([{ code: 'CREDIT_PAYMENT_REMINDER', subject: 'Tu factura', htmlBody: VIEJO }]);
    const service = new NotificationsService(r as any, { send: jest.fn() } as any);
    await service.seedDefaultTemplates();
    const tpl = r.rows.find((x) => x.code === 'CREDIT_PAYMENT_REMINDER');
    expect(tpl.htmlBody).toContain('{{logoBlock}}');
    expect(tpl.htmlBody).not.toContain('background:#1f2a44;padding:24px');
    expect(tpl.htmlBody).toContain('Hola {{customerName}}');
  });

  it('no toca una plantilla que un administrador cambió', async () => {
    const editada = '<p>{{businessName}} te recuerda tu pago</p>';
    const r = repo([{ code: 'CREDIT_PAYMENT_REMINDER', subject: 'Tu factura', htmlBody: editada }]);
    await new NotificationsService(r as any, { send: jest.fn() } as any).seedDefaultTemplates();
    expect(r.rows.find((x) => x.code === 'CREDIT_PAYMENT_REMINDER').htmlBody).toBe(editada);
  });

  it('con logo muestra la imagen y sin logo no deja la variable a la vista', async () => {
    const r = repo();
    const mail = { send: jest.fn().mockResolvedValue(true) };
    const service = new NotificationsService(r as any, mail as any);
    await service.seedDefaultTemplates();
    const vars = { businessName: 'Arepas Jimmy', customerName: 'Alfredo' };
    await service.sendEmail({ to: 'a@b.co', templateCode: 'CREDIT_PAYMENT_REMINDER', variables: { ...vars, logoBlock: '<img src="https://res.cloudinary.com/x/logo.png">' } });
    await service.sendEmail({ to: 'a@b.co', templateCode: 'CREDIT_PAYMENT_REMINDER', variables: vars });
    expect(mail.send.mock.calls[0][2]).toContain('<img src="https://res.cloudinary.com/x/logo.png">');
    expect(mail.send.mock.calls[0][2]).toContain('Arepas Jimmy');
    expect(mail.send.mock.calls[1][2]).not.toContain('{{logoBlock}}');
    expect(mail.send.mock.calls[0][1]).toContain('Arepas Jimmy');
  });
});
