import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';
import { KIRI_PLAN_PRECIOS, PlanKiri, variablesDelPlan } from './kiri-plan-matrix';

/**
 * Paquetes de Kiri Finance: KIRI FREE, KIRI PLUS y KIRI PRO.
 * Lo que incluye cada uno está en kiri-plan-matrix.ts.
 *
 * Idempotente (corre en cada arranque):
 * - Crea el paquete si no existe.
 * - Sincroniza sus variables (crea las nuevas; corrige tope, tipo y nombre).
 * - Los precios solo se "migran" desde el valor anterior conocido (PLUS
 *   16.000 → 12.900) o si nunca se fijaron: un cambio hecho a mano desde el
 *   panel de Authoriza no se pisa en cada reinicio.
 */
interface DefPaquete {
  plan: PlanKiri;
  name: string;
  description: string;
  /** Descripciones anteriores del seed: si el paquete aún tiene una, se actualiza */
  descripcionesViejas: string[];
  /** Precios anteriores del seed que se migran al nuevo */
  preciosViejos: number[];
  /** Precios anuales anteriores del seed que se migran al nuevo */
  preciosAnualesViejos?: number[];
  displayOrder: number;
  isHighlighted: boolean;
  badge: string | null;
  ctaLabel: string;
  rol: 'userKiri' | 'adminKiri';
}

const PAQUETES: DefPaquete[] = [
  {
    plan: 'FREE',
    name: 'KIRI FREE',
    description: 'Empieza a ordenar tu plata: registra tus gastos e ingresos sin límite, controla tus deudas y gastos fijos, ahorra en bolsillos y haz crecer tu Árbol Kiri.',
    descripcionesViejas: ['Gestión básica de tus finanzas personales. Controla ingresos, deudas y gastos fijos con distribución inteligente de presupuesto.'],
    preciosViejos: [],
    displayOrder: 1,
    isHighlighted: false,
    badge: null,
    ctaLabel: 'Comenzar gratis',
    rol: 'userKiri',
  },
  {
    plan: 'PLUS',
    name: 'KIRI PLUS',
    description: 'Todo Kiri para ti: Kiri Coach con IA, dictado y escáner de recibos, proyecciones a 24 meses, reportes en PDF, Social con préstamos y ahorros compartidos, y sin límites en tus registros.',
    descripcionesViejas: ['Todas las funcionalidades de Kiri Finance. Asistente IA, reportes avanzados, estrategias de deuda, funciones sociales y sin límites en registros.'],
    // 16.000 → 12.900 → 14.900 (anual 119.000 → 139.000)
    preciosViejos: [16000, 12900],
    preciosAnualesViejos: [119000],
    displayOrder: 2,
    isHighlighted: true,
    badge: 'Más popular',
    ctaLabel: 'Elegir Plan',
    rol: 'adminKiri',
  },
  {
    plan: 'PRO',
    name: 'KIRI PRO',
    description: 'Para el hogar y quien quiere todo: presupuesto del hogar en pareja, conexión con tu banco, más IA, escenarios guardados, historial ilimitado y soporte prioritario.',
    // Ya no hay PLUS gratis para la pareja de un PRO
    descripcionesViejas: ['Para el hogar y quien quiere todo: presupuesto del hogar en pareja (tu pareja recibe PLUS gratis), conexión con tu banco, más IA, escenarios guardados, historial ilimitado y soporte prioritario.'],
    preciosViejos: [],
    displayOrder: 3,
    isHighlighted: false,
    badge: 'Para el hogar',
    ctaLabel: 'Elegir Plan',
    rol: 'adminKiri',
  },
];

export default class KiriPackagesSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeService = new EntityCodeService(dataSource.getRepository(EntityCode));

    for (const def of PAQUETES) {
      const precio = KIRI_PLAN_PRECIOS[def.plan];
      let pkg = await packageRepo.findOne({ where: { name: def.name } });

      if (!pkg) {
        pkg = packageRepo.create({
          name: def.name,
          code: await entityCodeService.generateCode('Package'),
          displayName: def.name,
          description: def.description,
          price: precio.mensual,
          annualPrice: precio.anual || null,
          isBillable: precio.mensual > 0,
          showInLanding: true,
          displayOrder: def.displayOrder,
          isHighlighted: def.isHighlighted,
          badge: def.badge,
          ctaLabel: def.ctaLabel,
          ctaType: 'register',
        });
        pkg.targetApplication = 'Kiri';
        await packageRepo.save(pkg);
        console.log(`✅ Paquete ${def.name} creado:`, pkg.id);
      } else {
        let cambio = false;
        if (def.preciosViejos.includes(Number(pkg.price))) { pkg.price = precio.mensual; cambio = true; }
        if ((pkg.annualPrice == null || def.preciosAnualesViejos?.includes(Number(pkg.annualPrice))) && precio.anual > 0 && Number(pkg.annualPrice) !== precio.anual) { pkg.annualPrice = precio.anual; cambio = true; }
        if (!pkg.description || def.descripcionesViejas.includes(pkg.description)) {
          if (pkg.description !== def.description) { pkg.description = def.description; cambio = true; }
        }
        if (pkg.badge == null && def.badge) { pkg.badge = def.badge; cambio = true; }
        if (pkg.displayOrder !== def.displayOrder) { pkg.displayOrder = def.displayOrder; cambio = true; }
        if (cambio) {
          await packageRepo.save(pkg);
          console.log(`🔄 Paquete ${def.name} actualizado (precio ${pkg.price}, anual ${pkg.annualPrice})`);
        } else {
          console.log(`⚠️ Paquete ${def.name} ya existe con ID:`, pkg.id);
        }
      }

      // Variables del plan (funciones y topes)
      for (const v of variablesDelPlan(def.plan)) {
        const existing = await ulvRepo.findOne({ where: { packageId: pkg.id, variableName: v.variableName } });
        if (!existing) {
          await ulvRepo.save(ulvRepo.create({ ...v, packageId: pkg.id }));
        } else if (existing.limitType !== v.limitType || existing.maxValue !== v.maxValue || existing.displayName !== v.displayName) {
          existing.limitType = v.limitType;
          existing.maxValue = v.maxValue;
          existing.displayName = v.displayName;
          await ulvRepo.save(existing);
        }
      }
      console.log(`  ✅ Variables ${def.name} configuradas`);

      // Rol de la cuenta: FREE → userKiri; PLUS/PRO → adminKiri (1 cuenta)
      const rol = await rolRepo.findOne({ where: { strName: def.rol } });
      if (rol) {
        const existingConfig = await configRepo.findOne({ where: { package: { id: pkg.id }, rol: { id: rol.id } } });
        if (!existingConfig) {
          await configRepo.save(configRepo.create({ price: 0, totalAccount: 1, package: pkg, rol }));
          console.log(`  ✅ Rol ${def.rol} (1 cuenta) asignado a ${def.name}`);
        }
      }
    }
  }
}
