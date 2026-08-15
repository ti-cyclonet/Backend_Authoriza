import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

export default class InoutEnterprisePackageSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // ========== PAQUETE CN-02 ENTERPRISE (InOut) ==========
    const packageName = 'CN-02 ENTERPRISE';
    let pkg = await packageRepo.findOne({ where: { name: packageName } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name: packageName,
        code,
        displayName: 'CN-02 ENTERPRISE',
        description:
          'Para empresas en crecimiento que necesitan operación sin restricciones. Incluye acceso ilimitado a todos los módulos, asistente inteligente CYCLON con IA, predicción de demanda, y soporte prioritario.',
        price: 199000,
        isBillable: true,
        showInLanding: true,
        displayOrder: 3,
        isHighlighted: false,
        ctaLabel: 'Próximamente',
        ctaType: 'contact',
        badge: 'Próximamente',
      });
      pkg.targetApplication = 'Inout';
      await packageRepo.save(pkg);
      console.log('✅ Paquete CN-02 ENTERPRISE (InOut) creado:', pkg.id);
    } else {
      let updated = false;
      if (pkg.displayOrder !== 3) { pkg.displayOrder = 3; updated = true; }
      if (pkg.price !== 199000) { pkg.price = 199000; updated = true; }
      if (updated) await packageRepo.save(pkg);
      console.log('⚠️ Paquete CN-02 ENTERPRISE ya existe con ID:', pkg.id);
    }

    // ========== CONFIGURACIÓN DE ROLES ==========
    const adminInoutRole = await rolRepo.findOne({ where: { strName: 'adminInout' } });
    if (adminInoutRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: adminInoutRole.id } },
      });
      if (!existingConfig) {
        const config = configRepo.create({
          price: 0,
          totalAccount: 5,
          package: pkg,
          rol: adminInoutRole,
        });
        await configRepo.save(config);
        console.log('  ✅ Rol adminInout (5 cuentas) asignado');
      }
    }

    const operatorInoutRole = await rolRepo.findOne({ where: { strName: 'operatorInout' } });
    if (operatorInoutRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: operatorInoutRole.id } },
      });
      if (!existingConfig) {
        const config = configRepo.create({
          price: 0,
          totalAccount: 20,
          package: pkg,
          rol: operatorInoutRole,
        });
        await configRepo.save(config);
        console.log('  ✅ Rol operatorInout (20 cuentas) asignado');
      }
    }

    const viewerInoutRole = await rolRepo.findOne({ where: { strName: 'viewerInout' } });
    if (viewerInoutRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: viewerInoutRole.id } },
      });
      if (!existingConfig) {
        const config = configRepo.create({
          price: 0,
          totalAccount: 10,
          package: pkg,
          rol: viewerInoutRole,
        });
        await configRepo.save(config);
        console.log('  ✅ Rol viewerInout (10 cuentas) asignado');
      }
    }

    // ========== VARIABLES DE LÍMITE (SIN RESTRICCIONES) ==========
    // maxValue: 0 significa ilimitado para nDiasUso (sin límite temporal)
    // maxValue: 999999 significa efectivamente ilimitado para las demás variables
    const variables = [
      { variableName: 'nDiasUso', displayName: 'Límite Temporal de Uso (días)', maxValue: 0, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMateriales', displayName: 'Materiales', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMaterialesT', displayName: 'Materiales Compuestos', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProductos', displayName: 'Productos', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nLotes', displayName: 'Lotes de Producción', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nClientes', displayName: 'Clientes', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nVentas', displayName: 'Ventas', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nPedidos', displayName: 'Pedidos', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nSesionesCap', displayName: 'Sesiones de Capacitación', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProveedores', displayName: 'Proveedores', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      // Variables de IA (funcionalidades futuras)
      { variableName: 'nAIQueries', displayName: 'Consultas IA (CYCLON Assistant)', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nAIPredictions', displayName: 'Predicciones de Demanda', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nAIReports', displayName: 'Reportes Inteligentes', maxValue: 999999, targetApplication: 'Inout', limitType: 'quantity' },
    ];

    for (const varData of variables) {
      const existing = await ulvRepo.findOne({
        where: { packageId: pkg.id, variableName: varData.variableName },
      });

      if (!existing) {
        const ulv = ulvRepo.create({
          ...varData,
          packageId: pkg.id,
        });
        await ulvRepo.save(ulv);
        console.log(`  ✅ Variable ${varData.variableName} = ${varData.maxValue === 999999 ? 'Ilimitado' : varData.maxValue} creada`);
      }
    }

    console.log('  ✅ Paquete CN-02 ENTERPRISE configurado completamente');
  }
}
