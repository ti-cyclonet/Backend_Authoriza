import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';
import { LegalEntityData } from 'src/legal-entity-data/entities/legal-entity-data.entity';
import { DocumentType } from 'src/document-types/entities/document-type.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { UserRole } from 'src/user-roles/entities/user-role.entity';
import { Package } from 'src/package/entities/package.entity';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';
import { Contract } from 'src/contract/entities/contract.entity';
import { ContractStatus } from 'src/contract/enums/contract-status.enum';
import { PaymentMode } from 'src/contract/enums/payment-mode.enum';
import { EntityCodeService } from 'src/entity-codes/services/entity-code.service';
import { EntityCode } from 'src/entity-codes/entities/entity-code.entity';
import * as bcrypt from 'bcrypt';

export default class UserSeed {
  async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const basicRepo = dataSource.getRepository(BasicData);
    const legalRepo = dataSource.getRepository(LegalEntityData);
    const roleRepo = dataSource.getRepository(Rol);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    const documentTypeRepo = dataSource.getRepository(DocumentType);
    
    // Initialize entity code service
    const entityCodeService = new EntityCodeService(entityCodeRepo);
    await entityCodeService.initializeEntityCodes();

    // ========== 0️⃣ CREAR TIPOS DE DOCUMENTO ==========
    const documentTypes = [
      { code: 'CC', description: 'Cédula de ciudadanía' },
      { code: 'CE', description: 'Cédula de extranjería' },
      { code: 'PP', description: 'Pasaporte' },
      { code: 'TI', description: 'Tarjeta de identidad' },
      { code: 'NIT', description: 'Nit' }
    ];

    for (const docType of documentTypes) {
      const existing = await documentTypeRepo.findOne({ where: { documentType: docType.code } });
      if (!existing) {
        const newDocType = documentTypeRepo.create({
          documentType: docType.code,
          description: docType.description
        });
        await documentTypeRepo.save(newDocType);
        console.log(`✅ Tipo de documento creado: ${docType.code}`);
      }
    }

    // ========== 1️⃣ CREAR USUARIO ==========
    let user = await userRepo.findOne({
      where: { strUserName: 'ti.cyclonet@hotmail.com' },
    });

    if (!user) {
      const plainPassword = '1234567890';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const code = await entityCodeService.generateCode('User');

      user = userRepo.create({
        strUserName: 'ti.cyclonet@hotmail.com',
        strPassword: hashedPassword,
        code,
        strStatus: 'ACTIVE',
        mustChangePassword: true,
        dtmLatestUpdateDate: new Date(),
      });
      await userRepo.save(user);
      console.log('✅ Usuario creado:', user.id, 'Code:', code);
    } else {
      console.log('⚠️ Usuario ya existe con ID:', user.id);
    }

