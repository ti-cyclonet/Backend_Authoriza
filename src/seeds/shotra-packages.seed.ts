import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

/**
 * Paquetes de SHOTRA (Short Trades) — marketplace de servicios profesionales.
 * - SHOTRA FREE: uso básico (limitado en solicitudes/propuestas por mes)
 * - SHOTRA PRO: uso ilimitado + features premium (destacados, prioridad, analytics)
 *
 * El acceso admin completo a Shotra para el usuario interno lo otorga el paquete
 * CYCLON PLUS [+] (cyclon-plus-package.seed.ts), no un paquete SHOTRA DEV.
 */
export default class ShotraPackagesSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // ================================================================
    // PAQUETE 1: SHOTRA FREE
    // ================================================================
    const freePackageName = 'SHOTRA FREE';
    let freePkg = await packageRepo.findOne({ where: { name: freePackageName } });

    if (!freePkg) {
      const code = await entityCodeService.generateCode('Package');
      freePkg = packageRepo.create({
        name: freePackageName,
        code,
        displayName: 'SHOTRA FREE',
        description:
          'Acceso básico al marketplace. Publica solicitudes y recibe propuestas con límites mensuales.',
        price: 0,
        isBillable: false,
        showInLanding: true,
        displayOrder: 1,
        isHighlighted: false,
        ctaLabel: 'Comenzar gratis',
        ctaType: 'register',
      });
      freePkg.targetApplication = 'Shotra';
      await packageRepo.save(freePkg);
      console.log('✅ Paquete SHOTRA FREE creado:', freePkg.id);
    } else {
      console.log('⚠️ Paquete SHOTRA FREE ya existe con ID:', freePkg.id);
    }

    // Variables del plan FREE
    const freeVariables = [
      // Límites de uso (cantidad por mes)
      { variableName: 'nSolicitudes', displayName: 'Solicitudes por mes', maxValue: 5, limitType: 'quantity' },
      { variableName: 'nPropuestas', displayName: 'Propuestas por mes', maxValue: 10, limitType: 'quantity' },
      // Features habilitadas
      { variableName: 'basicMessaging', displayName: 'Mensajería básica', maxValue: 1, limitType: 'feature' },
      { variableName: 'basicProfile', displayName: 'Perfil básico', maxValue: 1, limitType: 'feature' },
      { variableName: 'ratings', displayName: 'Evaluaciones', maxValue: 1, limitType: 'feature' },
      // Features NO incluidas
      { variableName: 'priorityMatching', displayName: 'Matching prioritario', maxValue: 0, limitType: 'feature' },
      { variableName: 'featuredProvider', displayName: 'Perfil destacado', maxValue: 0, limitType: 'feature' },
      { variableName: 'analytics', displayName: 'Analytics de rendimiento', maxValue: 0, limitType: 'feature' },
      { variableName: 'unlimitedProposals', displayName: 'Propuestas ilimitadas', maxValue: 0, limitType: 'feature' },
      { variableName: 'verifiedBadge', displayName: 'Insignia verificado', maxValue: 0, limitType: 'feature' },
    ];

    for (const varData of freeVariables) {
      const existing = await ulvRepo.findOne({ where: { packageId: freePkg.id, variableName: varData.variableName } });
      if (!existing) {
        await ulvRepo.save(ulvRepo.create({ ...varData, targetApplication: 'Shotra', packageId: freePkg.id }));
      } else if (existing.limitType !== varData.limitType || existing.maxValue !== varData.maxValue) {
        existing.limitType = varData.limitType;
        existing.maxValue = varData.maxValue;
        existing.displayName = varData.displayName;
        await ulvRepo.save(existing);
      }
    }
    console.log('  ✅ Variables SHOTRA FREE configuradas');

    // Rol para SHOTRA FREE
    const userShotraRole = await rolRepo.findOne({ where: { strName: 'userShotra' } });
    if (userShotraRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: freePkg.id }, rol: { id: userShotraRole.id } },
      });
      if (!existingConfig) {
        await configRepo.save(configRepo.create({ price: 0, totalAccount: 1, package: freePkg, rol: userShotraRole }));
        console.log('  ✅ Rol userShotra asignado a SHOTRA FREE');
      }
    }

    // ================================================================
    // PAQUETE 2: SHOTRA PRO
    // ================================================================
    const proPackageName = 'SHOTRA PRO';
    let proPkg = await packageRepo.findOne({ where: { name: proPackageName } });

    if (!proPkg) {
      const code = await entityCodeService.generateCode('Package');
      proPkg = packageRepo.create({
        name: proPackageName,
        code,
        displayName: 'SHOTRA PRO',
        description:
          'Marketplace sin límites. Propuestas ilimitadas, matching prioritario, perfil destacado y analytics.',
        price: 25000,
        isBillable: true,
        showInLanding: true,
        displayOrder: 2,
        isHighlighted: true,
        ctaLabel: 'Ser PRO',
        ctaType: 'register',
      });
      proPkg.targetApplication = 'Shotra';
      await packageRepo.save(proPkg);
      console.log('✅ Paquete SHOTRA PRO creado:', proPkg.id);
    } else {
      console.log('⚠️ Paquete SHOTRA PRO ya existe con ID:', proPkg.id);
    }

    // Variables del plan PRO (todo habilitado + sin límites de cantidad)
    const proVariables = [
      { variableName: 'nSolicitudes', displayName: 'Solicitudes por mes', maxValue: 99999, limitType: 'quantity' },
      { variableName: 'nPropuestas', displayName: 'Propuestas por mes', maxValue: 99999, limitType: 'quantity' },
      { variableName: 'basicMessaging', displayName: 'Mensajería básica', maxValue: 1, limitType: 'feature' },
      { variableName: 'basicProfile', displayName: 'Perfil básico', maxValue: 1, limitType: 'feature' },
      { variableName: 'ratings', displayName: 'Evaluaciones', maxValue: 1, limitType: 'feature' },
      { variableName: 'priorityMatching', displayName: 'Matching prioritario', maxValue: 1, limitType: 'feature' },
      { variableName: 'featuredProvider', displayName: 'Perfil destacado', maxValue: 1, limitType: 'feature' },
      { variableName: 'analytics', displayName: 'Analytics de rendimiento', maxValue: 1, limitType: 'feature' },
      { variableName: 'unlimitedProposals', displayName: 'Propuestas ilimitadas', maxValue: 1, limitType: 'feature' },
      { variableName: 'verifiedBadge', displayName: 'Insignia verificado', maxValue: 1, limitType: 'feature' },
    ];

    for (const varData of proVariables) {
      const existing = await ulvRepo.findOne({ where: { packageId: proPkg.id, variableName: varData.variableName } });
      if (!existing) {
        await ulvRepo.save(ulvRepo.create({ ...varData, targetApplication: 'Shotra', packageId: proPkg.id }));
      } else if (existing.limitType !== varData.limitType || existing.maxValue !== varData.maxValue) {
        existing.limitType = varData.limitType;
        existing.maxValue = varData.maxValue;
        existing.displayName = varData.displayName;
        await ulvRepo.save(existing);
      }
    }
    console.log('  ✅ Variables SHOTRA PRO configuradas');

    // Rol para SHOTRA PRO
    const adminShotraRole = await rolRepo.findOne({ where: { strName: 'adminShotra' } });
    if (adminShotraRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: proPkg.id }, rol: { id: adminShotraRole.id } },
      });
      if (!existingConfig) {
        await configRepo.save(configRepo.create({ price: 0, totalAccount: 1, package: proPkg, rol: adminShotraRole }));
        console.log('  ✅ Rol adminShotra asignado a SHOTRA PRO');
      }
    }

    // ================================================================
    // PAQUETE 3: SHOTRA COMISIONES
    // Contenedor facturable para las comisiones mensuales acumuladas del
    // ofertante. Shotra crea un contrato de este paquete (lazy) por ofertante
    // e inyecta el monto acumulado del mes como factura. price=0 porque el
    // valor es variable (lo define Shotra). isBillable=true para que entre al
    // ciclo de vida de facturas de Authoriza (payday, mora, suspension).
    // ================================================================
    const commissionPackageName = 'SHOTRA COMISIONES';
    let commissionPkg = await packageRepo.findOne({ where: { name: commissionPackageName } });

    if (!commissionPkg) {
      const code = await entityCodeService.generateCode('Package');
      commissionPkg = packageRepo.create({
        name: commissionPackageName,
        code,
        displayName: 'SHOTRA COMISIONES',
        description:
          'Facturación mensual de comisiones de intermediación por servicios completados en Shotra.',
        price: 0,
        isBillable: true,
        showInLanding: false, // no es un plan que el usuario elige, es interno
        displayOrder: 99,
        isHighlighted: false,
        ctaType: 'register',
      });
      commissionPkg.targetApplication = 'Shotra';
      await packageRepo.save(commissionPkg);
      console.log('✅ Paquete SHOTRA COMISIONES creado:', commissionPkg.id);
    } else {
      console.log('⚠️ Paquete SHOTRA COMISIONES ya existe con ID:', commissionPkg.id);
    }

    // Rol para SHOTRA COMISIONES (reutiliza userShotra: cualquier ofertante puede
    // tener un contrato de comisiones sin importar su plan FREE/PRO)
    if (userShotraRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: commissionPkg.id }, rol: { id: userShotraRole.id } },
      });
      if (!existingConfig) {
        await configRepo.save(configRepo.create({ price: 0, totalAccount: 1, package: commissionPkg, rol: userShotraRole }));
        console.log('  ✅ Rol userShotra asignado a SHOTRA COMISIONES');
      }
    }

    console.log('✅ Paquetes SHOTRA configurados');
  }
}
