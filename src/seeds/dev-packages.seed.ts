import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { PaymentMode } from '../contract/enums/payment-mode.enum';

/**
 * Paquetes DEV — acceso completo (full), no facturable, no visible en landing.
 * Para desarrolladores y testing interno.
 * Se crea un paquete DEV por cada aplicación y un contrato para el usuario admin.
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
    // 1. AUTHORIZA DEV
    // ================================================================
    await this.createAuthorizaDev(packageRepo, configRepo, rolRepo, entityCodeService);

    // ================================================================
    // 2. FACTONET DEV
    // ================================================================
    await this.createFactonetDev(packageRepo, configRepo, rolRepo, entityCodeService);

    // ================================================================
    // 3. INOUT DEV
    // ================================================================
    await this.createInoutDev(packageRepo, ulvRepo, configRepo, rolRepo, entityCodeService);

    // ================================================================
    // 4. KIRI DEV
    // ================================================================
    await this.createKiriDev(packageRepo, ulvRepo, configRepo, rolRepo, entityCodeService);

    // ================================================================
    // Asignar contratos DEV al usuario admin (ti.cyclonet@hotmail.com)
    // ================================================================
    await this.assignAdminContracts(dataSource, packageRepo, entityCodeService);

    console.log('✅ Paquetes DEV configurados');
  }

  // ─────────────────────────────────────────────────────────────────
  // AUTHORIZA DEV — Admin de la plataforma Authoriza
  // ─────────────────────────────────────────────────────────────────
  private async createAuthorizaDev(
    packageRepo: any, configRepo: any, rolRepo: any, entityCodeService: EntityCodeService,
  ) {
    const name = 'AUTHORIZA DEV';
    let pkg = await packageRepo.findOne({ where: { name } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name,
        code,
        displayName: 'AUTHORIZA DEV',
        description: 'Acceso completo a Authoriza. Para administración y testing.',
        price: 0,
        isBillable: false,
        showInLanding: false,
        displayOrder: 99,
        isHighlighted: false,
        ctaLabel: '',
        ctaType: 'register',
      });
      pkg.targetApplication = 'Authoriza';
      await packageRepo.save(pkg);
      console.log('  ✅ AUTHORIZA DEV creado:', pkg.id);
    } else {
      console.log('  ⚠️ AUTHORIZA DEV ya existe:', pkg.id);
    }

    const roles = [
      { strName: 'adminAuthoriza', totalAccount: 2 },
    ];
    await this.assignRolesToPackage(configRepo, rolRepo, pkg, roles);
  }

  // ─────────────────────────────────────────────────────────────────
  // FACTONET DEV — Acceso completo a FactoNet
  // ─────────────────────────────────────────────────────────────────
  private async createFactonetDev(
    packageRepo: any, configRepo: any, rolRepo: any, entityCodeService: EntityCodeService,
  ) {
    const name = 'FACTONET DEV';
    let pkg = await packageRepo.findOne({ where: { name } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name,
        code,
        displayName: 'FACTONET DEV',
        description: 'Acceso completo a FactoNet. Gestión de contratos, facturación y cobros sin límites.',
        price: 0,
        isBillable: false,
        showInLanding: false,
        displayOrder: 99,
        isHighlighted: false,
        ctaLabel: '',
        ctaType: 'register',
      });
      pkg.targetApplication = 'Factonet';
      await packageRepo.save(pkg);
      console.log('  ✅ FACTONET DEV creado:', pkg.id);
    } else {
      console.log('  ⚠️ FACTONET DEV ya existe:', pkg.id);
    }

    const roles = [
      { strName: 'adminFactonet', totalAccount: 2 },
      { strName: 'adminInvoices', totalAccount: 10 },
    ];
    await this.assignRolesToPackage(configRepo, rolRepo, pkg, roles);
  }

  // ─────────────────────────────────────────────────────────────────
  // INOUT DEV — Acceso completo a InOut sin límites
  // ─────────────────────────────────────────────────────────────────
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
        description: 'Acceso completo a InOut sin límites. Para desarrollo y testing.',
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

    const roles = [
      { strName: 'adminInout', totalAccount: 10 },
    ];
    await this.assignRolesToPackage(configRepo, rolRepo, pkg, roles);

    // Variables con límites altos (sin restricción práctica)
    const variables = [
      { variableName: 'nDiasUso', displayName: 'Límite Temporal de Uso (días)', maxValue: 0 },
      { variableName: 'nMateriales', displayName: 'Materiales', maxValue: 99999 },
      { variableName: 'nMaterialesT', displayName: 'Materiales Compuestos', maxValue: 99999 },
      { variableName: 'nProductos', displayName: 'Productos', maxValue: 99999 },
      { variableName: 'nLotes', displayName: 'Lotes de Producción', maxValue: 99999 },
      { variableName: 'nClientes', displayName: 'Clientes', maxValue: 99999 },
      { variableName: 'nVentas', displayName: 'Ventas', maxValue: 99999 },
      { variableName: 'nPedidos', displayName: 'Pedidos', maxValue: 99999 },
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

  // ─────────────────────────────────────────────────────────────────
  // KIRI DEV — Acceso completo a Kiri Finance
  // ─────────────────────────────────────────────────────────────────
  private async createKiriDev(
    packageRepo: any, ulvRepo: any, configRepo: any, rolRepo: any, entityCodeService: EntityCodeService,
  ) {
    const name = 'KIRI DEV';
    let pkg = await packageRepo.findOne({ where: { name } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name,
        code,
        displayName: 'KIRI DEV',
        description: 'Acceso completo a Kiri Finance. Todas las funcionalidades habilitadas.',
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

    const roles = [
      { strName: 'adminKiri', totalAccount: 1 },
    ];
    await this.assignRolesToPackage(configRepo, rolRepo, pkg, roles);

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

  // ─────────────────────────────────────────────────────────────────
  // Helper: asignar roles a un paquete
  // ─────────────────────────────────────────────────────────────────
  private async assignRolesToPackage(
    configRepo: any, rolRepo: any, pkg: any, roles: { strName: string; totalAccount: number }[],
  ) {
    for (const rolData of roles) {
      const role = await rolRepo.findOne({ where: { strName: rolData.strName } });
      if (role) {
        const existingConfig = await configRepo.findOne({
          where: { package: { id: pkg.id }, rol: { id: role.id } },
        });
        if (!existingConfig) {
          await configRepo.save(configRepo.create({
            price: 0,
            totalAccount: rolData.totalAccount,
            package: pkg,
            rol: role,
          }));
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Asignar contratos DEV al usuario admin (ti.cyclonet@hotmail.com)
  // ─────────────────────────────────────────────────────────────────
  private async assignAdminContracts(
    dataSource: DataSource, packageRepo: any, entityCodeService: EntityCodeService,
  ) {
    const userRepo = dataSource.getRepository(User);
    const contractRepo = dataSource.getRepository(Contract);
    const userRoleRepo = dataSource.getRepository(UserRole);
    const rolRepo = dataSource.getRepository(Rol);

    const adminUser = await userRepo.findOne({
      where: { strUserName: 'ti.cyclonet@hotmail.com' },
    });
    if (!adminUser) {
      console.log('  ⏳ Usuario admin no existe aún');
      return;
    }

    // Crear un contrato por cada paquete DEV
    const devPackages = ['AUTHORIZA DEV', 'FACTONET DEV', 'INOUT DEV', 'KIRI DEV'];

    for (const pkgName of devPackages) {
      const pkg = await packageRepo.findOne({ where: { name: pkgName } });
      if (!pkg) continue;

      let contract = await contractRepo.findOne({
        where: { user: { id: adminUser.id }, package: { id: pkg.id } },
      });

      if (!contract) {
        const contractCode = await entityCodeService.generateCode('Contract');
        contract = contractRepo.create({
          code: contractCode,
          codePrefix: 'CNT',
          user: adminUser,
          package: pkg,
          value: 0,
          mode: PaymentMode.MONTHLY,
          payday: 1,
          startDate: new Date(),
          status: ContractStatus.ACTIVE,
        });
        await contractRepo.save(contract);
        console.log(`  ✅ Contrato ${pkgName} creado para admin:`, contract.id);
      }

      // Asignar roles del paquete al usuario vinculados al contrato
      const configs = await dataSource.getRepository(ConfigurationPackage).find({
        where: { package: { id: pkg.id } },
        relations: ['rol'],
      });

      for (const config of configs) {
        if (!config.rol) continue;
        const existingUserRole = await userRoleRepo.findOne({
          where: { userId: adminUser.id, roleId: config.rol.id },
        });
        if (!existingUserRole) {
          await userRoleRepo.save(userRoleRepo.create({
            userId: adminUser.id,
            roleId: config.rol.id,
            contractId: contract.id,
            status: 'ACTIVE',
          }));
          console.log(`    ✅ Rol ${config.rol.strName} asignado`);
        } else if (!existingUserRole.contractId) {
          existingUserRole.contractId = contract.id;
          await userRoleRepo.save(existingUserRole);
        }
      }
    }
  }
}
