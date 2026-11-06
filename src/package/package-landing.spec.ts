import { PackageService } from './package.service';

describe('PackageService.findForLanding', () => {
  const v = (variableName: string, displayName: string, maxValue: number, limitType = 'quantity') =>
    ({ variableName, displayName, maxValue, limitType, targetApplication: 'Inout' });

  it('lista funciones, luego cantidades y al final la duración', async () => {
    const pkg = {
      id: 'p', name: 'INOUT FREE', price: 0, ctaType: 'register', images: [],
      usageLimitVariables: [
        v('nDiasUso', 'Días de uso', 30), v('nCorreos', 'Correos enviados', 50), v('fCredito', 'Ventas a crédito', 1, 'feature'),
        v('nBodegas', 'Bodegas', 999999), v('fCombosPromos', 'Combos y promociones', 0, 'feature'), v('fTiendaOnline', 'Tienda online', 1, 'feature'),
      ],
    };
    const repo = { find: jest.fn(async () => [pkg]) };
    const service = new (PackageService as any)(repo, {}, {}, {}, {});
    const [plan] = await service.findForLanding('Inout');
    expect(plan.features).toEqual(['Ventas a crédito', 'Tienda online', '50 Correos enviados', 'Bodegas Ilimitados', 'Disponible por 30 días']);
  });
});
