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
          'Para pruebas de clientes potenciales. Acceso completo a las funcionalidades del plan Pro durante 30 días.',
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
      // Update description and displayOrder if needed
      let updated = false;
      if (pkg.displayOrder !== 1) { pkg.displayOrder = 1; updated = true; }
      const expectedDesc = 'Para pruebas de clientes potenciales. Acceso completo a las funcionalidades del plan Pro durante 30 días.';
      if (pkg.description !== expectedDesc) { pkg.description = expectedDesc; updated = true; }
      if (updated) await packageRepo.save(pkg);
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

    // Roles adicionales: hasta 2 usuarios extra con operatorInout o viewerInout
    const operatorInoutRole = await rolRepo.findOne({ where: { strName: 'operatorInout' } });
    if (operatorInoutRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: operatorInoutRole.id } },
      });
      if (!existingConfig) {
        const config = configRepo.create({ price: 0, totalAccount: 2, package: pkg, rol: operatorInoutRole });
        await configRepo.save(config);
        console.log('  ✅ Rol operatorInout (2 cuentas) asignado al paquete FREE');
      }
    }

    const viewerInoutRole = await rolRepo.findOne({ where: { strName: 'viewerInout' } });
    if (viewerInoutRole) {
      const existingConfig = await configRepo.findOne({
        where: { package: { id: pkg.id }, rol: { id: viewerInoutRole.id } },
      });
      if (!existingConfig) {
        const config = configRepo.create({ price: 0, totalAccount: 2, package: pkg, rol: viewerInoutRole });
        await configRepo.save(config);
        console.log('  ✅ Rol viewerInout (2 cuentas) asignado al paquete FREE');
      }
    }

    // ========== VARIABLES DE LÍMITE ==========
    // Mismos límites que el plan PRO, pero con 30 días de vigencia
    const variables = [
      { variableName: 'nDiasUso', displayName: 'Días de uso', maxValue: 30, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMateriales', displayName: 'Materiales', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nMaterialesT', displayName: 'Materiales Compuestos', maxValue: 30, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProductos', displayName: 'Productos', maxValue: 20, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nLotes', displayName: 'Lotes de Producción', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nClientes', displayName: 'Clientes', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nVentas', displayName: 'Ventas', maxValue: 100, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nPedidos', displayName: 'Pedidos', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nSesionesCap', displayName: 'Sesiones de Capacitación', maxValue: 3, targetApplication: 'Inout', limitType: 'quantity' },
      { variableName: 'nProveedores', displayName: 'Proveedores', maxValue: 50, targetApplication: 'Inout', limitType: 'quantity' },
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
      } else if (existing.maxValue !== varData.maxValue) {
        // Actualizar si el valor cambió
        existing.maxValue = varData.maxValue;
        await ulvRepo.save(existing);
        console.log(`  🔄 Variable ${varData.variableName} actualizada: ${existing.maxValue} → ${varData.maxValue}`);
      }
    }

    console.log('  ✅ Paquete CN-00 FREE configurado completamente');
  }
}
