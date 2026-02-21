import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRolesService } from '../user-roles/user-roles.service';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Contract } from '../contract/entities/contract.entity';
import * as readline from 'readline';

async function setupInitialAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);
  const contractRepo = dataSource.getRepository(Contract);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
  };

  try {
    console.log('\n🔧 Configuración inicial de administrador\n');

    const tiCyclonet = await userRepo.findOne({ 
      where: { strUserName: 'ti.cyclonet@hotmail.com' }
    });

    if (!tiCyclonet) {
      console.log('❌ Usuario ti.cyclonet no encontrado');
      process.exit(1);
    }

    console.log(`✅ Usuario principal: ${tiCyclonet.strUserName}`);

    const contract = await contractRepo.findOne({
      where: { user: { id: tiCyclonet.id } },
      relations: ['package']
    });

    if (!contract) {
      console.log('❌ Contrato no encontrado');
      process.exit(1);
    }

    console.log(`✅ Contrato: ${contract.code} - ${contract.package.name}\n`);

    const newAdminEmail = await question('📧 Email del nuevo administrador: ');

    const newAdmin = await userRepo.findOne({ where: { strUserName: newAdminEmail } });

    if (!newAdmin) {
      console.log(`❌ Usuario ${newAdminEmail} no encontrado. Créalo primero.`);
      process.exit(1);
    }

    console.log(`✅ Nuevo administrador: ${newAdmin.strUserName}\n`);

    const confirm = await question('⚠️  ¿Confirmar transferencia? (si/no): ');
    
    if (confirm.toLowerCase() !== 'si') {
      console.log('❌ Operación cancelada');
      process.exit(0);
    }

    const userRolesService = app.get(UserRolesService);
    await userRolesService.transferAdminRole(tiCyclonet.id, newAdminEmail, contract.id);

    console.log('\n✅ Transferencia completada:');
    console.log(`   - ${tiCyclonet.strUserName} → accountOwner`);
    console.log(`   - ${newAdmin.strUserName} → adminAuthoriza\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    await app.close();
  }
}

setupInitialAdmin();
