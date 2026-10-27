import { TestimonialsService, publicName } from './testimonials.service';

/** Repositorio mínimo: guarda en memoria; find/count los define cada prueba. */
function crear(opts: { recent?: number; rows?: any[] } = {}) {
  const saved: any[] = [];
  const repo = {
    saved,
    count: jest.fn(async () => opts.recent || 0),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => { const r = { id: x.id || `t${saved.length + 1}`, createdAt: new Date('2026-10-26T15:00:00Z'), ...x }; saved.push(r); return r; }),
    findOne: jest.fn(async ({ where }) => (opts.rows || []).find((r) => r.id === where.id) || null),
    find: jest.fn(async () => opts.rows || []),
  };
  const mail = { send: jest.fn().mockResolvedValue(true) };
  return { service: new TestimonialsService(repo as any, mail as any), repo, mail };
}

const base = { application: 'InOut', tenantId: 'tn1', userId: 'u1', authorName: 'Laura Gómez Pérez', authorEmail: 'laura@arepas.co', businessName: 'Arepas La Esquina', city: 'Cartagena', logoUrl: 'https://res.cloudinary.com/x/logo.png' };

describe('opiniones: envío desde InOut', () => {
  it('con permiso y 4-5 estrellas queda pendiente de aprobación y avisa al buzón', async () => {
    const { service, repo, mail } = crear();
    const r = await service.create({ ...base, rating: 5, comment: 'InOut me ordenó el inventario y los pedidos.', highlights: ['inventario', 'pedidos', 'otra'], consentPublish: true, consentLogo: true });
    expect(r.status).toBe('PENDIENTE');
    expect(repo.saved[0]).toMatchObject({ highlights: ['inventario', 'pedidos'], consentLogo: true, verified: true, showOn: ['inout'] });
    expect(mail.send.mock.calls[0][0]).toBe('ti.cyclonet.sas@gmail.com');
    expect(mail.send.mock.calls[0][1]).toContain('Nueva opinión ★★★★★');
  });

  it('una calificación baja es privada y llega como alerta', async () => {
    const { service, mail } = crear();
    const r = await service.create({ ...base, rating: 2, comment: 'Se me cierra la sesión muy seguido.', consentPublish: true });
    expect(r.status).toBe('PRIVADO');
    expect(mail.send.mock.calls[0][1]).toContain('Calificación baja (2★)');
  });

  it('sin permiso no se propone para publicar y el logo no se autoriza solo', async () => {
    const { service, repo } = crear();
    const r = await service.create({ ...base, rating: 5, comment: 'Excelente herramienta para el negocio.', consentPublish: false, consentLogo: true });
    expect(r.status).toBe('PRIVADO');
    expect(repo.saved[0].consentLogo).toBe(false);
  });

  it('valida la calificación, el comentario y una opinión cada 90 días', async () => {
    await expect(crear().service.create({ ...base, rating: 6, comment: 'Comentario suficiente' })).rejects.toThrow('1 a 5');
    await expect(crear().service.create({ ...base, rating: 5, comment: 'corto' })).rejects.toThrow('mínimo 10');
    await expect(crear({ recent: 1 }).service.create({ ...base, rating: 5, comment: 'Comentario suficiente' })).rejects.toThrow('hace poco');
  });
});

describe('opiniones: aprobación y publicación', () => {
  const row = (o: any) => ({ id: 'x', application: 'InOut', authorName: 'Laura Gómez', businessName: 'Arepas', city: 'Cartagena', logoUrl: 'https://l.png', rating: 5, comment: 'muy buena', editedComment: null, highlights: [], consentPublish: true, consentLogo: false, verified: true, featured: false, showOn: ['inout'], status: 'APROBADO', createdAt: new Date(), ...o });

  it('no se puede aprobar una opinión sin permiso del cliente', async () => {
    const { service } = crear({ rows: [row({ id: 'p', consentPublish: false, status: 'PRIVADO' })] });
    await expect(service.update('p', { status: 'APROBADO' })).rejects.toThrow('no autorizó');
  });

  it('la landing recibe solo lo aprobado para ese sitio, sin correo y con el logo solo si lo autorizó', async () => {
    const rows = [
      row({ id: 'a', comment: 'buena', editedComment: 'Muy buena.', featured: true }),
      row({ id: 'b', showOn: ['cyclonet'] }),
      row({ id: 'c', consentLogo: true }),
    ];
    const { service } = crear({ rows });
    const r = await service.publicList('inout');
    expect(r.items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(r.items[0]).toMatchObject({ comment: 'Muy buena.', author: 'Laura G.', logoUrl: null });
    expect(r.items[1].logoUrl).toBe('https://l.png');
    expect(JSON.stringify(r)).not.toContain('@');
  });

  it('nombre público: nombre e inicial del apellido', () => {
    expect(publicName('laura gómez pérez')).toBe('laura G.');
    expect(publicName('Carlos')).toBe('Carlos');
    expect(publicName('')).toBe('Cliente');
  });
});
