import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Contract } from '../contract/entities/contract.entity';
import { Package } from '../package/entities/package.entity';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Rol } from '../roles/entities/rol.entity';
import { BasicData } from '../basic-data/entities/basic-data.entity';
import { NaturalPersonData } from '../natural-person-data/entities/natural-person-data.entity';
import { LegalEntityData } from '../legal-entity-data/entities/legal-entity-data.entity';
import { DocumentType } from '../document-types/entities/document-type.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { PaymentMode } from '../contract/enums/payment-mode.enum';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SelfRegisterDto, VerifyRegistrationDto } from './dto/self-register.dto';

@Injectable()
export class SelfRegistrationService {
  private readonly logger = new Logger(SelfRegistrationService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Contract) private contractRepository: Repository<Contract>,
    @InjectRepository(Package) private packageRepository: Repository<Package>,
    @InjectRepository(UserDependency) private userDependencyRepository: Repository<UserDependency>,
    @InjectRepository(UserRole) private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Rol) private rolRepository: Repository<Rol>,
    @InjectRepository(BasicData) private basicDataRepository: Repository<BasicData>,
    @InjectRepository(DocumentType) private documentTypeRepository: Repository<DocumentType>,
    private dataSource: DataSource,
    private entityCodeService: EntityCodeService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: SelfRegisterDto) {
    // 1. Validate package exists
    const pkg = await this.packageRepository.findOne({
      where: { id: dto.packageId },
      relations: ['usageLimitVariables'],
    });
    if (!pkg) throw new BadRequestException('Paquete no encontrado');

    // 2. Check email uniqueness
    const principalExists = await this.userRepository.findOne({
      where: { strUserName: dto.principal.email },
    });
    if (principalExists)
      throw new ConflictException('El email del propietario ya está registrado');

    const dependentExists = await this.userRepository.findOne({
      where: { strUserName: dto.dependent.email },
    });
    if (dependentExists)
      throw new ConflictException('El email del operador ya está registrado');

    // 3. Resolve document type IDs
    const principalDocType = await this.documentTypeRepository.findOne({
      where: { documentType: dto.principal.documentType },
    });

    const dependentDocTypeCode = dto.dependent.documentType || 'CC';
    const dependentDocType = await this.documentTypeRepository.findOne({
      where: { documentType: dependentDocTypeCode },
    });

    // 4. Execute in transaction
    const result = await this.dataSource.transaction(async (manager) => {
      const hashedPassword = await bcrypt.hash('1234567890', 10);

      // 4.1 Create principal user
      const principalCode = await this.entityCodeService.generateCode('User');
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + 24);

      const principalUser = manager.create(User, {
        strUserName: dto.principal.email,
        strPassword: hashedPassword,
        code: principalCode,
        strStatus: 'UNCONFIRMED',
        isVerified: false,
        mustChangePassword: true,
        lastPasswordChange: new Date(),
        verificationCode,
        verificationExpires,
      });
      const savedPrincipal = await manager.save(principalUser);

      // 4.2 Create BasicData for principal
      const basicData = manager.create(BasicData, {
        strPersonType: dto.principal.personType as 'N' | 'J',
        strStatus: 'ACTIVE',
        documentTypeId: principalDocType?.id || null,
        documentNumber: dto.principal.documentNumber,
        user: savedPrincipal,
      });
      const savedBasicData = await manager.save(basicData);

      // 4.3 Create person-specific data
      if (dto.principal.personType === 'N') {
        const naturalData = manager.create(NaturalPersonData, {
          firstName: dto.principal.firstName || '',
          secondName: dto.principal.secondName || null,
          firstSurname: dto.principal.firstSurname || '',
          secondSurname: dto.principal.secondSurname || null,
          birthDate: dto.principal.birthdate ? new Date(dto.principal.birthdate) : null,
          sex: dto.principal.gender || null,
          maritalStatus: dto.principal.civilStatus || null,
          basicData: savedBasicData,
        });
        await manager.save(naturalData);
      } else {
        const legalData = manager.create(LegalEntityData, {
          businessName: dto.principal.businessName || '',
          webSite: dto.principal.website || null,
          contactName: dto.principal.contactName || null,
          contactEmail: dto.principal.contactEmail || dto.principal.email,
          contactPhone: dto.principal.phone || '',
          basicData: savedBasicData,
        });
        await manager.save(legalData);
      }

      // 4.4 Create dependent user
      const dependentCode = await this.entityCodeService.generateCode('User');
      const dependentUser = manager.create(User, {
        strUserName: dto.dependent.email,
        strPassword: hashedPassword,
        code: dependentCode,
        strStatus: 'UNCONFIRMED',
        isVerified: false,
        mustChangePassword: true,
        lastPasswordChange: new Date(),
      });
      const savedDependent = await manager.save(dependentUser);

      // 4.5 Create BasicData for dependent
      const depBasicData = manager.create(BasicData, {
        strPersonType: 'N',
        strStatus: 'ACTIVE',
        documentTypeId: dependentDocType?.id || null,
        documentNumber: dto.dependent.documentNumber || '',
        user: savedDependent,
      });
      const savedDepBasicData = await manager.save(depBasicData);

      const depNaturalData = manager.create(NaturalPersonData, {
        firstName: dto.dependent.firstName,
        secondName: dto.dependent.secondName || null,
        firstSurname: dto.dependent.firstSurname,
        secondSurname: dto.dependent.secondSurname || null,
        birthDate: dto.dependent.birthdate ? new Date(dto.dependent.birthdate) : null,
        basicData: savedDepBasicData,
      });
      await manager.save(depNaturalData);

      // 4.6 Create contract
      const contractCode = await this.entityCodeService.generateCode('Contract');
      const today = new Date();
      const nDiasUso = pkg.usageLimitVariables?.find(
        (v) => v.variableName === 'nDiasUso',
      );
      let endDate: Date | null = null;
      if (nDiasUso && nDiasUso.maxValue > 0) {
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + nDiasUso.maxValue);
      }

      const contract = manager.create(Contract, {
        code: contractCode,
        user: { id: savedPrincipal.id } as any,
        package: { id: dto.packageId } as any,
        value: pkg.price || 0,
        mode: PaymentMode.MONTHLY,
        payday: 1,
        startDate: today,
        endDate,
        status: ContractStatus.PENDING,
        businessSector: 'general',
      });
      const savedContract = await manager.save(contract);

      // 4.7 Create user dependency
      const dependency = manager.create(UserDependency, {
        principalUserId: savedPrincipal.id,
        dependentUserId: savedDependent.id,
        status: 'ACTIVE',
      });
      await manager.save(dependency);

      // 4.8 Assign accountOwner role to principal
      const accountOwnerRole = await manager.findOne(Rol, {
        where: { strName: 'accountOwner' },
      });
      if (accountOwnerRole) {
        await manager.save(
          manager.create(UserRole, {
            userId: savedPrincipal.id,
            roleId: accountOwnerRole.id,
            contractId: savedContract.id,
            status: 'ACTIVE',
          }),
        );
      }

      return {
        principalUser: savedPrincipal,
        dependentUser: savedDependent,
        contract: savedContract,
      };
    });

    // 5. Send verification email (outside transaction)
    try {
      const customerName =
        dto.principal.firstName || dto.principal.businessName || 'Usuario';
      const year = new Date().getFullYear().toString();
      const baseUrl = process.env.SELF_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/api/auth/verify-registration?email=${encodeURIComponent(dto.principal.email)}&code=${result.principalUser.verificationCode}`;

      await this.notificationsService.sendByTemplate(
        'USER_VERIFICATION',
        dto.principal.email,
        { customerName, verificationUrl, year },
      );
    } catch (err) {
      this.logger.warn(`Failed to send verification email: ${err.message}`);
    }

    return {
      success: true,
      message: 'Registro exitoso. Revisa tu correo para confirmar.',
      verificationRequired: true,
      data: {
        principalUserId: result.principalUser.id,
        dependentUserId: result.dependentUser.id,
        contractId: result.contract.id,
      },
    };
  }

  async verifyRegistration(dto: VerifyRegistrationDto) {
    const user = await this.userRepository.findOne({
      where: { strUserName: dto.email },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.isVerified)
      return { success: true, message: 'Email ya verificado', contractActivated: true };

    if (user.verificationCode !== dto.code)
      throw new BadRequestException('Código inválido');
    if (user.verificationExpires && new Date() > user.verificationExpires)
      throw new BadRequestException('Código expirado. Solicita uno nuevo.');

    const result = await this.dataSource.transaction(async (manager) => {
      // Verify principal user
      user.isVerified = true;
      user.verificationCode = null;
      user.verificationExpires = null;
      user.strStatus = 'ACTIVE';
      await manager.save(user);

      // Find contract
      const contract = await manager.findOne(Contract, {
        where: { user: { id: user.id } },
        relations: ['package', 'package.usageLimitVariables'],
      });

      if (!contract) throw new NotFoundException('Contrato no encontrado');

      // Determine if free package (auto-activate)
      const nDiasUso = contract.package?.usageLimitVariables?.find(
        (v) => v.variableName === 'nDiasUso',
      );
      const isFree =
        Number(contract.package?.price) === 0 ||
        (nDiasUso && nDiasUso.maxValue > 0);

      if (isFree) {
        // Activate contract
        contract.status = ContractStatus.ACTIVE;
        if (nDiasUso && nDiasUso.maxValue > 0) {
          contract.startDate = new Date();
          const end = new Date();
          end.setDate(end.getDate() + nDiasUso.maxValue);
          contract.endDate = end;
        }
        await manager.save(contract);

        // Activate dependent and assign role
        const dependency = await manager.findOne(UserDependency, {
          where: { principalUserId: user.id, status: 'ACTIVE' },
        });

        if (dependency) {
          const depUser = await manager.findOne(User, {
            where: { id: dependency.dependentUserId },
          });
          if (depUser) {
            depUser.strStatus = 'ACTIVE';
            depUser.isVerified = true;
            await manager.save(depUser);
          }

          // Assign adminInout role
          const adminInoutRole = await manager.findOne(Rol, {
            where: { strName: 'adminInout' },
          });
          if (adminInoutRole) {
            const existingRole = await manager.findOne(UserRole, {
              where: {
                userId: dependency.dependentUserId,
                roleId: adminInoutRole.id,
                contractId: contract.id,
              },
            });
            if (!existingRole) {
              await manager.save(
                manager.create(UserRole, {
                  userId: dependency.dependentUserId,
                  roleId: adminInoutRole.id,
                  contractId: contract.id,
                  status: 'ACTIVE',
                }),
              );
            }
          }
        }
      }

      return { contract, isFree };
    });

    return {
      success: true,
      message: result.isFree
        ? '¡Registro completado! Ya puedes iniciar sesión.'
        : 'Email verificado. Tu contrato será activado por un administrador.',
      contractActivated: result.isFree,
      loginUrl: 'https://inout.cyclonet.com.co',
      data: {
        contractCode: result.contract.code,
        packageName: result.contract.package?.name || '',
        startDate: result.contract.startDate?.toISOString(),
        endDate: result.contract.endDate?.toISOString() || null,
      },
    };
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepository.findOne({
      where: { strUserName: email },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.isVerified) throw new BadRequestException('Email ya verificado');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpires = new Date();
    newExpires.setHours(newExpires.getHours() + 24);

    user.verificationCode = newCode;
    user.verificationExpires = newExpires;
    await this.userRepository.save(user);

    try {
      const year = new Date().getFullYear().toString();
      const baseUrl = process.env.SELF_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/api/auth/verify-registration?email=${encodeURIComponent(email)}&code=${newCode}`;
      await this.notificationsService.sendByTemplate(
        'USER_VERIFICATION',
        email,
        { customerName: 'Usuario', verificationUrl, year },
      );
    } catch (err) {
      this.logger.warn(`Failed to resend verification: ${err.message}`);
    }

    return { message: 'Código reenviado exitosamente.' };
  }

  async sendContactEmail(data: { name: string; email: string; phone?: string; subject?: string; message: string }) {
    const { name, email, phone, subject, message } = data;

    if (!name || !email || !message) {
      throw new BadRequestException('Nombre, email y mensaje son obligatorios.');
    }

    try {
      await this.notificationsService.sendContactForm(
        name,
        email,
        subject || 'Contacto desde Landing InOut',
        `${message}${phone ? '\n\nTeléfono: ' + phone : ''}`,
      );
    } catch (err) {
      this.logger.error(`Failed to send contact email: ${err.message}`);
      throw new BadRequestException('No se pudo enviar el mensaje. Intenta de nuevo.');
    }

    return { success: true, message: 'Mensaje enviado exitosamente.' };
  }
}
