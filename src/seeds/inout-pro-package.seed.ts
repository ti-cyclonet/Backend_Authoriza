import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

export default class InoutProPackageSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // ========== PAQUETE CN-01 PRO (InOut) ==========
    const packageName = 'CN-01 PRO';
    let pkg = await packageRepo.findOne({ where: { name: packageName } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name: packageName,
        code,
        displayName: 'CN-01 PRO',
        description:
          'Para negocios que dan sus primeros pasos en la gestión digital. Ideal para emprendimientos y microempresas con operación básica de inventarios y ventas.',
        price: 85000,
        isBillable: true,
        showInLanding: true,
        displayOrder: 1,
        isHighlighted: true,
        ctaLabel: 'Elegir Plan',
        ctaType: 'register',
      });
      pkg.targetApplication = 'Inout';
      await packageRepo.save(pkg);
      console.log('✅ Paquete CN-01 PRO (InOut) creado:', pkg.id);
    } else {
      console.log('⚠️ Paquete CN-01 PRO ya existe con ID:', pkg.id);
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
          totalAccount: 2,
          package: pkg,
          rol: adminInoutRole,
        });
        await configRepo.save(config);
        console.log('  ✅ Rol adminInout (2 cuentas) asignado');
      }
    }

    // ========== VARIABLES DE LÍMITE ==========
    const variables = [
      { variableName: 'nDiasUso', displayName: 'Límite Temporal de Uso (días)', maxValue: 0, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMateriales', displayName: 'Materiales', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMaterialesT', displayName: 'Materiales Compuestos', maxValue: 30, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProductos', displayName: 'Productos', maxValue: 20, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nLotes', displayName: 'Lotes de Producción', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nClientes', displayName: 'Clientes', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nVentas', displayName: 'Ventas', maxValue: 100, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nPedidos', displayName: 'Pedidos', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nSesionesCap', displayName: 'Sesiones de Capacitación', maxValue: 3, targetApplication: 'Inout', limitType: 'quantity' },
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
        console.log(`  ✅ Variable ${varData.variableName} = ${varData.maxValue} creada`);
      }
    }

    console.log('  ✅ Paquete CN-01 PRO configurado completamente');
  }
}
