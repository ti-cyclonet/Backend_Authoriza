import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

/**
 * Planes de FactoNet para empresas (fase 3): contabilidad con buzón de
 * facturas de proveedores. Servicio de computación en la nube excluido de IVA
 * (art. 476-21 E.T.): los precios son finales. El primer mes es gratis
 * (freeMonthsCredit al registrarse).
 *
 * Roles: empresaFactonet (dueño o usuarios de la empresa) y contadorFactonet
 * (contador invitado). Los límites los aplica el backend de FactoNet
 * (GET /contracts/tenant/:tenantId/limits?application=FactoNet).
 */
type Plan = {
  name: string;
  displayName: string;
  description: string;
  price: number;
  annualPrice: number;
  displayOrder: number;
  isHighlighted: boolean;
  ctaLabel: string;
  users: number;
  vars: Array<{ variableName: string; displayName: string; maxValue: number; limitType: 'quantity' | 'feature' }>;
};

const FEATURES = (ia: number, cobranza: number, conciliacion: number) => [
  { variableName: 'fContabilidad', displayName: 'Contabilidad: comprobantes, reportes y cierres', maxValue: 1, limitType: 'feature' as const },
  { variableName: 'fBuzon', displayName: 'Buzón de facturas de proveedores', maxValue: 1, limitType: 'feature' as const },
  { variableName: 'fLecturaIA', displayName: 'Lectura con IA de facturas sin XML (próximamente)', maxValue: ia, limitType: 'feature' as const },
  { variableName: 'fCobranza', displayName: 'Contratos, facturación recurrente y cobranza (próximamente)', maxValue: cobranza, limitType: 'feature' as const },
  { variableName: 'fConciliacion', displayName: 'Conciliación bancaria (próximamente)', maxValue: conciliacion, limitType: 'feature' as const },
];

export const FACTONET_PLANS: Plan[] = [
  {
    name: 'FACTONET INICIA',
    displayName: 'FactoNet Inicia',
    description: 'La contabilidad de tu negocio en la nube: comprobantes, reportes, cierres y un buzón donde tus proveedores te envían las facturas electrónicas, que se contabilizan con un clic.',
    price: 59000,
    annualPrice: 590000,
    displayOrder: 1,
    isHighlighted: false,
    ctaLabel: 'Probar un mes gratis',
    users: 1,
    vars: [
      { variableName: 'nComprobantes', displayName: 'Comprobantes al mes', maxValue: 150, limitType: 'quantity' },
      { variableName: 'nFacturasRecibidas', displayName: 'Facturas de proveedores al mes', maxValue: 30, limitType: 'quantity' },
      ...FEATURES(0, 0, 0),
    ],
  },
  {
    name: 'FACTONET PRO',
    displayName: 'FactoNet Pro',
    description: 'Contabilidad, buzón de facturas y más volumen, con 3 usuarios. Pronto: lectura con IA de las facturas sin XML y cobranza a tus clientes.',
    price: 119000,
    annualPrice: 1190000,
    displayOrder: 2,
    isHighlighted: true,
    ctaLabel: 'Probar un mes gratis',
    users: 3,
    vars: [
      { variableName: 'nComprobantes', displayName: 'Comprobantes al mes', maxValue: 600, limitType: 'quantity' },
      { variableName: 'nFacturasRecibidas', displayName: 'Facturas de proveedores al mes', maxValue: 150, limitType: 'quantity' },
      ...FEATURES(1, 1, 0),
    ],
  },
  {
    name: 'FACTONET EMPRESA',
    displayName: 'FactoNet Empresa',
    description: 'Comprobantes ilimitados, 500 facturas de proveedores al mes y 10 usuarios. Pronto: conciliación bancaria.',
    price: 219000,
    annualPrice: 2190000,
    displayOrder: 3,
    isHighlighted: false,
    ctaLabel: 'Probar un mes gratis',
    users: 10,
    vars: [
      { variableName: 'nComprobantes', displayName: 'Comprobantes al mes', maxValue: 999999, limitType: 'quantity' },
      { variableName: 'nFacturasRecibidas', displayName: 'Facturas de proveedores al mes', maxValue: 500, limitType: 'quantity' },
      ...FEATURES(1, 1, 1),
    ],
  },
];

export default class FactonetPackagesSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeService = new EntityCodeService(dataSource.getRepository(EntityCode));

    const empresaRole = await rolRepo.findOne({ where: { strName: 'empresaFactonet' } });
    const contadorRole = await rolRepo.findOne({ where: { strName: 'contadorFactonet' } });

    for (const plan of FACTONET_PLANS) {
      let pkg = await packageRepo.findOne({ where: { name: plan.name } });
      if (!pkg) {
        pkg = packageRepo.create({
          name: plan.name,
          code: await entityCodeService.generateCode('Package'),
          displayName: plan.displayName,
          description: plan.description,
          price: plan.price,
          annualPrice: plan.annualPrice,
          isBillable: true,
          showInLanding: true,
          displayOrder: plan.displayOrder,
          isHighlighted: plan.isHighlighted,
          ctaLabel: plan.ctaLabel,
          ctaType: 'register',
        });
        pkg.targetApplication = 'FactoNet';
        await packageRepo.save(pkg);
        console.log(`✅ Paquete ${plan.name} creado:`, pkg.id);
      }

      for (const v of plan.vars) {
        const existing = await ulvRepo.findOne({ where: { packageId: pkg.id, variableName: v.variableName } });
        if (!existing) {
          await ulvRepo.save(ulvRepo.create({ ...v, targetApplication: 'FactoNet', packageId: pkg.id }));
        } else if (existing.maxValue !== v.maxValue || existing.displayName !== v.displayName) {
          Object.assign(existing, { maxValue: v.maxValue, displayName: v.displayName, limitType: v.limitType });
          await ulvRepo.save(existing);
        }
      }

      for (const [role, total] of [[empresaRole, plan.users], [contadorRole, 1]] as const) {
        if (!role) continue;
        const existing = await configRepo.findOne({ where: { package: { id: pkg.id }, rol: { id: role.id } } });
        if (!existing) {
          await configRepo.save(configRepo.create({ price: 0, totalAccount: total, package: pkg, rol: role }));
        } else if (existing.totalAccount !== total) {
          existing.totalAccount = total;
          await configRepo.save(existing);
        }
      }
    }
    console.log('✅ Planes de FactoNet configurados');
  }
}
