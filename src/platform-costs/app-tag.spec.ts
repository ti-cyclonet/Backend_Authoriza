import { appFromTag } from './platform-costs.service';

describe('appFromTag', () => {
  it('reconoce las apps sin importar mayúsculas, espacios o guiones', () => {
    expect(appFromTag('Shotra')).toBe('Shotra');
    expect(appFromTag('shotra')).toBe('Shotra');
    expect(appFromTag('INOUT')).toBe('Inout');
    expect(appFromTag('Facto-Net')).toBe('FactoNet');
    expect(appFromTag(' authoriza ')).toBe('Authoriza');
  });

  it('Kiri Finance y AidCash cuentan como Kiri', () => {
    expect(appFromTag('Kiri')).toBe('Kiri');
    expect(appFromTag('Kiri Finance')).toBe('Kiri');
    expect(appFromTag('AidCash')).toBe('Kiri');
  });

  it('sin etiqueta o con un valor desconocido es costo compartido', () => {
    expect(appFromTag('')).toBe('-');
    expect(appFromTag('landing')).toBe('-');
  });
});
