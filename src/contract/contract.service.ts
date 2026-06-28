import {
  BadRequestException,
  ForbiddenException,
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

    if (dto.codePrefix) {
      await this.validateCodePrefix(dto.codePrefix, dto.userId);
    }

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
    await this.userRolesService.updateUserToAccountOwner(dto.userId, savedContract.id);
    
    // Notify adminFactonet users about the new contract
    this.notifyAdminFactonet(savedContract, user, pkg).catch(err =>
      this.logger.warn(`Failed to notify adminFactonet: ${err.message}`)
    );

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
      const user = await this.userRepository.findOne({ where: { id: dto.userId } });
      if (!user) throw new BadRequestException('User not found');
      (contract as any).user = user;
    }
    if (dto.packageId) {
      const pkg = await this.packageRepository.findOne({ where: { id: dto.packageId } });
      if (!pkg) throw new BadRequestException('Package not found');
      (contract as any).package = pkg;
    }

    // Determine the effective mode: use dto.mode if provided, otherwise keep the existing contract mode
    const effectiveMode = dto.mode ?? contract.mode;

    if (dto.mode !== undefined || dto.payday !== undefined) {
      if (effectiveMode === PaymentMode.MONTHLY && !dto.payday && !contract.payday) {
        throw new BadRequestException('Payday is required for MONTHLY mode');
      }

      if (effectiveMode !== PaymentMode.MONTHLY && (dto.payday !== undefined && dto.payday !== null)) {
        throw new BadRequestException('Payday only applies for MONTHLY mode');
      }
    }

    if (dto.endDate && new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    // Si el estado cambia, delegar a updateStatus para cascadear a dependientes
    const newStatus = dto.status ?? contract.status;
    const statusChanged = dto.status && dto.status !== contract.status;

    Object.assign(contract, {
      value: dto.value ?? contract.value,
      mode: dto.mode ?? contract.mode,
      payday: dto.payday ?? contract.payday,
      startDate: dto.startDate ?? contract.startDate,
      endDate: dto.endDate ?? contract.endDate,
      status: statusChanged ? contract.status : newStatus, // No cambiar aquí si va a cascadear
    });

    const savedContract = await this.contractRepository.save(contract);

    // Si el paquete cambió, invalidar cache de límites en las aplicaciones cliente
    if (dto.packageId) {
      this.invalidateClientCaches(contract.user?.id).catch((err) =>
        this.logger.warn(`Error invalidating client caches: ${err.message}`),
      );
    }

    // Si el estado cambió, usar updateStatus para activar/desactivar dependientes
    if (statusChanged) {
      return this.updateStatus(id, dto.status);
    }

    return savedContract;
  }

  /**
   * Notify client applications (InOut, etc.) to invalidate their limits cache
   * when a contract's package changes.
   */
  private async invalidateClientCaches(userId: string): Promise<void> {
    if (!userId) return;

    const inoutApiUrl = process.env.INOUT_API_URL || 'http://localhost:3001';
    
    try {
      // Get the user's basicDataId which is used as tenantId in InOut
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['basicData'],
      });

      const tenantId = user?.basicData?.id || userId;

      await fetch(`${inoutApiUrl}/api/usage-status/invalidate-cache/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      this.logger.log(`Cache invalidated for tenant ${tenantId} in InOut`);
    } catch (error) {
      this.logger.warn(`Could not invalidate InOut cache: ${error.message}`);
    }
  }

  async remove(id: string) {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!contract) throw new NotFoundException(`Contract with id ${id} not found`);

    // Desactivar usuario principal y dependientes antes de eliminar
    if (contract.user) {
      await this.userRepository.update({ id: contract.user.id }, { strStatus: 'INACTIVE' });

      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ strStatus: 'INACTIVE' })
        .where(
          'id IN (SELECT "dependentUserId" FROM user_dependencies WHERE "principalUserId" = :principalId AND status = :status)',
          { principalId: contract.user.id, status: 'ACTIVE' },
        )
        .execute();

      await this.logsService.info(
        LogAction.USER_DEACTIVATED,
        `User ${contract.user.strUserName} and dependents deactivated due to contract deletion`,
        contract.user.id,
        contract.id,
      );
    }

    contract.status = ContractStatus.DELETED;
    await this.contractRepository.save(contract);
    return this.contractRepository.softDelete(id);
  }

  async findByUser(userId: string) {
    return this.contractRepository.find({
      where: { user: { id: userId } },
      relations: {
        user: { basicData: { naturalPersonData: true, legalEntityData: true } },
        package: { configurations: { rol: true } },
      },
    });
  }

  async findByTenant(tenantId: string) {
    const dependency = await this.contractRepository.manager
      .createQueryBuilder()
      .select('ud.principalUserId')
      .from('user_dependencies', 'ud')
      .where('ud.dependentUserId = :tenantId', { tenantId })
      .andWhere('ud.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    const userId = dependency?.principalUserId || tenantId;

    const contract = await this.contractRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'package'],
    });

    if (!contract) throw new NotFoundException('Contract not found for tenant');
    return contract;
  }

  async findByPackage(packageId: string) {
    return this.contractRepository.find({ where: { package: { id: packageId } } });
  }

  async findActive() {
    return this.contractRepository.find({
      where: { status: ContractStatus.ACTIVE },
      relations: {
        user: { basicData: { naturalPersonData: true, legalEntityData: true } },
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

    return { data: contracts, total, limit, offset, totalPages: Math.ceil(total / limit) };
  }

  async savePdfUrl(contractId: string, pdfUrl: string): Promise<Contract> {
    const contract = await this.findOne(contractId);
    contract.pdfUrl = pdfUrl;
    return this.contractRepository.save(contract);
  }

  async uploadContractPDF(contractId: string, pdfBuffer: Buffer): Promise<string> {
    const contract = await this.findOne(contractId);

    if (contract.pdfUrl) {
      await this.cloudinaryService.deletePDFByUrl(contract.pdfUrl);
    }

    const fileName = `contract_${contract.code || contractId}.pdf`;
    const uploadResult = await this.cloudinaryService.uploadPDF(pdfBuffer, fileName);
    
    // Mark as issued when PDF is generated
    contract.pdfUrl = uploadResult.secure_url;
    contract.issuedAt = new Date();
    await this.contractRepository.save(contract);

    // Si el usuario ya verificó su correo, enviar el contrato inmediatamente
    if (contract.user?.isVerified) {
      this.sendContractEmail(contract, uploadResult.secure_url).catch((err) =>
        this.logger.error(`Error sending contract email: ${err.message}`),
      );
    }

    return uploadResult.secure_url;
  }

  async issueContract(contractId: string): Promise<Contract> {
    const contract = await this.findOne(contractId);

    if (!contract.pdfUrl || contract.pdfUrl.trim() === '') {
      throw new BadRequestException(
        'Cannot issue contract. The contract PDF must be generated first.',
      );
    }

    contract.issuedAt = new Date();
    const savedContract = await this.contractRepository.save(contract);

    // Send contract to client via email
    if (contract.user?.strUserName && contract.pdfUrl) {
      this.sendContractEmail(contract, contract.pdfUrl).catch((err) =>
        this.logger.error(`Error sending issued contract email: ${err.message}`),
      );
    }

    return savedContract;
  }

  async signContract(contractId: string): Promise<Contract> {
    const contract = await this.findOne(contractId);

    if (!contract.pdfUrl || !contract.issuedAt) {
      throw new BadRequestException(
        'Cannot sign contract. The contract PDF must be generated first.',
      );
    }

    contract.signedAt = new Date();
    return this.contractRepository.save(contract);
  }

  async activateContract(id: string): Promise<Contract> {
    const contract = await this.findOne(id);

    if (contract.status === ContractStatus.ACTIVE) {
      throw new BadRequestException('Contract is already active');
    }

    const userIsConfirmed =
      contract.user?.isVerified ||
      contract.user?.strStatus === 'CONFIRMED' ||
      contract.user?.strStatus === 'ACTIVE' ||
      contract.user?.strStatus === 'INACTIVE';

    if (!userIsConfirmed) {
      throw new ForbiddenException(
        'No se puede activar el contrato. El usuario no ha sido confirmado.',
      );
    }

    const dependentUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.principals', 'dependency')
      .where('dependency.principalUserId = :principalId', { principalId: contract.user.id })
      .andWhere('dependency.status = :status', { status: 'ACTIVE' })
      .getCount();

    if (dependentUsers === 0) {
      throw new BadRequestException(
        'No se puede activar el contrato. Debe crear al menos una cuenta de usuario dependiente.',
      );
    }

    if (!contract.pdfUrl || contract.pdfUrl.trim() === '') {
      throw new BadRequestException(
        'No se puede activar el contrato. Debe generar el PDF del contrato antes de activarlo.',
      );
    }

    if (!contract.issuedAt) {
      throw new BadRequestException(
        'No se puede activar el contrato. El contrato debe estar emitido antes de activarlo.',
      );
    }

    if (!contract.signedAt) {
      throw new BadRequestException(
        'No se puede activar el contrato. El contrato debe estar firmado antes de activarlo.',
      );
    }

    return this.updateStatus(id, ContractStatus.ACTIVE);
  }

  async updateStatus(id: string, status: string): Promise<Contract> {
    const contract = await this.findOne(id);

    if (status === ContractStatus.ACTIVE) {
      const userIsConfirmed =
        contract.user?.isVerified ||
        contract.user?.strStatus === 'CONFIRMED' ||
        contract.user?.strStatus === 'ACTIVE' ||
        contract.user?.strStatus === 'INACTIVE';

      if (!userIsConfirmed) {
        throw new ForbiddenException(
          'No se puede activar el contrato. El usuario no ha sido confirmado.',
        );
      }

      const dependentUsers = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.principals', 'dependency')
        .where('dependency.principalUserId = :principalId', { principalId: contract.user.id })
        .andWhere('dependency.status = :status', { status: 'ACTIVE' })
        .getCount();

      if (dependentUsers === 0) {
        throw new BadRequestException(
          'Cannot activate contract. At least one dependent user account must be created.',
        );
      }

      if (!contract.pdfUrl || contract.pdfUrl.trim() === '') {
        throw new BadRequestException(
          'Cannot activate contract. Contract PDF must be generated before activation.',
        );
      }

      if (!contract.issuedAt) {
        throw new BadRequestException(
          'Cannot activate contract. The contract must be issued (PDF generated) first.',
        );
      }

      if (!contract.signedAt) {
        throw new BadRequestException(
          'Cannot activate contract. The contract must be signed before activation.',
        );
      }
    }

    contract.status = status as ContractStatus;
    const savedContract = await this.contractRepository.save(contract);

    if (status === ContractStatus.ACTIVE) {
      // Activate principal user and dependents
      await this.userRepository.update({ id: contract.user.id }, { strStatus: 'ACTIVE' });

      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ strStatus: 'ACTIVE' })
        .where(
          'id IN (SELECT "dependentUserId" FROM user_dependencies WHERE "principalUserId" = :principalId AND status = :status)',
          { principalId: contract.user.id, status: 'ACTIVE' },
        )
        .execute();

      await this.logsService.info(
        LogAction.CONTRACT_ACTIVATED,
        `Contract ${contract.code} activated successfully`,
        contract.user.id,
        contract.id,
        { contractCode: contract.code, userEmail: contract.user.strUserName },
      );

      await this.logsService.info(
        LogAction.USER_ACTIVATED,
        `User ${contract.user.strUserName} and dependents activated`,
        contract.user.id,
        contract.id,
      );

      this.notificationsService
        .sendByTemplate('CONTRACT_ACTIVATED', contract.user.strUserName, {
          customerName: contract.user.basicData?.naturalPersonData
            ? `${contract.user.basicData.naturalPersonData.firstName} ${contract.user.basicData.naturalPersonData.firstSurname}`
            : contract.user.basicData?.legalEntityData?.businessName || contract.user.strUserName,
          contractCode: contract.code,
          packageName: contract.package?.name || 'N/A',
          startDate: contract.startDate?.toString() || 'N/A',
          endDate: contract.endDate?.toString() || 'N/A',
          year: new Date().getFullYear().toString(),
        })
        .catch((err) => this.logger.error(`Notification error: ${err.message}`));
    } else {
      await this.userRepository.update({ id: contract.user.id }, { strStatus: 'INACTIVE' });

      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ strStatus: 'INACTIVE' })
        .where(
          'id IN (SELECT "dependentUserId" FROM user_dependencies WHERE "principalUserId" = :principalId AND status = :status)',
          { principalId: contract.user.id, status: 'ACTIVE' },
        )
        .execute();

      await this.logsService.info(
        LogAction.CONTRACT_DEACTIVATED,
        `Contract ${contract.code} status changed to ${status}`,
        contract.user.id,
        contract.id,
        { contractCode: contract.code, newStatus: status },
      );

      await this.logsService.info(
        LogAction.USER_DEACTIVATED,
        `User ${contract.user.strUserName} and dependents deactivated`,
        contract.user.id,
        contract.id,
      );
    }

    return savedContract;
  }

  private getCustomerName(contract: Contract): string {
    return contract.user.basicData?.naturalPersonData
      ? `${contract.user.basicData.naturalPersonData.firstName} ${contract.user.basicData.naturalPersonData.firstSurname}`
      : contract.user.basicData?.legalEntityData?.businessName || contract.user.strUserName;
  }

  private async sendContractEmail(contract: Contract, pdfUrl: string): Promise<void> {
    await this.notificationsService.sendByTemplate('CONTRACT_READY', contract.user.strUserName, {
      customerName: this.getCustomerName(contract),
      contractCode: contract.code,
      packageName: contract.package?.name || 'N/A',
      pdfUrl,
      year: new Date().getFullYear().toString(),
    });
  }

  // Llamado desde UsersService cuando el usuario verifica su correo
  async sendContractOnVerification(userId: string): Promise<void> {
    const contract = await this.contractRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'user',
        'user.basicData',
        'user.basicData.naturalPersonData',
        'user.basicData.legalEntityData',
        'package',
      ],
    });

    if (!contract?.pdfUrl) return; // No hay contrato o no tiene PDF aún

    await this.sendContractEmail(contract, contract.pdfUrl);
  }

  private async validateCodePrefix(codePrefix: string, userId: string): Promise<void> {
    const existingContract = await this.contractRepository
      .createQueryBuilder('contract')
      .innerJoin('contract.user', 'user')
      .where('contract.codePrefix = :codePrefix', { codePrefix })
      .andWhere('user.id != :userId', { userId })
      .getOne();

    if (existingContract) {
      throw new BadRequestException(`El prefijo '${codePrefix}' ya fue utilizado por otro cliente`);
    }
  }

  async findTenantLimits(tenantId: string) {
    // Reuse findByTenant logic to resolve the active contract for the tenant
    const dependency = await this.contractRepository.manager
      .createQueryBuilder()
      .select('ud.principalUserId')
      .from('user_dependencies', 'ud')
      .where('ud.dependentUserId = :tenantId', { tenantId })
      .andWhere('ud.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    const userId = dependency?.principalUserId || tenantId;

    const contract = await this.contractRepository.findOne({
      where: { user: { id: userId } },
      relations: ['package', 'package.usageLimitVariables'],
    });

    if (!contract) {
      throw new NotFoundException(
        `No se encontró un contrato activo para el tenant '${tenantId}'`,
      );
    }

    const limits = (contract.package?.usageLimitVariables ?? []).map((v) => ({
      variableName: v.variableName,
      displayName: v.displayName,
      maxValue: v.maxValue,
      targetApplication: v.targetApplication,
    }));

    return {
      contractId: contract.id,
      packageName: contract.package?.name ?? '',
      isBillable: contract.package?.isBillable ?? true,
      limits,
    };
  }

  async validateCodePrefixPublic(codePrefix: string): Promise<void> {
    const existingContract = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.codePrefix = :codePrefix', { codePrefix })
      .getOne();

    if (existingContract) {
      throw new BadRequestException(`El prefijo '${codePrefix}' ya fue utilizado por otro cliente`);
    }
  }

  /**
   * Notifies all users with 'adminFactonet' role that a new contract needs management.
   */
  async notifyAdminFactonet(contract: Contract, user: User, pkg: Package): Promise<void> {
    // Find all users with adminFactonet role
    const adminUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_roles', 'ur', 'ur."userId" = user.id')
      .innerJoin('rol', 'r', 'r.id = ur."roleId"')
      .where('r."strName" = :roleName', { roleName: 'adminFactonet' })
      .andWhere('ur.status = :status', { status: 'ACTIVE' })
      .getMany();

    if (adminUsers.length === 0) {
      this.logger.warn('No adminFactonet users found to notify about new contract');
      return;
    }

    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';
    const year = new Date().getFullYear().toString();
    const customerName = user.basicData?.legalEntityData?.businessName
      || (user.basicData?.naturalPersonData ? `${user.basicData.naturalPersonData.firstName} ${user.basicData.naturalPersonData.firstSurname}` : user.strUserName);
    const monthlyValue = `$${Number(pkg.price || 0).toLocaleString('es-CO')}`;

    for (const admin of adminUsers) {
      try {
        await this.notificationsService.sendByTemplate('NEW_CONTRACT_ADMIN', admin.strUserName, {
          customerName: customerName || 'N/A',
          customerEmail: user.strUserName,
          documentNumber: user.basicData?.documentNumber || 'N/A',
          packageName: pkg.name || 'N/A',
          monthlyValue,
          contractCode: contract.code,
          mode: contract.mode || 'MONTHLY',
          startDate: contract.startDate ? new Date(contract.startDate).toLocaleDateString('es-CO') : 'N/A',
          endDate: contract.endDate ? new Date(contract.endDate).toLocaleDateString('es-CO') : 'Indefinido',
          status: contract.status || 'PENDING',
          factonetUrl,
          year,
        });
      } catch (err) {
        this.logger.warn(`Failed to notify admin ${admin.strUserName}: ${err.message}`);
      }
    }

    this.logger.log(`Notified ${adminUsers.length} adminFactonet user(s) about contract ${contract.code}`);
  }
}
