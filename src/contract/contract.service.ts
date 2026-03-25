import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';
import { ContractStatus } from './enums/contract-status.enum';
import { PaymentMode } from './enums/payment-mode.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { LogsService } from '../logs/logs.service';
import { LogAction } from '../logs/entities/log.entity';
import { UserRolesService } from '../user-roles/user-roles.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly entityCodeService: EntityCodeService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly logsService: LogsService,
    private readonly userRolesService: UserRolesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateContractDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) throw new BadRequestException('User not found');

    const pkg = await this.packageRepository.findOne({
      where: { id: dto.packageId },
    });
    if (!pkg) throw new BadRequestException('Package not found');

    // Validar que el codePrefix no esté siendo usado por otro tenant con contrato activo
    if (dto.codePrefix) {
      await this.validateCodePrefix(dto.codePrefix, dto.userId);
    }

    // Generar código automáticamente
    const code = await this.entityCodeService.generateCode('Contract');

    const entity = this.contractRepository.create({
      code,
      user: { id: dto.userId } as User,
      package: { id: dto.packageId } as Package,
      value: dto.value,
      mode: dto.mode,
      payday: dto.payday ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      status: dto.status ?? ContractStatus.PENDING,
      codePrefix: dto.codePrefix ?? null,
      businessSector: dto.businessSector ?? 'general',
    });

    const savedContract = await this.contractRepository.save(entity);
    
    // Actualizar el rol del usuario a accountOwner
    await this.userRolesService.updateUserToAccountOwner(dto.userId, savedContract.id);
    
    return savedContract;
  }

  async findOne(id: string) {
    const contract = await this.contractRepository.findOne({ 
      where: { id },
      relations: [
        'user',
        'user.basicData',
        'user.basicData.naturalPersonData',
        'user.basicData.legalEntityData',
        'package',
        'package.configurations',
        'package.configurations.rol',
      ],
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async update(id: string, dto: UpdateContractDto) {
    const contract = await this.findOne(id);

    if (dto.userId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) throw new BadRequestException('User not found');
      (contract as any).user = user;
    }
    if (dto.packageId) {
      const pkg = await this.packageRepository.findOne({
        where: { id: dto.packageId },
      });
      if (!pkg) throw new BadRequestException('Package not found');
      (contract as any).package = pkg;
    }

    if (dto.mode === PaymentMode.MONTHLY && !dto.payday) {
      throw new BadRequestException('Payday is required for MONTHLY mode');
    }

    if (dto.mode !== PaymentMode.MONTHLY && dto.payday) {
      throw new BadRequestException('Payday only applies for MONTHLY mode');
    }

    // Validación de fechas
    if (dto.endDate && new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    Object.assign(contract, {
      value: dto.value ?? contract.value,
      mode: dto.mode ?? contract.mode,
      payday: dto.payday ?? contract.payday,
      startDate: dto.startDate ?? contract.startDate,
      endDate: dto.endDate ?? contract.endDate,
      status: dto.status ?? contract.status,
    });

    const savedContract = await this.contractRepository.save(contract);
    
    return savedContract;
  }

  async remove(id: string) {
    const contract = await this.contractRepository.findOne({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with id ${id} not found`);
    }

    contract.status = ContractStatus.DELETED;

    await this.contractRepository.save(contract);
    return await this.contractRepository.softDelete(id);
  }

  async findByUser(userId: string) {
    return this.contractRepository.find({ 
      where: { user: { id: userId } },
      relations: {
        user: {
          basicData: {
            naturalPersonData: true,
            legalEntityData: true,
          },
        },
        package: {
          configurations: {
            rol: true,
          },
        },
      },
    });
  }

  async findByTenant(tenantId: string) {
    // Buscar si el tenantId es un usuario dependiente
    const dependency = await this.contractRepository.manager
      .createQueryBuilder()
      .select('ud.principalUserId')
      .from('user_dependencies', 'ud')
      .where('ud.dependentUserId = :tenantId', { tenantId })
      .andWhere('ud.status = :status', { status: 'ACTIVE' })
      .getRawOne();
    
    // Si es dependiente, usar el principalUserId, sino usar el tenantId
    const userId = dependency?.principalUserId || tenantId;
    
    // Buscar el contrato del usuario (principal o directo)
    const contract = await this.contractRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'package'],
    });
    
    if (!contract) throw new NotFoundException('Contract not found for tenant');
    return contract;
  }

  async findByPackage(packageId: string) {
    return this.contractRepository.find({
      where: { package: { id: packageId } },
    });
  }

  async findActive() {
    return this.contractRepository.find({
      where: { status: ContractStatus.ACTIVE },
      relations: {
        user: {
          basicData: {
            naturalPersonData: true,
            legalEntityData: true,
          },
        },
        package: true,
      },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [contracts, total] = await this.contractRepository.findAndCount({
      take: limit,
      skip: offset,
      relations: [
        'user',
        'user.basicData',
        'user.basicData.naturalPersonData',
        'user.basicData.legalEntityData',
        'package',
        'package.configurations',
        'package.configurations.rol',
      ],
    });

    return {
      data: contracts,
      total,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
    };
  }

  async savePdfUrl(contractId: string, pdfUrl: string): Promise<Contract> {
    const contract = await this.findOne(contractId);
    contract.pdfUrl = pdfUrl;
    return await this.contractRepository.save(contract);
  }

  async uploadContractPDF(contractId: string, pdfBuffer: Buffer): Promise<string> {
    console.log(`Starting PDF upload for contract: ${contractId}`);
    const contract = await this.findOne(contractId);
    
    // Si ya existe un PDF, eliminarlo de Cloudinary
    if (contract.pdfUrl) {
      console.log(`Deleting existing PDF: ${contract.pdfUrl}`);
      await this.cloudinaryService.deletePDFByUrl(contract.pdfUrl);
    }
    
    // Subir nuevo PDF
    const fileName = `contract_${contract.code || contractId}`;
    console.log(`Uploading new PDF with filename: ${fileName}`);
    const uploadResult = await this.cloudinaryService.uploadPDF(pdfBuffer, fileName);
    console.log(`Upload result:`, uploadResult);
    
    // Guardar URL en la base de datos
    console.log(`Saving PDF URL to database: ${uploadResult.secure_url}`);
    await this.savePdfUrl(contractId, uploadResult.secure_url);
    
    return uploadResult.secure_url;
  }

  async activateContract(id: string): Promise<Contract> {
    const contract = await this.findOne(id);
    
    if (contract.status === ContractStatus.ACTIVE) {
      throw new BadRequestException('Contract is already active');
    }
    
    // Validar que tenga usuarios dependientes usando UserDependency
    // TODO: Implementar con UserDependency service
    const dependentUsers = 0;
    
    if (dependentUsers === 0) {
      throw new BadRequestException('No se puede activar el contrato. Debe crear al menos una cuenta de usuario dependiente.');
    }
    
    // Validar que tenga PDF generado
    if (!contract.pdfUrl || contract.pdfUrl.trim() === '') {
      throw new BadRequestException('No se puede activar el contrato. Debe generar el PDF del contrato antes de activarlo.');
    }
    
    // Activar contrato
    contract.status = ContractStatus.ACTIVE;
    const savedContract = await this.contractRepository.save(contract);
    
    // Activar usuario principal
    await this.userRepository.update(
      { id: contract.user.id },
      { strStatus: 'ACTIVE' }
    );
    
    // Activar usuarios dependientes usando UserDependency
    // TODO: Implementar con UserDependency service
    
    return savedContract;
  }

  async updateStatus(id: string, status: string): Promise<Contract> {
    const contract = await this.findOne(id);
    
    // Validar regla de negocio para estado ACTIVE
    if (status === ContractStatus.ACTIVE) {
      // Contar usuarios dependientes activos del usuario principal
      const dependentUsers = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.principals', 'dependency')
        .where('dependency.principalUserId = :principalId', { principalId: contract.user.id })
        .andWhere('dependency.status = :status', { status: 'ACTIVE' })
        .getCount();
      
      if (dependentUsers === 0) {
        throw new BadRequestException('Cannot activate contract. At least one dependent user account must be created.');
      }
      
      // Validar que tenga PDF generado
      if (!contract.pdfUrl || contract.pdfUrl.trim() === '') {
        throw new BadRequestException('Cannot activate contract. Contract PDF must be generated before activation.');
      }
    }
    
    contract.status = status as ContractStatus;
    const savedContract = await this.contractRepository.save(contract);
    
    // Si se activó el contrato, activar usuarios
    if (status === ContractStatus.ACTIVE) {
      // Activar usuario principal
      await this.userRepository.update(
        { id: contract.user.id },
        { strStatus: 'ACTIVE' }
      );
      
      // Activar usuarios dependientes
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ strStatus: 'ACTIVE' })
        .where('id IN (SELECT "dependentUserId" FROM user_dependencies WHERE "principalUserId" = :principalId AND status = :status)', 
          { principalId: contract.user.id, status: 'ACTIVE' })
        .execute();
      
      await this.logsService.info(
        LogAction.CONTRACT_ACTIVATED,
        `Contract ${contract.code} activated successfully`,
        contract.user.id,
        contract.id,
        { contractCode: contract.code, userEmail: contract.user.strUserName }
      );
      
      await this.logsService.info(
        LogAction.USER_ACTIVATED,
        `User ${contract.user.strUserName} and dependents activated`,
        contract.user.id,
        contract.id
      );

      // Enviar notificación de activación al cliente
      this.notificationsService.sendByTemplate(
        'CONTRACT_ACTIVATED',
        contract.user.strUserName,
        {
          customerName: contract.user.basicData?.naturalPersonData
            ? `${contract.user.basicData.naturalPersonData.firstName} ${contract.user.basicData.naturalPersonData.firstSurname}`
            : contract.user.basicData?.legalEntityData?.businessName || contract.user.strUserName,
          contractCode: contract.code,
          packageName: contract.package?.name || 'N/A',
          startDate: contract.startDate?.toString() || 'N/A',
          endDate: contract.endDate?.toString() || 'N/A',
          year: new Date().getFullYear().toString(),
        },
      ).catch(err => this.logger.error(`Notification error: ${err.message}`));
    } else {
      // Si no es ACTIVE, desactivar usuarios
      await this.userRepository.update(
        { id: contract.user.id },
        { strStatus: 'INACTIVE' }
      );
      
      // Desactivar usuarios dependientes
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ strStatus: 'INACTIVE' })
        .where('id IN (SELECT "dependentUserId" FROM user_dependencies WHERE "principalUserId" = :principalId AND status = :status)', 
          { principalId: contract.user.id, status: 'ACTIVE' })
        .execute();
      
      await this.logsService.info(
        LogAction.CONTRACT_DEACTIVATED,
        `Contract ${contract.code} status changed to ${status}`,
        contract.user.id,
        contract.id,
        { contractCode: contract.code, newStatus: status }
      );
      
      await this.logsService.info(
        LogAction.USER_DEACTIVATED,
        `User ${contract.user.strUserName} and dependents deactivated`,
        contract.user.id,
        contract.id
      );
    }
    
    return savedContract;
  }

  /**
   * Valida que el codePrefix no esté siendo usado por otro tenant con contrato activo
   * Permite reutilizar el prefijo si el mismo tenant lo usó en contratos expirados
   */
  private async validateCodePrefix(codePrefix: string, userId: string): Promise<void> {
    const existingContract = await this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.user', 'user')
      .where('contract.codePrefix = :codePrefix', { codePrefix })
      .andWhere('user.id != :userId', { userId })
      .getOne();

    if (existingContract) {
      throw new BadRequestException(
        `El prefijo '${codePrefix}' ya fue utilizado por otro cliente`
      );
    }
  }

  /**
   * Método público para validar disponibilidad del codePrefix desde el frontend
   */
  async validateCodePrefixPublic(codePrefix: string): Promise<void> {
    const existingContract = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.codePrefix = :codePrefix', { codePrefix })
      .getOne();

    if (existingContract) {
      throw new BadRequestException(
        `El prefijo '${codePrefix}' ya fue utilizado por otro cliente`
      );
    }
  }
}
