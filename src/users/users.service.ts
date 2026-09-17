import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFullUserDto } from './dto/CreateFullUserDto';
import { CreateDependentUserDto } from './dto/create-dependent-user.dto';
import * as bcrypt from 'bcrypt';
import { Rol } from 'src/roles/entities/rol.entity';
import { PaginationDto } from './dto/pagination.dto';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';
import { NaturalPersonData } from 'src/natural-person-data/entities/natural-person-data.entity';
import { LegalEntityData } from 'src/legal-entity-data/entities/legal-entity-data.entity';
import { DocumentType } from 'src/document-types/entities/document-type.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from 'src/common/dtos/paginated-response';
import { EntityCodeService } from 'src/entity-codes/services/entity-code.service';
import { LogsService } from '../logs/logs.service';
import { LogAction } from '../logs/entities/log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractService } from '../contract/contract.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Image } from '../images/entities/image.entity';
import { UserRolesService } from '../user-roles/user-roles.service';
import { UserDependenciesService } from '../user-dependencies/user-dependencies.service';

@Injectable()
export class UsersService {
  private toResponseDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Rol) private readonly rolRepository: Repository<Rol>,
    @InjectRepository(BasicData) private readonly basicDataRepository: Repository<BasicData>,
    @InjectRepository(Image) private readonly imageRepository: Repository<Image>,
    private readonly entityCodeService: EntityCodeService,
    private readonly logsService: LogsService,
    private readonly notificationsService: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => ContractService))
    private readonly contractService: ContractService,
    private readonly userRolesService: UserRolesService,
    private readonly userDependenciesService: UserDependenciesService,
  ) {}

  /**
   * Sube la foto de perfil (avatar) del usuario a Cloudinary y la guarda de forma
   * CENTRALIZADA en su BasicData (identidad compartida por todo el ecosistema).
   * - Registra la imagen en la tabla Image (relación "Photos" del MER).
   * - Cachea la URL vigente en BasicData.avatarUrl para servirla sin joins.
   * El userId proviene del JWT (no del body). Devuelve { url }.
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['basicData'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.basicData) {
      throw new BadRequestException('El usuario no tiene datos básicos (BasicData) para asociar la foto');
    }

    // Subir a Cloudinary (carpeta avatars, con prefijo de entorno del servicio).
    const uploaded = await this.cloudinaryService.uploadImage(file, 'avatars');
    const url = uploaded.secure_url;

    // Registro histórico en Image (relación con BasicData).
    await this.imageRepository.save(
      this.imageRepository.create({
        fileName: file.originalname || `avatar_${Date.now()}`,
        url,
        basicDataId: user.basicData.id,
      }),
    );

    // URL vigente cacheada en BasicData → la sirven todas las apps.
    await this.basicDataRepository.update({ id: user.basicData.id }, { avatarUrl: url });

    return { url };
  }

  async create(dto: CreateUserDto): Promise<User> {
    const genericPassword = '1234567890';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(genericPassword, salt);
    const code = await this.entityCodeService.generateCode('User');
    const user = this.userRepository.create({
      strUserName: dto.strUserName,
      strPassword: hashedPassword,
      code,
      mustChangePassword: true,
      lastPasswordChange: new Date(),
      strStatus: 'UNCONFIRMED',
    });
    const savedUser = await this.userRepository.save(user);
    
    // Log creación de usuario
    await this.logsService.info(
      LogAction.USER_CREATED,
      `User created: ${savedUser.strUserName}`,
      savedUser.id,
      null,
      { userCode: savedUser.code, email: savedUser.strUserName }
    );
    
    return savedUser;
  }

  async createFullUser(dto: CreateFullUserDto): Promise<User> {
    console.log('Creating full user with DTO:', JSON.stringify(dto, null, 2));
    
    // === VALIDACIONES PREVIAS (antes de crear cualquier registro) ===
    
    // Buscar el ID del tipo de documento
    const documentTypeRecord = await this.userRepository.manager.findOne(DocumentType, {
      where: { documentType: dto.documentType.strDocumentType }
    });

    if (!documentTypeRecord) {
      throw new BadRequestException(`Document type ${dto.documentType.strDocumentType} not found`);
    }

    // Validar unicidad de documento
    if (dto.documentType.strDocumentNumber) {
      const existingDoc = await this.userRepository.manager.findOne(BasicData, {
        where: {
          documentTypeId: documentTypeRecord.id,
          documentNumber: dto.documentType.strDocumentNumber,
        },
      });
      if (existingDoc) {
        throw new ConflictException(
          `El documento ${dto.documentType.strDocumentType} ${dto.documentType.strDocumentNumber} ya está registrado en la plataforma.`,
        );
      }
    }

    // === CREACIÓN (todo válido, proceder) ===
    
    const genericPassword = '1234567890';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(genericPassword, salt);
    const code = await this.entityCodeService.generateCode('User');

    // Crear usuario
    const user = this.userRepository.create({
      strUserName: dto.user.strUserName,
      strPassword: hashedPassword,
      code,
      mustChangePassword: true,
      lastPasswordChange: new Date(),
      strStatus: dto.user.strStatus,
    });
    const savedUser = await this.userRepository.save(user);

    // Crear datos básicos con referencia al tipo de documento
    const basicData = this.userRepository.manager.create(BasicData, {
      strPersonType: dto.basicData.strPersonType,
      strStatus: dto.basicData.strStatus,
      documentTypeId: documentTypeRecord.id,
      documentNumber: dto.documentType.strDocumentNumber,
      user: savedUser,
    });
    const savedBasicData = await this.userRepository.manager.save(basicData);

    // Crear datos específicos según tipo de persona
    if (dto.basicData.strPersonType === 'N' && dto.naturalPersonData) {
      const naturalPersonData = this.userRepository.manager.create(NaturalPersonData, {
        ...dto.naturalPersonData,
        basicData: savedBasicData,
      });
      await this.userRepository.manager.save(naturalPersonData);
    }

    if (dto.basicData.strPersonType === 'J' && dto.legalEntityData) {
      const legalEntityData = this.userRepository.manager.create(LegalEntityData, {
        ...dto.legalEntityData,
        basicData: savedBasicData,
      });
      await this.userRepository.manager.save(legalEntityData);
    }

    // Actualizar usuario con basicData
    savedUser.basicData = savedBasicData;
    await this.userRepository.save(savedUser);

    // Log creación de usuario completo
    await this.logsService.info(
      LogAction.USER_CREATED,
      `Full user created: ${savedUser.strUserName}`,
      savedUser.id,
      null,
      { 
        userCode: savedUser.code, 
        email: savedUser.strUserName,
        personType: dto.basicData.strPersonType,
        documentType: dto.documentType.strDocumentType
      }
    );

    // Enviar correo de verificación (no bloquea ni rompe la creación si falla)
    this.sendVerificationEmail(savedUser.id).catch((err) =>
      console.warn(`Verification email failed for ${savedUser.strUserName}: ${err.message}`),
    );

    return savedUser;
  }

  /**
   * Crea un usuario dependiente del tenant en sesión (equipo interno de una app,
   * ej. InOut): mismo proceso de Authoriza que createFullUser (User + BasicData +
   * datos de persona), pero además lo deja vinculado como UserDependency del
   * principal y le asigna un rol validado contra el cupo del plan contratado
   * (mismo camino que assignRole: valida cupo y aplica la cascada
   * adminInout -> adminInvoices de FactoNet). Si la dependencia o el rol
   * fallan tras crear el usuario, se revierte el usuario para no dejar
   * huérfanos sin acceso ni vínculo.
   */
  async createDependentUser(
    dto: CreateDependentUserDto,
    principalUserId: string,
    contractId: string,
  ): Promise<{ id: string; message: string }> {
    // 1. Validar cupo ANTES de crear nada (rol permitido por la app + plan).
    await this.userRolesService.validateRoleAvailability(contractId, dto.roleId);

    // 2. Unicidad de correo y documento.
    const existingUser = await this.userRepository.findOne({
      where: { strUserName: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Ya existe un usuario registrado con ese correo.');
    }

    const documentTypeRecord = await this.userRepository.manager.findOne(DocumentType, {
      where: { documentType: dto.documentType },
    });
    if (!documentTypeRecord) {
      throw new BadRequestException(`Tipo de documento ${dto.documentType} no encontrado`);
    }

    const existingDoc = await this.userRepository.manager.findOne(BasicData, {
      where: {
        documentTypeId: documentTypeRecord.id,
        documentNumber: dto.documentNumber,
      },
    });
    if (existingDoc) {
      throw new ConflictException(
        `El documento ${dto.documentType} ${dto.documentNumber} ya está registrado en la plataforma.`,
      );
    }

    // 3. Crear User + BasicData + datos de persona en una transacción.
    const hashedPassword = await bcrypt.hash('1234567890', await bcrypt.genSalt());
    const code = await this.entityCodeService.generateCode('User');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const savedUser = await this.userRepository.manager.transaction(async (manager) => {
      const user = manager.create(User, {
        strUserName: dto.email,
        strPassword: hashedPassword,
        code,
        strStatus: 'UNCONFIRMED',
        isVerified: false,
        mustChangePassword: true,
        lastPasswordChange: new Date(),
        verificationCode,
        verificationExpires,
      });
      const newUser = await manager.save(user);

      const basicData = manager.create(BasicData, {
        strPersonType: dto.personType as 'N' | 'J',
        strStatus: 'ACTIVE',
        documentTypeId: documentTypeRecord.id,
        documentNumber: dto.documentNumber,
        user: newUser,
      });
      const savedBasicData = await manager.save(basicData);

      if (dto.personType === 'N' && dto.naturalPersonData) {
        const naturalData = manager.create(NaturalPersonData, {
          firstName: dto.naturalPersonData.firstName,
          secondName: dto.naturalPersonData.secondName || null,
          firstSurname: dto.naturalPersonData.firstSurname,
          secondSurname: dto.naturalPersonData.secondSurname || null,
          birthDate: dto.naturalPersonData.birthDate ? new Date(dto.naturalPersonData.birthDate) : null,
          sex: dto.naturalPersonData.sex || null,
          maritalStatus: dto.naturalPersonData.maritalStatus || null,
          basicData: savedBasicData,
        });
        await manager.save(naturalData);
      } else if (dto.personType === 'J' && dto.legalEntityData) {
        const legalData = manager.create(LegalEntityData, {
          businessName: dto.legalEntityData.businessName,
          webSite: dto.legalEntityData.webSite || null,
          contactName: dto.legalEntityData.contactName,
          contactEmail: dto.legalEntityData.contactEmail,
          contactPhone: dto.legalEntityData.contactPhone,
          basicData: savedBasicData,
        });
        await manager.save(legalData);
      }

      newUser.basicData = savedBasicData;
      await manager.save(newUser);
      return newUser;
    });

    // 4. Vincular como dependiente del admin en sesión y asignar el rol
    // (valida cupo de nuevo y aplica cascada adminInout -> adminInvoices).
    try {
      await this.userDependenciesService.create({
        principalUserId,
        dependentUserId: savedUser.id,
        status: 'ACTIVE',
      } as any);

      await this.userRolesService.assignRole({
        userId: savedUser.id,
        roleId: dto.roleId,
        contractId,
        status: 'ACTIVE',
      } as any);
    } catch (err) {
      // No dejar usuarios huérfanos (sin dependencia ni rol): revertir.
      await this.userRepository.delete(savedUser.id);
      throw err;
    }

    await this.logsService.info(
      LogAction.USER_CREATED,
      `Dependent user created: ${savedUser.strUserName} (principal ${principalUserId})`,
      savedUser.id,
      null,
      {
        userCode: savedUser.code,
        email: savedUser.strUserName,
        personType: dto.personType,
        roleId: dto.roleId,
        principalUserId,
      },
    );

    this.sendVerificationEmail(savedUser.id).catch((err) =>
      console.warn(`Verification email failed for ${savedUser.strUserName}: ${err.message}`),
    );

    return { id: savedUser.id, message: 'Usuario dependiente creado correctamente.' };
  }

  async findAll(
    paginationDto: PaginationDto,
    dependentOnId?: string,
    withDeleted = false,
  ): Promise<UserResponseDto[]> {
    const { limit = 10, offset = 0 } = paginationDto;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.strUserName', 
        'user.code',
        'user.strStatus',
        'user.dtmCreateDate',
        'user.dtmLatestUpdateDate',
        'user.deletedAt'
      ])
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.documentType', 'documentType')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .leftJoinAndSelect('user.contracts', 'contracts');

    if (!withDeleted) {
      qb.where('user.deletedAt IS NULL');
    } else {
      qb.withDeleted();
    }

    if (dependentOnId) {
      qb.andWhere('user.dependentOnId = :dependentOnId', { dependentOnId });
    }

    const users = await qb.take(limit).skip(offset).getMany();
    
    return users.map(user => {
      const dto = plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
      dto.hasContracts = user.contracts && user.contracts.length > 0;
      return dto;
    });
  }

  async findAllExcludingUserThatThisUserDependsOn(
    userId: string,
    withDeleted: boolean | string = false,
  ): Promise<UserResponseDto[]> {
    // Esta funcionalidad necesita ser reimplementada con UserDependency
    const qb = this.userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.documentType', 'documentType')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .where('1=1');

    const shouldIncludeDeleted =
      typeof withDeleted === 'string' ? withDeleted === 'true' : withDeleted;

    if (!shouldIncludeDeleted) {
      qb.andWhere('user.deletedAt IS NULL');
    }

    const users = await qb.getMany();

    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async findAllWithoutDependency(withDeleted: boolean): Promise<User[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.basicData', 'basicData')
      .leftJoinAndSelect('basicData.documentType', 'documentType')
      .leftJoinAndSelect('basicData.naturalPersonData', 'naturalPersonData')
      .leftJoinAndSelect('basicData.legalEntityData', 'legalEntityData')
      .leftJoin('user.dependents', 'userDependency')
      .where('userDependency.id IS NULL');

    // manejar eliminados
    if (withDeleted) {
      qb.withDeleted();
    } else {
      qb.andWhere('user.deletedAt IS NULL');
    }

    return qb.getMany();
  }

  async isUserNameTaken(userName: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { strUserName: userName },
    });
    return !!user;
  }

  async isCompanyCodeTaken(companyCode: string): Promise<boolean> {
    // El código de empresa ahora está en Contract, no en User
    return false;
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'basicData',
        'basicData.documentType',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
      ],
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new NotFoundException('User has been deleted');
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async assignRole(userId: string, roleId: string) {
    // Esta funcionalidad ahora se maneja a través de UserRole
    throw new Error('Use UserRole service to assign roles');
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findOne({
      where: { strUserName: email },
      withDeleted: true,
      relations: [
        'basicData',
        'basicData.documentType',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
        'userRoles',
        'userRoles.role',
      ],
    });
    if (!user) return null;
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findEntityByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { strUserName: email },
      withDeleted: true,
      relations: [
        'basicData',
        'basicData.documentType',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
        'principals',
        'dependents',
        'userRoles',
        'userRoles.role',
        'userRoles.contract',
        'userRoles.contract.user',
        'userRoles.contract.user.basicData',
        'userRoles.contract.user.basicData.naturalPersonData',
        'userRoles.contract.user.basicData.legalEntityData',
        'userRoles.contract.package',
      ],
    });
  }

  /** Igual que findEntityByEmail pero por id (para switch-app: userId viene del JWT). */
  async findEntityById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: [
        'basicData',
        'basicData.documentType',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
        'principals',
        'dependents',
        'userRoles',
        'userRoles.role',
        'userRoles.contract',
        'userRoles.contract.user',
        'userRoles.contract.user.basicData',
        'userRoles.contract.user.basicData.naturalPersonData',
        'userRoles.contract.user.basicData.legalEntityData',
        'userRoles.contract.package',
      ],
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'basicData',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
      ],
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.strUserName) user.strUserName = dto.strUserName;
    if (dto.strStatus) {
      user.strStatus = dto.strStatus;
      // Si se cambia a un estado diferente de DELETED, restaurar el usuario (limpiar deletedAt)
      if (dto.strStatus !== 'DELETED' && user.deletedAt) {
        user.deletedAt = null as any;
      }
    }

    if (dto.rolId) {
      // Los roles ahora se manejan a través de UserRole
      console.log('Warning: rolId ignored, use UserRole service instead');
    }

    if (dto.basicDataId) {
      const basicData = await this.userRepository.manager.findOne(BasicData, {
        where: { id: dto.basicDataId },
      });
      if (!basicData) throw new NotFoundException('BasicData not found');
      user.basicData = basicData;
    }

    // Actualizar campos de documento en BasicData
    if (dto.basicData && user.basicData) {
      if (dto.basicData.documentTypeId) {
        user.basicData.documentTypeId = dto.basicData.documentTypeId;
      }
      if (dto.basicData.documentNumber) {
        user.basicData.documentNumber = dto.basicData.documentNumber;
      }
      await this.userRepository.manager.save(BasicData, user.basicData);
    }

    // Actualizar naturalPersonData si existe
    if (dto.naturalPersonData && user.basicData?.naturalPersonData) {
      Object.assign(user.basicData.naturalPersonData, dto.naturalPersonData);
      await this.userRepository.manager.save(NaturalPersonData, user.basicData.naturalPersonData);
    }

    // Actualizar legalEntityData si existe
    if (dto.legalEntityData && user.basicData?.legalEntityData) {
      Object.assign(user.basicData.legalEntityData, dto.legalEntityData);
      await this.userRepository.manager.save(LegalEntityData, user.basicData.legalEntityData);
    }

    if (dto.dependentOnId) {
      // Las dependencias ahora se manejan a través de UserDependency
      console.log('Warning: dependentOnId ignored, use UserDependency service instead');
    }

    user.dtmLatestUpdateDate = new Date();

    // Crear una copia del usuario sin basicData para evitar conflictos
    const userToSave = {
      id: user.id,
      strUserName: user.strUserName,
      code: user.code,
      strPassword: user.strPassword,
      mustChangePassword: user.mustChangePassword,
      lastPasswordChange: user.lastPasswordChange,
      strStatus: user.strStatus,
      dtmCreateDate: user.dtmCreateDate,
      dtmLatestUpdateDate: new Date(), // Forzar nueva fecha
      deletedAt: user.deletedAt,
      // dependentOnId y rolId removidos - ahora se manejan con UserDependency y UserRole
    };

    try {
      const savedUser = await this.userRepository.save(userToSave);
      // Notify Kiri if status changed
      if (dto.strStatus) {
        const allowed = dto.strStatus === 'ACTIVE' || dto.strStatus === 'CONFIRMED';
        this.notifyKiriStatusChange(savedUser.strUserName, allowed);
      }
      return savedUser;
    } catch (error) {
      console.error(`Error saving user ${id}:`, error);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.strPassword,
    );
    if (!isOldPasswordValid) {
      throw new NotFoundException('The old password is not valid.');
    }

    // Actualizar contraseña y otros campos
    user.strPassword = await bcrypt.hash(newPassword, 10);
    user.dtmLatestUpdateDate = new Date();
    user.mustChangePassword = false;
    user.lastPasswordChange = new Date();

    await this.userRepository.save(user);

    return { message: 'Password updated successfully!' };
  }

  async toggleStatus(userId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.strStatus = user.strStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const saved = await this.userRepository.save(user);
    this.notifyKiriStatusChange(saved.strUserName, saved.strStatus === 'ACTIVE');
    return saved;
  }

  /**
   * Notifies the Kiri backend when a user's access status changes.
   * Authoriza is the source of truth for Kiri user access.
   */
  private notifyKiriStatusChange(email: string, allowed: boolean): void {
    const kiriApiUrl = process.env.KIRI_API_URL || 'http://localhost:4000';
    // Fire-and-forget — don't block the response
    fetch(`${kiriApiUrl}/api/plan/set-user-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, allowed }),
    }).catch(() => {
      // Non-blocking: Kiri will also verify status on next login
    });
  }

  async setAuthorizedSigner(userId: string, isAuthorizedSigner: boolean): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isAuthorizedSigner = isAuthorizedSigner;
    return this.userRepository.save(user);
  }

  async updateStatusWithDependents(
    userId: string,
    newStatus: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Actualizar estado del usuario
    user.strStatus = newStatus;
    user.dtmLatestUpdateDate = new Date();
    await this.userRepository.save(user);

    // Notify Kiri about the status change (source of truth for access)
    const allowed = newStatus === 'ACTIVE' || newStatus === 'CONFIRMED';
    this.notifyKiriStatusChange(user.strUserName, allowed);

    // TODO: Actualizar dependientes usando UserDependency service

    return user;
  }

  async removeRole(userId: string): Promise<User> {
    // Esta funcionalidad ahora se maneja a través de UserRole
    throw new Error('Use UserRole service to remove roles');
  }

  async removeDependency(userId: string): Promise<User> {
    // Esta funcionalidad ahora se maneja a través de UserDependency
    throw new Error('Use UserDependency service to remove dependencies');
  }

  async remove(id: string, force = false): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    // Verificar si tiene dependientes usando UserDependency
    // TODO: Implementar verificación con UserDependency service
    const dependents: any[] = [];

    if (dependents.length > 0 && !force) {
      throw new ConflictException(
        `Cannot delete user '${id}' because there are dependent users. Use force=true to override.`,
      );
    }

    if (dependents.length > 0 && force) {
      for (const dep of dependents) {
        dep.strStatus = 'DELETED';
        await this.userRepository.save(dep);
        await this.userRepository.softDelete(dep.id);
        // Log eliminación de dependiente
        await this.logsService.info(
          LogAction.USER_DELETED,
          `Dependent user deleted: ${dep.strUserName}`,
          dep.id,
          null,
          { parentUserId: id, forced: true }
        );
      }
    }

    // Cambiar estado a DELETED antes de soft delete
    user.strStatus = 'DELETED';
    await this.userRepository.save(user);
    await this.userRepository.softDelete(id);
    // Notify Kiri to block access
    this.notifyKiriStatusChange(user.strUserName, false);
    
    // Log eliminación de usuario principal
    await this.logsService.info(
      LogAction.USER_DELETED,
      `User deleted: ${user.strUserName}`,
      user.id,
      null,
      { userCode: user.code, dependentsCount: dependents.length, force }
    );

    return {
      message: `User with ID '${id}' has been soft-deleted${
        force && dependents.length ? ' along with dependents' : ''
      }.`,
    };
  }

  // reestablece usuarios eliminados
  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'basicData',
        'basicData.naturalPersonData',
        'basicData.legalEntityData',
      ],
    });
    if (!user) throw new NotFoundException('User not found');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    user.verificationCode = code;
    user.verificationExpires = expires;
    await this.userRepository.save(user);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000/api';
    const verificationUrl = `${backendUrl}/users/verify-email?email=${encodeURIComponent(user.strUserName)}&code=${code}`;

    const customerName = user.basicData?.naturalPersonData
      ? `${user.basicData.naturalPersonData.firstName} ${user.basicData.naturalPersonData.firstSurname}`
      : user.basicData?.legalEntityData?.businessName || user.strUserName;

    await this.notificationsService.sendByTemplate('USER_VERIFICATION', user.strUserName, {
      customerName,
      verificationUrl,
      year: new Date().getFullYear().toString(),
      applicationName: 'CycloNet',
    });
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { strUserName: email } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isVerified) {
      return { message: 'Email already verified' };
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.verificationExpires || new Date() > user.verificationExpires) {
      throw new BadRequestException('Verification code has expired');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    user.strStatus = 'CONFIRMED';
    await this.userRepository.save(user);

    // Si ya tiene contrato con PDF, enviarlo ahora
    this.contractService.sendContractOnVerification(user.id).catch((err) =>
      console.warn(`Contract email after verification failed: ${err.message}`),
    );

    return { message: 'Email verified successfully' };
  }

  async restore(userId: string): Promise<{ message: string }> {
    const result = await this.userRepository.restore(userId);
    if (result.affected === 0) {
      throw new NotFoundException(
        `User with ID '${userId}' not found or not deleted`,
      );
    }
    return { message: `User with ID '${userId}' has been restored.` };
  }

  async restoreDependents(userId: string): Promise<void> {
    // Esta funcionalidad necesita ser reimplementada con UserDependency
    console.log('TODO: Implement with UserDependency service');
  }

  /**
   * Check if a user is an authorized signer.
   * Returns true if:
   * 1. The user's own isAuthorizedSigner flag is true (Owner/principal users), OR
   * 2. The user is listed as an authorized signer in an active dependency relationship.
   */
  async isUserAuthorizedSigner(userId: string): Promise<boolean> {
    // Check the user's own isAuthorizedSigner column (Owner can always sign their own contracts)
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.isAuthorizedSigner) {
      return true;
    }

    // Check if user is an authorized signer via dependency relationship
    const result = await this.userRepository.manager.query(
      `SELECT COUNT(*) as count FROM user_dependencies 
       WHERE "dependentUserId" = $1 AND status = 'ACTIVE' AND "isAuthorizedSigner" = true`,
      [userId],
    );
    return parseInt(result[0]?.count || '0') > 0;
  }
}
