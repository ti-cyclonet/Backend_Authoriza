import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

export default class KiriPackagesSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // ================================================================
    // PAQUETE 1: KIRI FREE
    // ================================================================
    const freePackageName = 'KIRI FREE';
    let freePkg = await packageRepo.findOne({ where: { name: freePackageName } });

    if (!freePkg) {
      const code = await entityCodeService.generateCode('Package');
      freePkg = packageRepo.create({
        name: freePackageName,
        code,
        displayName: 'KIRI FREE',
        description:
          'Gestión básica de tus finanzas personales. Controla ingresos, deudas y gastos fijos con distribución inteligente de presupuesto.',
        price: 0,
        isBillable: false,
        showInLanding: true,
        displayOrder: 1,
        isHighlighted: false,
        ctaLabel: 'Comenzar gratis',
        ctaType: 'register',
        targetApplication: 'Kiri',
      });
      await packageRepo.save(freePkg);
      console.log('✅ Paquete KIRI FREE creado:', freePkg.id);
    } else {
      console.log('⚠️ Paquete KIRI FREE ya existe con ID:', freePkg.id);
    }

    // Variables del plan FREE (features habilitadas/deshabilitadas)
    const freeVariables = [
      // Funcionalidades incluidas (lo esencial)
      { variableName: 'budgetManagement', displayName: 'Gestión de presupuesto', maxValue: 1, limitType: 'feature' },
      { variableName: 'debtsTracking', displayName: 'Control de deudas', maxValue: 1, limitType: 'feature' },
      { variableName: 'fixedExpenses', displayName: 'Gastos fijos', maxValue: 1, limitType: 'feature' },
      { variableName: 'basicReports', displayName: 'Reportes básicos', maxValue: 1, limitType: 'feature' },
      // Funcionalidades NO incluidas
      { variableName: 'impulseExpenses', displayName: 'Gastos hormiga', maxValue: 0, limitType: 'feature' },
      { variableName: 'savingsPockets', displayName: 'Bolsillos de ahorro', maxValue: 0, limitType: 'feature' },
      { variableName: 'extraIncomes', displayName: 'Ingresos extras', maxValue: 0, limitType: 'feature' },
      { variableName: 'emergencyFund', displayName: 'Fondo de emergencia', maxValue: 0, limitType: 'feature' },
      { variableName: 'gamification', displayName: 'Gamificación y jardín virtual', maxValue: 0, limitType: 'feature' },
      { variableName: 'aiCoach', displayName: 'Asistente IA financiero', maxValue: 0, limitType: 'feature' },
      { variableName: 'advancedReports', displayName: 'Reportes avanzados (PDF/Excel)', maxValue: 0, limitType: 'feature' },
      { variableName: 'debtStrategies', displayName: 'Estrategias de deuda (Bola de nieve / Avalancha)', maxValue: 0, limitType: 'feature' },
      { variableName: 'socialConnections', displayName: 'Conexiones sociales', maxValue: 0, limitType: 'feature' },
      { variableName: 'sharedPockets', displayName: 'Bolsillos compartidos', maxValue: 0, limitType: 'feature' },
      { variableName: 'p2pLoans', displayName: 'Préstamos P2P', maxValue: 0, limitType: 'feature' },
    ];

    for (const varData of freeVariables) {
      const existing = await ulvRepo.findOne({
        where: { packageId: freePkg.id, variableName: varData.variableName },
      });
      if (!existing) {
        const ulv = ulvRepo.create({
          ...varData,
          targetApplication: 'Kiri',
          packageId: freePkg.id,
        });
        await ulvRepo.save(ulv);
      }
    }
    console.log('  ✅ Variables KIRI FREE configuradas');

    // ================================================================
    // PAQUETE 2: KIRI PLUS
    // ================================================================
    const plusPackageName = 'KIRI PLUS';
    let plusPkg = await packageRepo.findOne({ where: { name: plusPackageName } });

    if (!plusPkg) {
      const code = await entityCodeService.generateCode('Package');
      plusPkg = packageRepo.create({
        name: plusPackageName,
        code,
        displayName: 'KIRI PLUS',
        description:
          'Todas las funcionalidades de Kiri Finance. Asistente IA, reportes avanzados, estrategias de deuda, funciones sociales y sin límites en registros.',
        price: 29900,
        isBillable: true,
        showInLanding: true,
        displayOrder: 2,
        isHighlighted: true,
        ctaLabel: 'Elegir Plan',
        ctaType: 'register',
        targetApplication: 'Kiri',
      });
      await packageRepo.save(plusPkg);
      console.log('✅ Paquete KIRI PLUS creado:', plusPkg.id);
    } else {
      console.log('⚠️ Paquete KIRI PLUS ya existe con ID:', plusPkg.id);
    }

    // Variables del plan PLUS (todas las features habilitadas)
    const plusVariables = [
      // Todas las funcionalidades habilitadas
      { variableName: 'budgetManagement', displayName: 'Gestión de presupuesto', maxValue: 1, limitType: 'feature' },
      { variableName: 'debtsTracking', displayName: 'Control de deudas', maxValue: 1, limitType: 'feature' },
      { variableName: 'fixedExpenses', displayName: 'Gastos fijos', maxValue: 1, limitType: 'feature' },
      { variableName: 'impulseExpenses', displayName: 'Gastos hormiga', maxValue: 1, limitType: 'feature' },
      { variableName: 'savingsPockets', displayName: 'Bolsillos de ahorro', maxValue: 1, limitType: 'feature' },
      { variableName: 'extraIncomes', displayName: 'Ingresos extras', maxValue: 1, limitType: 'feature' },
      { variableName: 'emergencyFund', displayName: 'Fondo de emergencia', maxValue: 1, limitType: 'feature' },
      { variableName: 'gamification', displayName: 'Gamificación y jardín virtual', maxValue: 1, limitType: 'feature' },
      { variableName: 'basicReports', displayName: 'Reportes básicos', maxValue: 1, limitType: 'feature' },
      { variableName: 'advancedReports', displayName: 'Reportes avanzados (PDF/Excel)', maxValue: 1, limitType: 'feature' },
      { variableName: 'debtStrategies', displayName: 'Estrategias de deuda (Bola de nieve / Avalancha)', maxValue: 1, limitType: 'feature' },
      { variableName: 'aiCoach', displayName: 'Asistente IA financiero', maxValue: 1, limitType: 'feature' },
      { variableName: 'socialConnections', displayName: 'Conexiones sociales', maxValue: 1, limitType: 'feature' },
      { variableName: 'sharedPockets', displayName: 'Bolsillos compartidos', maxValue: 1, limitType: 'feature' },
      { variableName: 'p2pLoans', displayName: 'Préstamos P2P', maxValue: 1, limitType: 'feature' },
    ];

    for (const varData of plusVariables) {
      const existing = await ulvRepo.findOne({
        where: { packageId: plusPkg.id, variableName: varData.variableName },
      });
      if (!existing) {
        const ulv = ulvRepo.create({
          ...varData,
          targetApplication: 'Kiri',
          packageId: plusPkg.id,
        });
        await ulvRepo.save(ulv);
      }
    }
    console.log('  ✅ Variables KIRI PLUS configuradas');
  }
}
