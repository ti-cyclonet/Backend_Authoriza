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
import { LogsService } from '../logs/logs.service';
import { LogAction } from '../logs/entities/log.entity';
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
    private logsService: LogsService,
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

      // Update principal user with basicData reference
      savedPrincipal.basicData = savedBasicData;
      await manager.save(savedPrincipal);
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
      const depVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const depVerificationExpires = new Date();
      depVerificationExpires.setHours(depVerificationExpires.getHours() + 24);

      const dependentUser = manager.create(User, {
        strUserName: dto.dependent.email,
        strPassword: hashedPassword,
        code: dependentCode,
        strStatus: 'UNCONFIRMED',
        isVerified: false,
        mustChangePassword: true,
        lastPasswordChange: new Date(),
        verificationCode: depVerificationCode,
        verificationExpires: depVerificationExpires,
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

      // Update dependent user with basicData reference
      savedDependent.basicData = savedDepBasicData;
      await manager.save(savedDependent);

      const depNaturalData = manager.create(NaturalPersonData, {
        firstName: dto.dependent.firstName,
        secondName: dto.dependent.secondName || null,
        firstSurname: dto.dependent.firstSurname,
        secondSurname: dto.dependent.secondSurname || null,
        birthDate: dto.dependent.birthdate ? new Date(dto.dependent.birthdate) : null,
        sex: dto.dependent.gender || null,
        maritalStatus: dto.dependent.civilStatus || null,
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

      // Generate codePrefix from principal name
      const principalName = dto.principal.businessName || dto.principal.firstName || dto.principal.email;
      const codePrefix = await this.generateUniqueCodePrefix(principalName, manager);

      const contract = manager.create(Contract, {
        code: contractCode,
        user: { id: savedPrincipal.id } as any,
        package: { id: dto.packageId } as any,
        value: (pkg.price || 0) * 12,
        mode: PaymentMode.MONTHLY,
        payday: 1,
        startDate: today,
        endDate,
        status: ContractStatus.PENDING,
        codePrefix,
        businessSector: dto.businessSector || 'general',
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

    // 5. Send verification emails (outside transaction)
    const apiBaseUrl = process.env.VERIFICATION_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000/api';
    const year = new Date().getFullYear().toString();

    // 5.1 Email to principal
    try {
      const customerName =
        dto.principal.firstName || dto.principal.businessName || 'Usuario';
      const verificationUrl = `${apiBaseUrl}/auth/verify-registration?email=${encodeURIComponent(dto.principal.email)}&code=${result.principalUser.verificationCode}`;

      await this.notificationsService.sendByTemplate(
        'USER_VERIFICATION',
        dto.principal.email,
        { customerName, verificationUrl, year },
      );
    } catch (err) {
      this.logger.warn(`Failed to send verification email to principal: ${err.message}`);
    }

    // 5.2 Email to dependent
    try {
      const depName = dto.dependent.firstName || 'Operador';
      const depVerificationUrl = `${apiBaseUrl}/auth/verify-registration?email=${encodeURIComponent(dto.dependent.email)}&code=${result.dependentUser.verificationCode}`;

      await this.notificationsService.sendByTemplate(
        'USER_VERIFICATION',
        dto.dependent.email,
        { customerName: depName, verificationUrl: depVerificationUrl, year },
      );
    } catch (err) {
      this.logger.warn(`Failed to send verification email to dependent: ${err.message}`);
    }

    // 5.3 Notify adminFactonet users about the new contract
    this.notifyAdminFactonetUsers(result.contract, dto, pkg).catch(err =>
      this.logger.warn(`Failed to notify adminFactonet: ${err.message}`)
    );

    return {
      success: true,
      message: 'Registro exitoso. Ambos correos deben ser confirmados para activar el contrato.',
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
      // Mark this user as verified
      user.isVerified = true;
      user.verificationCode = null;
      user.verificationExpires = null;
      user.strStatus = 'CONFIRMED';
      await manager.save(user);

      // Determine if this user is a principal or dependent
      // Check if there's a contract where this user is the principal
      let contract = await manager.findOne(Contract, {
        where: { user: { id: user.id } },
        relations: ['package', 'package.usageLimitVariables'],
      });

      let isPrincipal = !!contract;
      let principalUserId = user.id;

      // If not a principal, check if this user is a dependent
      if (!contract) {
        const dependency = await manager.findOne(UserDependency, {
          where: { dependentUserId: user.id, status: 'ACTIVE' },
        });
        if (dependency) {
          principalUserId = dependency.principalUserId;
          contract = await manager.findOne(Contract, {
            where: { user: { id: principalUserId } },
            relations: ['package', 'package.usageLimitVariables'],
          });
        }
      }

      if (!contract) throw new NotFoundException('Contrato no encontrado');

      // Check if BOTH users are verified
      const dependency = await manager.findOne(UserDependency, {
        where: { principalUserId, status: 'ACTIVE' },
      });

      let principalVerified = false;
      let dependentVerified = false;

      if (principalUserId === user.id) {
        // Current user is the principal
        principalVerified = true; // Just verified above
        if (dependency) {
          const depUser = await manager.findOne(User, { where: { id: dependency.dependentUserId } });
          dependentVerified = !!depUser?.isVerified;
        }
      } else {
        // Current user is the dependent
        dependentVerified = true; // Just verified above
        const princUser = await manager.findOne(User, { where: { id: principalUserId } });
        principalVerified = !!princUser?.isVerified;
      }

      const bothVerified = principalVerified && dependentVerified;

      // Determine if free package
      const nDiasUso = contract.package?.usageLimitVariables?.find(
        (v) => v.variableName === 'nDiasUso',
      );
      const isFree =
        Number(contract.package?.price) === 0 ||
        (nDiasUso && nDiasUso.maxValue > 0);

      let contractActivated = false;

      // When both verified: assign roles (always) and activate contract (if free)
      if (bothVerified) {
        // Assign adminInout + adminInvoices roles to dependent
        if (dependency) {
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

          // Also assign adminInvoices role from Factonet
          const adminInvoicesRole = await manager.findOne(Rol, {
            where: { strName: 'adminInvoices' },
          });
          if (adminInvoicesRole) {
            const existingFactonetRole = await manager.findOne(UserRole, {
              where: {
                userId: dependency.dependentUserId,
                roleId: adminInvoicesRole.id,
                contractId: contract.id,
              },
            });
            if (!existingFactonetRole) {
              await manager.save(
                manager.create(UserRole, {
                  userId: dependency.dependentUserId,
                  roleId: adminInvoicesRole.id,
                  contractId: contract.id,
                  status: 'ACTIVE',
                }),
              );
            }
          }
        }

        // Activate contract only if free package
        if (isFree) {
          contract.status = ContractStatus.ACTIVE;
          if (nDiasUso && nDiasUso.maxValue > 0) {
            contract.startDate = new Date();
            const end = new Date();
            end.setDate(end.getDate() + nDiasUso.maxValue);
            contract.endDate = end;
          }
          await manager.save(contract);

          // Activate both users
          const princUser = await manager.findOne(User, { where: { id: principalUserId } });
          if (princUser) {
            princUser.strStatus = 'ACTIVE';
            await manager.save(princUser);
          }
          if (dependency) {
            const depUser = await manager.findOne(User, { where: { id: dependency.dependentUserId } });
            if (depUser) {
              depUser.strStatus = 'ACTIVE';
              await manager.save(depUser);
            }
          }

          contractActivated = true;
        }
      }

      return { contract, isFree, contractActivated, bothVerified };
    });

    if (result.contractActivated) {
      return {
        success: true,
        message: '¡Registro completado! Ya puedes iniciar sesión.',
        contractActivated: true,
        loginUrl: process.env.INOUT_LOGIN_URL || 'http://localhost:4201/login',
        data: {
          contractCode: result.contract.code,
          packageName: result.contract.package?.name || '',
          startDate: result.contract.startDate ? String(result.contract.startDate) : null,
          endDate: result.contract.endDate ? String(result.contract.endDate) : null,
        },
      };
    }

    return {
      success: true,
      message: result.bothVerified
        ? 'Email verificado. Tu contrato será activado por un administrador.'
        : 'Email verificado. Falta que el otro usuario confirme su correo para activar el contrato.',
      contractActivated: false,
      loginUrl: process.env.INOUT_LOGIN_URL || 'http://localhost:4201/login',
      data: {
        contractCode: result.contract.code,
        packageName: result.contract.package?.name || '',
        startDate: result.contract.startDate ? String(result.contract.startDate) : null,
        endDate: result.contract.endDate ? String(result.contract.endDate) : null,
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
      const apiBaseUrl = process.env.VERIFICATION_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000/api';
      const verificationUrl = `${apiBaseUrl}/auth/verify-registration?email=${encodeURIComponent(email)}&code=${newCode}`;
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

  /**
   * Generates a unique 3-letter code prefix from the principal's name.
   * Extracts consonants from the name, then tries combinations until finding an available one.
   */
  private async generateUniqueCodePrefix(name: string, manager: any): Promise<string> {
    // Clean name: uppercase, only letters
    const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
    
    if (cleanName.length < 3) {
      // If name is too short, pad with random letters
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let padded = cleanName;
      while (padded.length < 3) {
        padded += alphabet[Math.floor(Math.random() * 26)];
      }
      return await this.findAvailablePrefix(padded.substring(0, 3), manager);
    }

    // Strategy 1: First 3 consonants from the name
    const consonants = cleanName.replace(/[AEIOU]/g, '');
    if (consonants.length >= 3) {
      const prefix = consonants.substring(0, 3);
      const isAvailable = await this.isPrefixAvailable(prefix, manager);
      if (isAvailable) return prefix;
    }

    // Strategy 2: First letter + 2 consonants
    const prefix2 = cleanName[0] + consonants.substring(0, 2);
    if (prefix2.length === 3) {
      const isAvailable = await this.isPrefixAvailable(prefix2, manager);
      if (isAvailable) return prefix2;
    }

    // Strategy 3: First 3 letters of the name
    const prefix3 = cleanName.substring(0, 3);
    const isAvailable3 = await this.isPrefixAvailable(prefix3, manager);
    if (isAvailable3) return prefix3;

    // Strategy 4: Try random combinations from name letters
    return await this.findAvailablePrefix(cleanName, manager);
  }

  private async findAvailablePrefix(source: string, manager: any): Promise<string> {
    const letters = source.toUpperCase().replace(/[^A-Z]/g, '');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Try up to 50 combinations
    for (let attempt = 0; attempt < 50; attempt++) {
      let prefix = '';
      if (attempt < letters.length - 2) {
        // Use sequential 3-char windows from the source
        prefix = letters.substring(attempt, attempt + 3);
      } else {
        // Generate random from source letters + alphabet
        const pool = letters + alphabet;
        for (let i = 0; i < 3; i++) {
          prefix += pool[Math.floor(Math.random() * pool.length)];
        }
      }

      if (prefix.length === 3) {
        const isAvailable = await this.isPrefixAvailable(prefix, manager);
        if (isAvailable) return prefix;
      }
    }

    // Fallback: random 3 letters
    let fallback = '';
    for (let i = 0; i < 3; i++) {
      fallback += alphabet[Math.floor(Math.random() * 26)];
    }
    return fallback;
  }

  private async isPrefixAvailable(prefix: string, manager: any): Promise<boolean> {
    const existing = await manager
      .createQueryBuilder(Contract, 'contract')
      .where('contract.codePrefix = :prefix', { prefix })
      .getOne();
    return !existing;
  }

  async upgradePlan(email: string, password: string, packageId: string) {
    // 1. Find user and validate password
    const user = await this.userRepository.findOne({
      where: { strUserName: email },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isPasswordValid = await bcrypt.compare(password, user.strPassword);
    if (!isPasswordValid) throw new BadRequestException('Contraseña incorrecta');

    // 2. Validate package exists
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
      relations: ['usageLimitVariables'],
    });
    if (!pkg) throw new BadRequestException('Paquete no encontrado');

    // 3. Validate not downgrading from paid to free
    const newPackageIsFree = Number(pkg.price) === 0 || (pkg as any).isBillable === false;

    // 4. Find user's active contract
    const contract = await this.contractRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['package'],
    });

    if (!contract) {
      // If user is a dependent, find via principal
      const dependency = await this.userDependencyRepository.findOne({
        where: { dependentUserId: user.id, status: 'ACTIVE' },
      });
      if (dependency) {
        const principalContract = await this.contractRepository.findOne({
          where: { user: { id: dependency.principalUserId } },
          relations: ['package'],
        });
        if (principalContract) {
          const currentIsPaid = Number(principalContract.package?.price) > 0 && (principalContract.package as any)?.isBillable !== false;
          if (currentIsPaid && newPackageIsFree) {
            throw new BadRequestException('No es posible cambiar de un plan pago a un plan gratuito.');
          }
          return this.executeUpgrade(principalContract, pkg, packageId);
        }
      }
      throw new NotFoundException('No se encontró un contrato activo');
    }

    const currentIsPaid = Number(contract.package?.price) > 0 && (contract.package as any)?.isBillable !== false;
    if (currentIsPaid && newPackageIsFree) {
      throw new BadRequestException('No es posible cambiar de un plan pago a un plan gratuito.');
    }

    return this.executeUpgrade(contract, pkg, packageId);
  }

  private async executeUpgrade(contract: Contract, pkg: Package, packageId: string) {
    // Update the EXISTING contract with new package terms
    // The contract code, tenantId, and codePrefix remain the same
    contract.package = { id: packageId } as any;
    contract.value = (pkg.price || 0) * 12;
    contract.startDate = new Date();
    contract.endDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();
    contract.status = ContractStatus.PENDING;
    // Reset PDF and signing — contract must be re-generated, re-issued, and re-signed
    contract.pdfUrl = null;
    contract.issuedAt = null;
    contract.signedAt = null;

    await this.contractRepository.save(contract);

    // Log the plan upgrade
    await this.logsService.info(
      LogAction.CONTRACT_UPGRADED,
      `Contract ${contract.code} upgraded to package "${pkg.name}" (price: ${pkg.price})`,
      contract.user?.id,
      contract.id,
      { previousPackage: contract.package?.name, newPackage: pkg.name, newPrice: pkg.price },
    );

    // If package is billable, deactivate principal and dependents until admin activates
    const isBillable = (pkg as any).isBillable !== false;
    if (isBillable) {
      const principalUser = await this.userRepository.findOne({
        where: { id: contract.user?.id },
      });
      if (principalUser) {
        principalUser.strStatus = 'INACTIVE';
        await this.userRepository.save(principalUser);
      }

      const dependencies = await this.userDependencyRepository.find({
        where: { principalUserId: contract.user?.id, status: 'ACTIVE' },
      });
      for (const dep of dependencies) {
        const depUser = await this.userRepository.findOne({ where: { id: dep.dependentUserId } });
        if (depUser) {
          depUser.strStatus = 'INACTIVE';
          await this.userRepository.save(depUser);
        }
      }
    }

    // Invalidate InOut cache
    try {
      const inoutApiUrl = process.env.INOUT_API_URL || 'http://localhost:3001';
      await fetch(`${inoutApiUrl}/api/usage-status/invalidate-cache/${contract.user?.id || ''}`, { method: 'POST' });
    } catch (e) {
      this.logger.warn('Could not invalidate InOut cache');
    }

    const message = isBillable
      ? `Plan cambiado a "${pkg.name}". Tu contrato será activado por un administrador.`
      : `Plan cambiado a "${pkg.name}" exitosamente.`;

    // Notify adminFactonet about the plan upgrade
    this.notifyAdminFactonetUpgrade(contract, pkg).catch(err =>
      this.logger.warn(`Failed to notify adminFactonet about upgrade: ${err.message}`)
    );

    return { success: true, message };
  }

  private async notifyAdminFactonetUpgrade(contract: Contract, pkg: Package): Promise<void> {
    // Find all adminFactonet users and their dependents
    const principalAdmins = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_roles', 'ur', 'ur."userId" = user.id')
      .innerJoin('rol', 'r', 'r.id = ur."roleId"')
      .where('r."strName" = :roleName', { roleName: 'adminFactonet' })
      .andWhere('ur.status = :status', { status: 'ACTIVE' })
      .getMany();

    const allRecipients: string[] = [];
    for (const admin of principalAdmins) {
      allRecipients.push(admin.strUserName);
      const deps = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user_dependencies', 'ud', 'ud."dependentUserId" = user.id')
        .where('ud."principalUserId" = :principalId', { principalId: admin.id })
        .andWhere('ud.status = :status', { status: 'ACTIVE' })
        .getMany();
      deps.forEach(d => allRecipients.push(d.strUserName));
    }

    const uniqueRecipients = [...new Set(allRecipients)];
    if (uniqueRecipients.length === 0) return;

    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';
    const year = new Date().getFullYear().toString();

    // Load user with relations for customer name
    const user = await this.userRepository.findOne({
      where: { id: contract.user?.id },
      relations: ['basicData', 'basicData.legalEntityData', 'basicData.naturalPersonData'],
    });
    const customerName = user?.basicData?.legalEntityData?.businessName
      || (user?.basicData?.naturalPersonData ? `${user.basicData.naturalPersonData.firstName} ${user.basicData.naturalPersonData.firstSurname}` : user?.strUserName || 'N/A');
    const monthlyValue = `$${Number(pkg.price || 0).toLocaleString('es-CO')}`;

    for (const email of uniqueRecipients) {
      try {
        await this.notificationsService.sendByTemplate('NEW_CONTRACT_ADMIN', email, {
          customerName,
          customerEmail: user?.strUserName || 'N/A',
          documentNumber: user?.basicData?.documentNumber || 'N/A',
          packageName: pkg.name || 'N/A',
          monthlyValue,
          contractCode: contract.code,
          mode: contract.mode || 'MONTHLY',
          startDate: contract.startDate ? new Date(contract.startDate).toLocaleDateString('es-CO') : 'N/A',
          endDate: contract.endDate ? new Date(contract.endDate).toLocaleDateString('es-CO') : 'Indefinido',
          status: 'PENDING',
          factonetUrl,
          year,
        });
      } catch (err) {
        this.logger.warn(`Failed to notify admin ${email}: ${err.message}`);
      }
    }
    this.logger.log(`Notified ${uniqueRecipients.length} adminFactonet user(s) about contract upgrade ${contract.code}`);
  }

  private async notifyAdminFactonetUsers(contract: any, dto: SelfRegisterDto, pkg: Package): Promise<void> {
    // Find all adminFactonet users
    const adminUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_roles', 'ur', 'ur."userId" = user.id')
      .innerJoin('rol', 'r', 'r.id = ur."roleId"')
      .where('r."strName" = :roleName', { roleName: 'adminFactonet' })
      .andWhere('ur.status = :status', { status: 'ACTIVE' })
      .getMany();

    if (adminUsers.length === 0) return;

    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'https://billing.cyclonet.com.co/login';
    const year = new Date().getFullYear().toString();
    const customerName = dto.principal.businessName || `${dto.principal.firstName || ''} ${dto.principal.firstSurname || ''}`.trim();
    const monthlyValue = `$${Number(pkg.price || 0).toLocaleString('es-CO')}`;

    for (const admin of adminUsers) {
      try {
        await this.notificationsService.sendByTemplate('NEW_CONTRACT_ADMIN', admin.strUserName, {
          customerName: customerName || 'N/A',
          customerEmail: dto.principal.email,
          documentNumber: dto.principal.documentNumber || 'N/A',
          packageName: pkg.name || 'N/A',
          monthlyValue,
          contractCode: contract.code,
          mode: 'MONTHLY',
          startDate: contract.startDate ? new Date(contract.startDate).toLocaleDateString('es-CO') : 'N/A',
          endDate: contract.endDate ? new Date(contract.endDate).toLocaleDateString('es-CO') : 'Indefinido',
          status: 'PENDING',
          factonetUrl,
          year,
        });
      } catch (err) {
        this.logger.warn(`Failed to notify admin ${admin.strUserName}: ${err.message}`);
      }
    }

    this.logger.log(`Notified ${adminUsers.length} adminFactonet user(s) about new contract ${contract.code}`);
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
