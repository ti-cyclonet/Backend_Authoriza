import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Rol } from '../roles/entities/rol.entity';
import { Application } from '../applications/entities/application.entity';

async function createAccountOwnerRole() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const rolRepo = dataSource.getRepository(Rol);
  const appRepo = dataSource.getRepository(Application);

  try {
    const existing = await rolRepo.findOne({ where: { strName: 'accountOwner' } });
    
    if (existing) {
      console.log('⚠️  Rol accountOwner ya existe');
      process.exit(0);
    }

    const authorizaApp = await appRepo.findOne({ where: { strName: 'Authoriza' } });
    
    if (!authorizaApp) {
      console.log('❌ Aplicación Authoriza no encontrada');
      process.exit(1);
    }

    const accountOwnerRole = rolRepo.create({
      strName: 'accountOwner',
      strDescription1: 'Propietario de cuenta',
      strDescription2: 'Usuario principal que gestiona contratos y facturación',
      code: 'ROL-OWNER',
      strApplication: authorizaApp
    });

    await rolRepo.save(accountOwnerRole);
    console.log('✅ Rol accountOwner creado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await app.close();
  }
}

createAccountOwnerRole();
