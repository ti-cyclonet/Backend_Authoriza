import { DataSource } from 'typeorm';
import { Package } from '../package/entities/package.entity';
import { UsageLimitVariable } from '../usage-limit-variables/entities/usage-limit-variable.entity';
import { ConfigurationPackage } from '../configuration-package/entities/configuration-package.entity';
import { Rol } from '../roles/entities/rol.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

export default class InoutFreePackageSeed {
  async run(dataSource: DataSource): Promise<void> {
    const packageRepo = dataSource.getRepository(Package);
    const ulvRepo = dataSource.getRepository(UsageLimitVariable);
    const configRepo = dataSource.getRepository(ConfigurationPackage);
    const rolRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const entityCodeService = new EntityCodeService(entityCodeRepo);

    // ========== PAQUETE CN-00 FREE (InOut) ==========
    const packageName = 'CN-00 FREE';
    let pkg = await packageRepo.findOne({ where: { name: packageName } });

    if (!pkg) {
      const code = await entityCodeService.generateCode('Package');
      pkg = packageRepo.create({
        name: packageName,
        code,
        displayName: 'CN-00 FREE',
        description:
          'Para pruebas de clientes potenciales. Acceso completo a las funcionalidades base con límites reducidos durante 30 días.',
        price: 0,
        isBillable: false,
        showInLanding: true,
        displayOrder: 1,
        isHighlighted: false,
        ctaLabel: 'Probar',
        ctaType: 'register',
      });
      pkg.targetApplication = 'Inout';
      await packageRepo.save(pkg);
      console.log('✅ Paquete CN-00 FREE (InOut) creado:', pkg.id);
    } else {
      // Update displayOrder if needed
      if (pkg.displayOrder !== 1) {
        pkg.displayOrder = 1;
        await packageRepo.save(pkg);
      }
      console.log('⚠️ Paquete CN-00 FREE ya existe con ID:', pkg.id);
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
          totalAccount: 1,
          package: pkg,
          rol: adminInoutRole,
        });
        await configRepo.save(config);
        console.log('  ✅ Rol adminInout (1 cuenta) asignado al paquete FREE');
      }
    }

    // ========== VARIABLES DE LÍMITE ==========
    // Orden idéntico al PRO para que la landing los muestre igual
    const variables = [
      { variableName: 'nDiasUso', displayName: 'Días de uso', maxValue: 20, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMateriales', displayName: 'Materiales', maxValue: 5, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMaterialesT', displayName: 'Materiales Compuestos', maxValue: 2, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProductos', displayName: 'Productos', maxValue: 2, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nLotes', displayName: 'Lotes de Producción', maxValue: 2, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nClientes', displayName: 'Clientes', maxValue: 5, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nVentas', displayName: 'Ventas', maxValue: 10, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nPedidos', displayName: 'Pedidos', maxValue: 5, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nSesionesCap', displayName: 'Sesiones de Capacitación', maxValue: 3, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProveedores', displayName: 'Proveedores', maxValue: 3, targetApplication: 'Inout', limitType: 'quantity' },
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

    console.log('  ✅ Paquete CN-00 FREE configurado completamente');
  }
}