    // ========== 2️⃣ CREAR BASIC DATA ==========
    let basic = await basicRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!basic) {
      // Buscar el tipo de documento NIT
      const nitDocumentType = await documentTypeRepo.findOne({
        where: { documentType: 'NIT' }
      });

      basic = basicRepo.create({
        strPersonType: 'J',
        strStatus: 'ACTIVE',
        documentTypeId: nitDocumentType?.id,
        documentNumber: '900515884-3',
        user,
      });
      await basicRepo.save(basic);

      // 👇 Relacionar en la entidad User
      user.basicData = basic;
      await userRepo.save(user);

      console.log('✅ BasicData creado y asociado al usuario:', basic.id);
    } else {
      console.log('⚠️ BasicData ya existe con ID:', basic.id);

      // Asegurar que el user tenga la relación
      if (!user.basicData) {
        user.basicData = basic;
        await userRepo.save(user);
        console.log('🔄 Relación BasicData ↔ User corregida');
      }
    }

    // ========== 3️⃣ CREAR LEGAL ENTITY ==========
    let legal = await legalRepo.findOne({
      where: { basicData: { id: basic.id } },
    });

    if (!legal) {
      legal = legalRepo.create({
        businessName: 'Cyclonet S. A. S.',
        webSite: 'https://www.cyclonet.com.co',
        contactName: 'Alfredo Mamby Bossa',
        contactEmail: 'amambyb@hotmail.com',
        contactPhone: '3144144986',
        basicData: basic,
      });
      await legalRepo.save(legal);
      console.log('✅ LegalEntityData creado:', legal.id);
    } else {
      console.log('⚠️ LegalEntityData ya existe con ID:', legal.id);
    }

    // ========== 4️⃣ CREAR PAQUETE CYCLON PLUS [+] ==========
    const packageRepo = dataSource.getRepository(Package);
    let cycloPackage = await packageRepo.findOne({
      where: { name: 'Cyclon Plus [+]' }
    });

    if (!cycloPackage) {
      const packageCode = await entityCodeService.generateCode('Package');
      cycloPackage = packageRepo.create({
        name: 'Cyclon Plus [+]',
        description: 'Paquete básico que incluye una cuenta de administrador para las aplicaciones Authoriza, FactoNet e InOut',
        code: packageCode
      });
      await packageRepo.save(cycloPackage);
      console.log('✅ Paquete Cyclon Plus [+] creado:', cycloPackage.id);
    } else {
      console.log('⚠️ Paquete Cyclon Plus [+] ya existe con ID:', cycloPackage.id);
    }

    // ========== 5️⃣ CREAR CONFIGURACIONES DEL PAQUETE ==========
    const configPackageRepo = dataSource.getRepository(ConfigurationPackage);
    const roleNames = ['adminAuthoriza', 'adminFactonet', 'adminInout'];

    for (const roleName of roleNames) {
      const role = await roleRepo.findOne({ where: { strName: roleName } });
      
      if (role) {
        const existingConfig = await configPackageRepo.findOne({
          where: { package: { id: cycloPackage.id }, rol: { id: role.id } }
        });

        if (!existingConfig) {
          const config = configPackageRepo.create({
            package: cycloPackage,
            rol: role,
            price: 0,
            totalAccount: 1
          });
          await configPackageRepo.save(config);
          console.log(`✅ Configuración creada para rol ${roleName} con 1 cuenta`);
        }
      } else {
        console.log(`❌ Rol ${roleName} no encontrado`);
      }
    }

    // ========== 6️⃣ CREAR CONTRATO ==========
    const contractRepo = dataSource.getRepository(Contract);
    const existingContract = await contractRepo.findOne({
      where: { user: { id: user.id }, package: { id: cycloPackage.id } }
    });

    if (!existingContract) {
      const contractCode = await entityCodeService.generateCode('Contract');
      const contract = contractRepo.create({
        code: contractCode,
        codePrefix: 'CNT',
        user: user,
        package: cycloPackage,
        value: 0,
        mode: PaymentMode.MONTHLY,
        payday: 1,
        startDate: new Date(),
        status: ContractStatus.ACTIVE
      });
      await contractRepo.save(contract);
      console.log('✅ Contrato creado:', contract.id);
    } else {
      console.log('⚠️ Contrato ya existe');
    }

    // ========== 7️⃣ ASIGNAR ROL ADMINAUTHORIZA ==========
    const adminRole = await roleRepo.findOne({
      where: { strName: 'adminAuthoriza' },
    });

    if (adminRole) {
      const contract = await contractRepo.findOne({
        where: { user: { id: user.id }, package: { id: cycloPackage.id } }
      });

      const userRoleRepo = dataSource.getRepository(UserRole);
      const existingUserRole = await userRoleRepo.findOne({
        where: { userId: user.id, roleId: adminRole.id }
      });

      if (!existingUserRole) {
        const userRole = userRoleRepo.create({
          userId: user.id,
          roleId: adminRole.id,
          contractId: contract?.id || null,
          status: 'ACTIVE'
        });
        await userRoleRepo.save(userRole);
        console.log('✅ Rol adminAuthoriza asignado al usuario principal');
      }
    }
  }
}
