import { ConflictException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { duplicateMessage, normalizeReference } from './payment-reference';

describe('Referencia única del soporte de pago de una factura', () => {
  it('normaliza: mayúsculas, sin espacios ni signos, sin prefijos', () => {
    expect(normalizeReference(' m-8721 4093 ')).toBe('M87214093');
    expect(normalizeReference('Ref. M87214093')).toBe('M87214093');
    expect(normalizeReference('No. 482913')).toBe('482913');
    expect(normalizeReference('# 482913')).toBe('482913');
    expect(normalizeReference('NOV12345')).toBe('NOV12345');
    expect(normalizeReference('12')).toBe('');
    expect(normalizeReference(undefined)).toBe('');
  });

  it('mensaje con la factura donde se usó', () => {
    expect(duplicateMessage('M87214093', 'DF00007', '2026-11-06T20:00:00Z'))
      .toMatch(/referencia M87214093 está registrada en el pago de la factura DF00007 del 6 de nov/);
  });

  describe('servicio', () => {
    let rows: any[] = [];
    const qb: any = {};
    ['select', 'where', 'andWhere'].forEach((m) => (qb[m] = jest.fn(() => qb)));
    qb.getRawMany = jest.fn(async () => rows);
    const repo = { createQueryBuilder: jest.fn(() => qb) };
    const service = new InvoicesService(repo as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);

    beforeEach(() => { rows = []; repo.createQueryBuilder.mockClear(); });

    it('encuentra la referencia aunque esté escrita distinto, y no confunde otra que termina igual', async () => {
      rows = [
        { id: 3, code: 'DF00003', paymentDate: null, paymentReference: 'X87214093' },
        { id: 5, code: 'DF00005', paymentDate: null, paymentReference: 'ref m 8721-4093' },
      ];
      const use = await service.findReferenceUse(7, 'M87214093');
      expect(use?.invoiceId).toBe(5);
      expect(qb.andWhere).toHaveBeenCalledWith('i.id <> :invoiceId', { invoiceId: 7 });
    });

    it('bloquea con 409 REFERENCE_USED', async () => {
      rows = [{ id: 5, code: 'DF00005', paymentDate: null, paymentReference: 'APROB 482913' }];
      await expect(service.assertReferenceUnused(7, 'aprob-482913')).rejects.toBeInstanceOf(ConflictException);
      await expect(service.assertReferenceUnused(7, 'aprob-482913')).rejects.toMatchObject({ response: { error: 'REFERENCE_USED' } });
    });

    it('sin referencia (o muy corta) no consulta', async () => {
      await expect(service.assertReferenceUnused(7, '')).resolves.toBeUndefined();
      await expect(service.assertReferenceUnused(7, 'ok')).resolves.toBeUndefined();
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
