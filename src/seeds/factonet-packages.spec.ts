import { FACTONET_PLANS } from './factonet-packages.seed';
import { appTarget } from '../auth/self-registration.service';

describe('Planes de FactoNet para empresas', () => {
  const plan = (n: string) => FACTONET_PLANS.find((p) => p.name === n)!;
  const v = (n: string, k: string) => plan(n).vars.find((x) => x.variableName === k)?.maxValue;

  it('tres planes con precio mensual y anual (excluidos de IVA: precio final)', () => {
    expect(FACTONET_PLANS.map((p) => [p.name, p.price, p.annualPrice, p.users])).toEqual([
      ['FACTONET INICIA', 59000, 590000, 1],
      ['FACTONET PRO', 119000, 1190000, 3],
      ['FACTONET EMPRESA', 219000, 2190000, 10],
    ]);
    expect(FACTONET_PLANS.filter((p) => p.isHighlighted).map((p) => p.name)).toEqual(['FACTONET PRO']);
  });

  it('límites de comprobantes y facturas recibidas, y funciones por plan', () => {
    expect([v('FACTONET INICIA', 'nComprobantes'), v('FACTONET PRO', 'nComprobantes'), v('FACTONET EMPRESA', 'nComprobantes')]).toEqual([150, 600, 999999]);
    expect([v('FACTONET INICIA', 'nFacturasRecibidas'), v('FACTONET PRO', 'nFacturasRecibidas'), v('FACTONET EMPRESA', 'nFacturasRecibidas')]).toEqual([30, 150, 500]);
    expect([v('FACTONET INICIA', 'fLecturaIA'), v('FACTONET PRO', 'fLecturaIA'), v('FACTONET EMPRESA', 'fConciliacion')]).toEqual([0, 1, 1]);
  });

  it('tras verificar el correo, un plan de FactoNet lleva al login de FactoNet', () => {
    expect(appTarget({ package: { targetApplication: 'FactoNet' } }).name).toBe('FactoNet');
    expect(appTarget({ package: { targetApplication: 'Inout' } }).name).toBe('InOut');
    expect(appTarget(null).name).toBe('InOut');
  });
});
