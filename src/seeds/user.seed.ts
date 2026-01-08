import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';
import { LegalEntityData } from 'src/legal-entity-data/entities/legal-entity-data.entity';
import { DocumentType } from 'src/document-types/entities/document-type.entity';
import { Rol } from 'src/roles/entities/rol.entity';
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
      relations: ['rol'],
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
        documentNumber: '900515884-4',
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

    // ========== 4️⃣ ASIGNAR ROL ==========
    const role = await roleRepo.findOne({
      where: { strName: 'adminAuthoriza' },
    });

    if (role) {
      if (!user.rol || user.rol.id !== role.id) {
        user.rol = role;
        await userRepo.save(user);
        console.log('✅ Rol asignado al usuario');
      } else {
        console.log('⚠️ Rol ya asignado al usuario');
      }
    } else {
      console.log('❌ Rol ADMIN no encontrado en la base de datos');
    }
  }
}
