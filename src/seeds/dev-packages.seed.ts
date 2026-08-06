import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

/**
 * Paquetes DEV — acceso completo, no facturable, no visible en landing.
 * Para desarrolladores y testing interno. Los contratos con estos paquetes
 * no aparecen en FactoNet.
 */
export default class DevPackagesSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // ================================================================
    // KIRI DEV — Full access a Kiri Finance (desarrollo)
    // ================================================================
    await this.createKiriDev(packageRepo, ulvRepo, entityCodeService);

    // ================================================================
    // INOUT DEV — Full access a InOut (desarrollo)
    // ================================================================
    await this.createInoutDev(packageRepo, ulvRepo, configRepo, rolRepo, entityCodeService);

    console.log('✅ Paquetes DEV configurados');
  }

  private async createKiriDev(
    packageRepo: any, ulvRepo: any, entityCodeService: EntityCodeService,
  ) {
    const name = 'KIRI DEV';
    let pkg = await packageRepo.findOne({ where: { name } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name,
        code,
        displayName: 'KIRI DEV',
        description: 'Paquete de desarrollo. Acceso completo a todas las funcionalidades de Kiri Finance. No facturable.',
        price: 0,
        isBillable: false,
        showInLanding: false,
        displayOrder: 99,
        isHighlighted: false,
        ctaLabel: '',
        ctaType: 'register',
      });
      pkg.targetApplication = 'Kiri';
      await packageRepo.save(pkg);
      console.log('  ✅ KIRI DEV creado:', pkg.id);
    } else {
      console.log('  ⚠️ KIRI DEV ya existe:', pkg.id);
    }

    // Todas las features habilitadas
    const features = [
      'budgetManagement', 'debtsTracking', 'fixedExpenses', 'savingsPockets',
      'basicReports', 'impulseExpenses', 'extraIncomes', 'emergencyFund',
      'gamification', 'advancedReports', 'debtStrategies', 'aiCoach',
      'socialConnections', 'sharedPockets', 'p2pLoans',
    ];

    const featureNames: Record<string, string> = {
      budgetManagement: 'Gestión de presupuesto',
      debtsTracking: 'Control de deudas',
      fixedExpenses: 'Gastos fijos',
      savingsPockets: 'Bolsillos de ahorro',
      basicReports: 'Reportes básicos',
      impulseExpenses: 'Gastos hormiga',
      extraIncomes: 'Ingresos extras',
      emergencyFund: 'Fondo de emergencia',
      gamification: 'Gamificación y jardín virtual',
      advancedReports: 'Reportes avanzados (PDF/Excel)',
      debtStrategies: 'Estrategias de deuda',
      aiCoach: 'Asistente IA financiero',
      socialConnections: 'Conexiones sociales',
      sharedPockets: 'Bolsillos compartidos',
      p2pLoans: 'Préstamos P2P',
    };

    for (const variableName of features) {
      const existing = await ulvRepo.findOne({ where: { packageId: pkg.id, variableName } });
      if (!existing) {
        await ulvRepo.save(ulvRepo.create({
          variableName,
          displayName: featureNames[variableName] || variableName,
          maxValue: 1,
          targetApplication: 'Kiri',
          limitType: 'feature',
          packageId: pkg.id,
        }));
      }
    }
  }

  private async createInoutDev(
    packageRepo: any, ulvRepo: any, configRepo: any, rolRepo: any, entityCodeService: EntityCodeService,
  ) {
    const name = 'INOUT DEV';
    let pkg = await packageRepo.findOne({ where: { name } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name,
        code,
        displayName: 'INOUT DEV',
        description: 'Paquete de desarrollo. Acceso completo a InOut sin límites. No facturable.',
        price: 0,
        isBillable: false,
        showInLanding: false,
        displayOrder: 99,
        isHighlighted: false,
        ctaLabel: '',
        ctaType: 'register',
      });
      pkg.targetApplication = 'Inout';
      await packageRepo.save(pkg);
      console.log('  ✅ INOUT DEV creado:', pkg.id);
    } else {
      console.log('  ⚠️ INOUT DEV ya existe:', pkg.id);
    }

    // Rol adminInout con 10 cuentas
    const adminInoutRole = await rolRepo.findOne({ where: { strName: 'adminInout' } });
    if (adminInoutRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: adminInoutRole.id } },
      });
      if (!existingConfig) {
        await configRepo.save(configRepo.create({
          price: 0,
          totalAccount: 10,
          package: pkg,
          rol: adminInoutRole,
        }));
      }
    }

    // Variables con límites altos (sin restricción práctica)
    const variables = [
      { variableName: 'nDiasUso', displayName: 'Límite Temporal de Uso (días)', maxValue: 0 },
      { variableName: 'nMateriales', displayName: 'Materiales', maxValue: 99999 },
      { variableName: 'nMaterialesT', displayName: 'Materiales Compuestos', maxValue: 99999 },
      { variableName: 'nProductos', displayName: 'Productos', maxValue: 99999 },
      { variableName: 'nLotes', displayName: 'Lotes de Producción', maxValue: 99999 },
      { variableName: 'nClientes', displayName: 'Clientes', maxValue: 99999 },
      { variableName: 'nVentas', displayName: 'Ventas', maxValue: 99999 },
      { variableName: 'nSesionesCap', displayName: 'Sesiones de Capacitación', maxValue: 99999 },
      { variableName: 'nProveedores', displayName: 'Proveedores', maxValue: 99999 },
    ];

    for (const varData of variables) {
      const existing = await ulvRepo.findOne({ where: { packageId: pkg.id, variableName: varData.variableName } });
      if (!existing) {
        await ulvRepo.save(ulvRepo.create({
          ...varData,
          targetApplication: 'Inout',
          limitType: 'quantity',
          packageId: pkg.id,
        }));
      }
    }
  }
}
