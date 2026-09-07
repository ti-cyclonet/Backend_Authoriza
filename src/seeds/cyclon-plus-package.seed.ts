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
 * CYCLON PLUS [+] — Paquete maestro interno.
 *
 * Reemplaza a los antiguos 5 paquetes DEV (uno por app). Es un único paquete,
 * no facturable y no visible en landing, que otorga acceso administrador FULL a
 * TODAS las aplicaciones del ecosistema mediante 5 roles admin (uno por app):
 *   adminAuthoriza, adminFactonet, adminInout, adminKiri, adminShotra.
 *
 * El usuario ti.cyclonet@hotmail.com tiene un ÚNICO contrato indefinido
 * (endDate = null) con este paquete, y desde él administra todo el ecosistema.
 *
 * Los paquetes FREE y de pago (Inout Free/Pro/Enterprise, Kiri, Shotra) NO se
 * tocan: los crean sus propios seeds.
 */
export default class CyclonPlusPackageSeed {
  static readonly PACKAGE_NAME = 'CYCLON PLUS [+]';
  static readonly ADMIN_USERNAME = 'ti.cyclonet@hotmail.com';

  // Los 5 roles administrador (uno por aplicación) que otorga el paquete.
  // totalAccount = cuántas cuentas de ese rol permite el paquete.
  static readonly ADMIN_ROLES: { strName: string; totalAccount: number }[] = [
    { strName: 'adminAuthoriza', totalAccount: 2 },
    { strName: 'adminFactonet', totalAccount: 2 },
    { strName: 'adminInout', totalAccount: 10 },
    { strName: 'adminKiri', totalAccount: 1 },
    { strName: 'adminShotra', totalAccount: 1 },
  ];

  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // 1. Crear el paquete maestro
    const pkg = await this.createPackage(packageRepo, entityCodeService);

    // 2. Asignar los 5 roles admin al paquete (configuration_package)
    await this.assignRolesToPackage(configRepo, rolRepo, pkg);

    // 3. Habilitar todas las features/limites de Inout, Kiri y Shotra en el paquete
    await this.seedUsageLimits(ulvRepo, pkg);

    // 4. Un único contrato indefinido para el usuario admin, con sus 5 roles
    await this.assignAdminContract(dataSource, pkg, entityCodeService);

