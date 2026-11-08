import { DashboardCustomersService, storeName } from './dashboard-customers.service';

describe('Dashboard · clientes de las tiendas online', () => {
  it('nombre de la tienda: razón social, o nombre y apellido', () => {
    expect(storeName({ basicData: { legalEntityData: { businessName: 'Jimmylon S. A. S.' } } })).toBe('Jimmylon S. A. S.');
    expect(storeName({ basicData: { naturalPersonData: { firstName: 'Jimena', firstSurname: 'Ríos' } } })).toBe('Jimena Ríos');
    expect(storeName({ strUserName: 'tienda@correo.co' })).toBe('tienda@correo.co');
  });

  it('arma clientes, nuevos y registros sin terminar por tienda, y los usuarios únicos', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM user_consents')) return [{ storeId: 's1', n: '2' }, { storeId: 's3', n: '1' }];
      if (sql.includes('WITH x AS')) return [{ total: '27', clientsOnly: '3', staffOnly: '16', both: '6', noRole: '2' }];
      if (sql.includes('HAVING')) return [{ n: '1' }];
      return [{ storeId: 's1', clients: '5', new30: '4' }, { storeId: 's2', clients: '7', new30: '0' }];
    });
    const find = jest.fn(async () => [
      { id: 's1', strUserName: 'jimena@correo.co', basicData: { naturalPersonData: { firstName: 'Jimena', firstSurname: 'Ríos' } } },
      { id: 's2', strUserName: 'pruebas@cyclonet.co', basicData: { legalEntityData: { businessName: 'Cyclonet' } } },
    ]);
    const service = new DashboardCustomersService({ manager: { query }, find } as any);
    const r = await service.getCustomerStats(new Date('2026-11-07T12:00:00Z'));

    expect(r.stores.map((s) => [s.name, s.clients, s.new30, s.pending])).toEqual([
      ['Cyclonet', 7, 0, 0],
      ['Jimena Ríos', 5, 4, 2],
      ['Tienda', 0, 0, 1],
    ]);
    expect(r.stores[1].email).toBe('jimena@correo.co');
    expect(r.pendingTotal).toBe(3);
    expect(r.uniqueUsers).toEqual({ total: 27, clientsOnly: 3, staffOnly: 16, both: 6, noRole: 2 });
    expect(r.multiStoreClients).toBe(1);
  });
});