    console.log('✅ Paquete CYCLON PLUS [+] configurado');
  }

  // ─────────────────────────────────────────────────────────────────
  // Paquete maestro
  // ─────────────────────────────────────────────────────────────────
  private async createPackage(packageRepo: any, entityCodeService: EntityCodeService) {
    const name = CyclonPlusPackageSeed.PACKAGE_NAME;
    let pkg = await packageRepo.findOne({ where: { name } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name,
        code,
        displayName: 'Cyclon Plus [+]',
        description:
          'Acceso administrador completo a todo el ecosistema Cyclonet ' +
          '(Authoriza, FactoNet, InOut, Kiri y Shotra). Paquete interno de administración.',
        price: 0,
        isBillable: false,
        showInLanding: false,
        displayOrder: 99,
        isHighlighted: false,
        ctaLabel: '',
        ctaType: 'register',
      });
      // Paquete transversal: no pertenece a una sola app. Se marca como Authoriza
      // por ser el panel de administración central del ecosistema.
      pkg.targetApplication = 'Authoriza';
      await packageRepo.save(pkg);
      console.log('  ✅ CYCLON PLUS [+] creado:', pkg.id);
    } else {
      console.log('  ⚠️ CYCLON PLUS [+] ya existe:', pkg.id);
    }

    return pkg;
  }

  // ─────────────────────────────────────────────────────────────────
  // Asignar los 5 roles admin al paquete
  // ─────────────────────────────────────────────────────────────────
  private async assignRolesToPackage(configRepo: any, rolRepo: any, pkg: any) {
    for (const rolData of CyclonPlusPackageSeed.ADMIN_ROLES) {
      const role = await rolRepo.findOne({ where: { strName: rolData.strName } });
      if (!role) {
        console.log(`  ⏳ Rol ${rolData.strName} aún no existe (se omite)`);
        continue;
      }
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: role.id } },
      });
      if (!existingConfig) {
        await configRepo.save(
          configRepo.create({
            price: 0,
            totalAccount: rolData.totalAccount,
            package: pkg,
            rol: role,
          }),
        );
        console.log(`    ✅ Rol ${rolData.strName} vinculado al paquete`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Features / límites de uso — acceso FULL a Inout, Kiri y Shotra
  // ─────────────────────────────────────────────────────────────────
  private async seedUsageLimits(ulvRepo: any, pkg: any) {
    type ULV = { variableName: string; displayName: string; maxValue: number; targetApplication: string; limitType: string };
    const vars: ULV[] = [];

    // ── InOut: límites de cantidad sin restricción práctica ──
    const inoutQuantities = [
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
    for (const q of inoutQuantities) {
      vars.push({ ...q, targetApplication: 'Inout', limitType: 'quantity' });
    }

    // ── Kiri: todas las features habilitadas ──
    const kiriFeatureNames: Record<string, string> = {
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
    for (const [variableName, displayName] of Object.entries(kiriFeatureNames)) {
      vars.push({ variableName, displayName, maxValue: 1, targetApplication: 'Kiri', limitType: 'feature' });
    }

    // ── Shotra: features + límites de cantidad ──
    const shotraFeatureNames: Record<string, string> = {
      basicMessaging: 'Mensajería básica',
      basicProfile: 'Perfil básico',
      ratings: 'Evaluaciones',
      priorityMatching: 'Matching prioritario',
      featuredProvider: 'Perfil destacado',
      analytics: 'Analytics de rendimiento',
      unlimitedProposals: 'Propuestas ilimitadas',
      verifiedBadge: 'Insignia verificado',
    };
    for (const [variableName, displayName] of Object.entries(shotraFeatureNames)) {
      vars.push({ variableName, displayName, maxValue: 1, targetApplication: 'Shotra', limitType: 'feature' });
    }
    const shotraQuantities = [
      { variableName: 'nSolicitudes', displayName: 'Solicitudes por mes', maxValue: 99999 },
      { variableName: 'nPropuestas', displayName: 'Propuestas por mes', maxValue: 99999 },
    ];
    for (const q of shotraQuantities) {
      vars.push({ ...q, targetApplication: 'Shotra', limitType: 'quantity' });
    }

    // Idempotente: crear si no existe, sincronizar si cambió.
    for (const v of vars) {
      const existing = await ulvRepo.findOne({ where: { packageId: pkg.id, variableName: v.variableName } });
      if (!existing) {
        await ulvRepo.save(ulvRepo.create({ ...v, packageId: pkg.id }));
      } else if (existing.limitType !== v.limitType || existing.maxValue !== v.maxValue) {
        existing.limitType = v.limitType;
        existing.maxValue = v.maxValue;
        existing.displayName = v.displayName;
        await ulvRepo.save(existing);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Contrato ÚNICO e indefinido para el usuario admin + sus 5 roles
  // ─────────────────────────────────────────────────────────────────
  private async assignAdminContract(dataSource: DataSource, pkg: any, entityCodeService: EntityCodeService) {
    const userRepo = dataSource.getRepository(User);
    const contractRepo = dataSource.getRepository(Contract);
    const userRoleRepo = dataSource.getRepository(UserRole);

    const adminUser = await userRepo.findOne({
      where: { strUserName: CyclonPlusPackageSeed.ADMIN_USERNAME },
    });
    if (!adminUser) {
      console.log('  ⏳ Usuario admin no existe aún');
      return;
    }

    // Un solo contrato para el usuario con este paquete
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
        endDate: null, // indefinido
        status: ContractStatus.ACTIVE,
      });
      await contractRepo.save(contract);
      console.log('  ✅ Contrato CYCLON PLUS [+] (indefinido) creado para admin:', contract.id);
    } else if (contract.endDate !== null) {
      // Garantizar que el contrato quede indefinido
      contract.endDate = null;
      await contractRepo.save(contract);
      console.log('  🔄 Contrato CYCLON PLUS [+] marcado como indefinido');
    }

    // Asignar los roles del paquete al usuario, vinculados a este contrato
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
        await userRoleRepo.save(
          userRoleRepo.create({
            userId: adminUser.id,
            roleId: config.rol.id,
            contractId: contract.id,
            status: 'ACTIVE',
          }),
        );
        console.log(`    ✅ Rol ${config.rol.strName} asignado al admin`);
      } else if (!existingUserRole.contractId) {
        existingUserRole.contractId = contract.id;
        await userRoleRepo.save(existingUserRole);
      }
    }
  }
}
