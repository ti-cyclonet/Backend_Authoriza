import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
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
    @InjectRepository(UserDependency)
    private readonly userDependencyRepository: Repository<UserDependency>,
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

    // Si el contrato se crea directamente ACTIVO (ej. paquetes DEV/FREE creados
    // desde la gestión de contratos), asignar aquí los roles del paquete —
    // igual que hace updateStatus — para que el usuario tenga su rol de la app
    // (ej. adminShotra) y pueda iniciar sesión. Sin esto, el contrato queda
    // "ACTIVO" pero sin rol, y el login rechaza al usuario.
    if (savedContract.status === ContractStatus.ACTIVE) {
      await this.assignPackageRoles(dto.userId, dto.packageId, savedContract.id);
      // Asegurar que el usuario quede ACTIVE (no pisar estados de verificación)
      if (user.strStatus !== 'UNCONFIRMED' && user.strStatus !== 'CONFIRMED') {
        await this.userRepository.update({ id: dto.userId }, { strStatus: 'ACTIVE' });
      }
    }

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
    let recalculatedValue: number | undefined;
    let downgradedToNonBillableKiri = false;
    const previousPackage = contract.package;
    if (dto.packageId) {
      const pkg = await this.packageRepository.findOne({ where: { id: dto.packageId } });
      if (!pkg) throw new BadRequestException('Package not found');
      (contract as any).package = pkg;
      // Un paquete NO facturable (DEV / FREE) no genera cobro: su contrato debe
      // quedar en valor 0, sin importar el price del paquete. Solo los paquetes
      // facturables calculan el valor anual (price * 12).
      const newIsNonBillable = (pkg as any).isBillable === false || Number(pkg.price) === 0;
      // When the package changes and no explicit value is provided, recalculate
      // the contract value: 0 for non-billable, price*12 for billable.
      if (dto.value === undefined || dto.value === null) {
        recalculatedValue = newIsNonBillable ? 0 : (Number(pkg.price) || 0) * 12;
      }
      // Detect a Kiri downgrade from a billable plan (e.g. KIRI PLUS) to a
      // non-billable one (e.g. KIRI DEV / FREE). In that case the user no longer
      // needs FactoNet self-invoicing access, so it must be revoked.
      const newIsKiri = (pkg as any).targetApplication === 'Kiri';
      const prevWasBillable = previousPackage
        ? ((previousPackage as any).isBillable !== false && Number(previousPackage.price) > 0)
        : false;
      if (newIsKiri && newIsNonBillable && prevWasBillable) {
        downgradedToNonBillableKiri = true;
      }
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
      value: dto.value ?? recalculatedValue ?? contract.value,
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

    // Downgrade Kiri (billable -> non-billable): revoke FactoNet self-invoicing
    // access for this contract's user and drop the authorized-signer flag.
    if (downgradedToNonBillableKiri) {
      await this.revokeKiriFactonetAccess(savedContract).catch((err) =>
        this.logger.warn(`Error revoking FactoNet access on Kiri downgrade: ${err.message}`),
      );
    }

    // Si el estado cambió, usar updateStatus para activar/desactivar dependientes
    if (statusChanged) {
      return this.updateStatus(id, dto.status);
    }

    return savedContract;
  }

  /**
   * Revokes FactoNet self-invoicing access when a Kiri contract is downgraded
   * from a billable plan (KIRI PLUS) to a non-billable one (KIRI DEV / FREE).
   * Removes the adminInvoices UserRole tied to this contract and, if the user
   * has no other billable contract requiring it, clears the authorized-signer flag.
   */
  private async revokeKiriFactonetAccess(contract: Contract): Promise<void> {
    const userId = contract.user?.id;
    if (!userId) return;

    const manager = this.contractRepository.manager;

    // 1. Find the adminInvoices role id
    const adminInvoicesRole = await manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('rol', 'r')
      .where('r."strName" = :name', { name: 'adminInvoices' })
      .getRawOne();

    if (adminInvoicesRole?.id) {
      // 2. Remove the adminInvoices role tied to THIS contract (this tenant)
      const result = await manager
        .createQueryBuilder()
        .delete()
        .from('user_roles')
        .where('"userId" = :userId', { userId })
        .andWhere('"roleId" = :roleId', { roleId: adminInvoicesRole.id })
        .andWhere('"contractId" = :contractId', { contractId: contract.id })
        .execute();
      this.logger.log(
        `Revoked FactoNet (adminInvoices) access for user ${userId} on contract ${contract.code} (${result.affected ?? 0} role(s) removed)`,
      );
    }

    // 3. If the user has no remaining billable contract, clear the signer flag
    const remainingBillable = await manager
      .createQueryBuilder(Contract, 'c')
      .leftJoin('c.package', 'p')
      .where('c."userId" = :userId', { userId })
      .andWhere('c.id != :contractId', { contractId: contract.id })
      .andWhere('c.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('p."isBillable" = true')
      .andWhere('p.price > 0')
      .getCount();

    if (remainingBillable === 0) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user && user.isAuthorizedSigner) {
        user.isAuthorizedSigner = false;
        await this.userRepository.save(user);
        this.logger.log(`Cleared authorized-signer flag for user ${userId} (no remaining billable contracts)`);
      }
    }

    // 4. Notify InOut/clients to refresh caches
    this.invalidateClientCaches(userId).catch(() => {});
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

    // Desactivar SOLO el acceso ligado a este contrato (no rompe otras apps del usuario)
    if (contract.user) {
      await this.deactivateContractScope(contract.id, contract.user.id);

      await this.logsService.info(
        LogAction.USER_DEACTIVATED,
        `Roles for contract ${contract.code} deactivated due to contract deletion`,
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
    // Resolver dependiente -> principal con SQL crudo y columnas entre comillas
    // (ver nota en findTenantLimits: sin comillas Postgres no encuentra las
    // columnas camelCase y la dependencia no se resolvia).
    const depRows: Array<{ principalUserId: string }> = await this.contractRepository.manager.query(
      `SELECT "principalUserId" FROM user_dependencies
       WHERE "dependentUserId" = $1 AND status = 'ACTIVE' LIMIT 1`,
      [tenantId],
    );
    const userId = depRows[0]?.principalUserId || tenantId;

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
      // Ocultar de la lista los contratos cancelados/eliminados (ej. el FREE
      // reemplazado al pasar a PLUS). No se borran, solo no ensucian la vista.
      where: { status: Not(In([ContractStatus.CANCELLED, ContractStatus.DELETED])) },
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

    // Si el usuario ya verificó su correo, enviar el contrato inmediatamente.
    // EXCEPCIÓN: en el flujo "admin firma primero" (Kiri/Shotra), NO se envía
    // aquí; el correo al cliente se dispara cuando el admin firma (signAsAdmin),
    // para no invitar al cliente antes de tiempo.
    if (contract.user?.isVerified && !this.isAdminFirstSigningFlow(contract)) {
      this.sendContractEmail(contract, uploadResult.secure_url).catch((err) =>
        this.logger.error(`Error sending contract email: ${err.message}`),
      );
    }

    return uploadResult.secure_url;
  }

  /**
   * Indica si el contrato sigue el flujo "el admin firma primero y luego se
   * invita al cliente a firmar" (planes personales de Kiri y Shotra). En ese
   * caso el correo CONTRACT_READY se envía tras la firma del admin, no al
   * emitir el PDF. Los demás (InOut/empresa) mantienen el flujo cliente-primero.
   */
  private isAdminFirstSigningFlow(contract: Contract): boolean {
    const app = (contract.package as any)?.targetApplication;
    return app === 'Kiri' || app === 'Shotra';
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

    // Send contract to client via email (excepto en flujo admin-primero Kiri/Shotra,
    // donde el correo se envía tras la firma del admin).
    if (contract.user?.strUserName && contract.pdfUrl && !this.isAdminFirstSigningFlow(contract)) {
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

  /**
   * Client signs the contract.
   * Contract must be ISSUED (have a PDF) to be signed by the client.
   */
  async signAsClient(contractId: string, signedBy: string, ip: string, userId?: string): Promise<Contract> {
    const contract = await this.findOne(contractId);

    if (!contract.pdfUrl || !contract.issuedAt) {
      throw new BadRequestException(
        'El contrato debe estar emitido (con PDF) antes de poder firmarse.',
      );
    }

    if (contract.clientSignedAt) {
      throw new BadRequestException('El cliente ya ha firmado este contrato.');
    }

    // Validate signer authorization
    if (userId) {
      const contractOwnerId = contract.user?.id;

      // Case 1: The signer IS the contract owner (KIRI user signing their own contract)
      if (userId === contractOwnerId) {
        // Owner can always sign their own contract — no extra validation needed
      } else {
        // Case 2: The signer is a dependent — check UserDependency.isAuthorizedSigner
        const dependency = await this.userDependencyRepository.findOne({
          where: {
            principalUserId: contractOwnerId,
            dependentUserId: userId,
            status: 'ACTIVE',
          },
        });

        if (!dependency) {
          throw new BadRequestException(
            'No tienes relación de dependencia con el dueño del contrato.',
          );
        }

        if (!dependency.isAuthorizedSigner) {
          throw new BadRequestException(
            'No tienes autorización para firmar. El administrador debe designarte como firmante autorizado en la gestión de dependencias.',
          );
        }
      }
    }

    contract.clientSignedAt = new Date();
    contract.clientSignedBy = signedBy;
    contract.clientSignedByUserId = userId || null;
    contract.clientSignedIp = ip;

    const saved = await this.contractRepository.save(contract);

    // If admin already signed, activate automatically
    if (saved.adminSignedAt) {
      return this.autoActivateIfBothSigned(saved);
    }

    // Notify authorized admin signer that client has signed
    this.notifyAuthorizedAdminSigner(saved).catch(err =>
      this.logger.warn(`Failed to notify admin signer: ${err.message}`),
    );

    return saved;
  }

  /**
   * Admin signs the contract.
   * Requires that the contract is ISSUED.
   */
  async signAsAdmin(contractId: string, signedBy: string, ip: string, userId?: string): Promise<Contract> {
    const contract = await this.findOne(contractId);

    if (!contract.pdfUrl || !contract.issuedAt) {
      throw new BadRequestException(
        'El contrato debe estar emitido (con PDF) antes de poder firmarse.',
      );
    }

    if (contract.adminSignedAt) {
      throw new BadRequestException('El administrador ya ha firmado este contrato.');
    }

    // Validate authorized admin signer
    if (userId) {
      // Check if user is an authorized signer via User entity or UserDependency
      const signerUser = await this.userRepository.findOne({ where: { id: userId } });
      const isSignerViaUser = signerUser?.isAuthorizedSigner === true;

      if (!isSignerViaUser) {
        const signerDependency = await this.userDependencyRepository.findOne({
          where: {
            dependentUserId: userId,
            status: 'ACTIVE',
            isAuthorizedSigner: true,
          },
        });

        if (!signerDependency) {
          throw new BadRequestException(
            'No tienes autorización para firmar contratos. Debes ser designado como firmante autorizado.',
          );
        }
      }
    }

    contract.adminSignedAt = new Date();
    contract.adminSignedBy = signedBy;
    contract.adminSignedIp = ip;
    contract.signedAt = new Date(); // Legacy field compatibility

    const saved = await this.contractRepository.save(contract);

    // If client already signed, activate automatically
    if (saved.clientSignedAt) {
      return this.autoActivateIfBothSigned(saved);
    }

    // El admin firmó primero: recién ahora se invita al CLIENTE a firmar.
    // Este es el punto correcto para el correo "contrato listo para revisión"
    // (antes se enviaba al emitir el PDF, demasiado pronto).
    if (saved.pdfUrl) {
      this.sendContractEmail(saved, saved.pdfUrl).catch((err) =>
        this.logger.error(`Error sending contract-ready email after admin signature: ${err.message}`),
      );
    }

    return saved;
  }

  /**
   * Get signature status for a contract.
   */
  async getSignatures(contractId: string) {
    const contract = await this.findOne(contractId);
    return {
      contractId: contract.id,
      code: contract.code,
      status: contract.status,
      client: contract.clientSignedAt ? {
        signedAt: contract.clientSignedAt,
        signedBy: contract.clientSignedBy,
        signedByUserId: contract.clientSignedByUserId || null,
        ip: contract.clientSignedIp,
      } : null,
      admin: contract.adminSignedAt ? {
        signedAt: contract.adminSignedAt,
        signedBy: contract.adminSignedBy,
        ip: contract.adminSignedIp,
      } : null,
      bothSigned: !!(contract.clientSignedAt && contract.adminSignedAt),
    };
  }

  /**
   * Auto-activate contract when both parties have signed.
   */
  private async autoActivateIfBothSigned(contract: Contract): Promise<Contract> {
    if (contract.clientSignedAt && contract.adminSignedAt && contract.status !== ContractStatus.ACTIVE) {
      contract.status = ContractStatus.ACTIVE;
      contract.startDate = new Date();

      // Calculate endDate based on temporal limit or default to 1 year
      const nDiasUso = contract.package?.usageLimitVariables?.find(
        (v) => v.variableName === 'nDiasUso',
      );
      if (nDiasUso && nDiasUso.maxValue > 0) {
        const end = new Date();
        end.setDate(end.getDate() + nDiasUso.maxValue);
        contract.endDate = end;
      } else {
        // Default: 1 year from start
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);
        contract.endDate = end;
      }

      const saved = await this.contractRepository.save(contract);

      // Activate principal user and all dependents
      const principalUserId = contract.user?.id;
      if (principalUserId) {
        await this.userRepository.update({ id: principalUserId }, { strStatus: 'ACTIVE' });
        this.logger.log(`User ${principalUserId} activated (contract owner).`);

        // Activate dependent users
        await this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({ strStatus: 'ACTIVE' })
          .where('"id" IN (SELECT "dependentUserId" FROM user_dependencies WHERE "principalUserId" = :principalId AND status = :status)', {
            principalId: principalUserId,
            status: 'ACTIVE',
          })
          .execute();
        this.logger.log(`Dependent users of ${principalUserId} activated.`);
      }

      // Send welcome email to the client
      this.sendContractActivatedEmail(contract).catch(err =>
        this.logger.warn(`Failed to send contract activated email: ${err.message}`)
      );

      // Cancelar CUALQUIER otro contrato del usuario para la misma aplicacion
      // (el plan anterior, ej. KIRI FREE), sin importar su estado previo — el
      // nuevo contrato firmado lo reemplaza. Antes solo se cancelaban los que
      // estaban en ACTIVE, por lo que un FREE en otro estado (PENDING, etc.)
      // quedaba duplicado junto al nuevo PLUS.
      // Se excluyen los ya CANCELLED (nada que hacer) y el propio contrato nuevo.
      // Wrapped in try/catch: un fallo aca NO debe bloquear el webhook de
      // reactivacion de Kiri ni el correo de bienvenida que siguen.
      if (contract.package?.targetApplication && principalUserId) {
        try {
          // 1. Identificar los contratos viejos de la misma app (a reemplazar).
          const oldContracts = await this.contractRepository
            .createQueryBuilder('c')
            .innerJoin('c.package', 'p')
            .where('c."userId" = :userId', { userId: principalUserId })
            .andWhere('c.id != :contractId', { contractId: contract.id })
            .andWhere('p."targetApplication" = :app', { app: contract.package.targetApplication })
            .andWhere('c.status != :cancelled', { cancelled: ContractStatus.CANCELLED })
            .getMany();

          if (oldContracts.length > 0) {
            const oldIds = oldContracts.map((c) => c.id);

            // 2. Cancelar esos contratos (el nuevo plan los reemplaza).
            await this.contractRepository
              .createQueryBuilder()
              .update(Contract)
              .set({ status: ContractStatus.CANCELLED })
              .whereInIds(oldIds)
              .execute();

            // 3. Desactivar los roles vinculados a esos contratos (ej. userKiri del
            //    FREE), para que no queden roles del plan viejo activos junto al nuevo.
            await this.contractRepository.manager.query(
              `UPDATE user_roles SET status = 'INACTIVE'
               WHERE "userId" = $1 AND "contractId" = ANY($2::uuid[]) AND status = 'ACTIVE'`,
              [principalUserId, oldIds],
            );

            this.logger.log(
              `Reemplazados ${oldIds.length} contrato(s) viejo(s) de ${contract.package.targetApplication} para el usuario ${principalUserId} (cancelados + roles desactivados).`,
            );
          }
        } catch (err) {
          this.logger.warn(`Failed to cancel old contracts for user ${principalUserId}: ${err.message}`);
        }
      }

      // Notify Kiri to reactivate local user (for Kiri app contracts)
      if (contract.package?.targetApplication === 'Kiri') {
        this.notifyKiriUserReactivation(contract).catch(err =>
          this.logger.warn(`Failed to notify Kiri for user reactivation: ${err.message}`)
        );
      }

      this.logger.log(`Contract ${contract.code} auto-activated: both parties signed.`);
      return saved;
    }
    return contract;
  }

  /**
   * Send welcome email to the client after contract activation.
   */
  private async sendContractActivatedEmail(contract: Contract): Promise<void> {
    const clientEmail = contract.user?.strUserName;
    const clientName = contract.user?.basicData?.legalEntityData?.businessName
      || contract.user?.basicData?.naturalPersonData?.firstName
      || clientEmail;
    const packageName = contract.package?.name || 'N/A';
    const startDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Indefinida';
    const year = new Date().getFullYear().toString();

    if (clientEmail) {
      try {
        await this.notificationsService.sendByTemplate('CONTRACT_ACTIVATED', clientEmail, {
          customerName: clientName || 'Client',
          contractCode: contract.code,
          packageName,
          startDate,
          endDate,
          year,
        });
        this.logger.log(`Contract activated email sent to ${clientEmail}`);
      } catch (err) {
        this.logger.warn(`Failed to send activation email to ${clientEmail}: ${err.message}`);
      }
    }

    // Also send to dependent users
    if (contract.user?.id) {
      const dependents = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.principals', 'dep')
        .where('dep.principalUserId = :principalId', { principalId: contract.user.id })
        .andWhere('dep.status = :status', { status: 'ACTIVE' })
        .getMany();

      for (const dep of dependents) {
        if (dep.strUserName && dep.strUserName !== clientEmail) {
          try {
            await this.notificationsService.sendByTemplate('CONTRACT_ACTIVATED', dep.strUserName, {
              customerName: dep.basicData?.naturalPersonData?.firstName || dep.strUserName,
              contractCode: contract.code,
              packageName,
              startDate,
              endDate,
              year,
            });
          } catch (err) {
            this.logger.warn(`Failed to send activation email to dependent ${dep.strUserName}: ${err.message}`);
          }
        }
      }
    }
  }

  /**
   * Notify the authorized admin signer (adminFactonet with isAuthorizedSigner=true)
   * that a client has signed a contract and it's pending their signature.
   */
  private async notifyAuthorizedAdminSigner(contract: Contract): Promise<void> {
    // Find adminFactonet users who are authorized signers
    const authorizedAdmins = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_roles', 'ur', 'ur."userId" = user.id')
      .innerJoin('rol', 'r', 'r.id = ur."roleId"')
      .where('r."strName" = :roleName', { roleName: 'adminFactonet' })
      .andWhere('ur.status = :status', { status: 'ACTIVE' })
      .andWhere('user."isAuthorizedSigner" = :signer', { signer: true })
      .andWhere('user."strStatus" = :userStatus', { userStatus: 'ACTIVE' })
      .getMany();

    if (authorizedAdmins.length === 0) {
      this.logger.warn('No authorized admin signer found to notify about client signature.');
      return;
    }

    const customerName = this.getCustomerName(contract);
    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';

    for (const admin of authorizedAdmins) {
      try {
        await this.notificationsService.sendByTemplate('CONTRACT_PENDING_ADMIN_SIGNATURE', admin.strUserName, {
          adminName: admin.basicData?.naturalPersonData?.firstName || admin.strUserName,
          customerName: customerName || 'Cliente',
          contractCode: contract.code,
          packageName: contract.package?.name || 'N/A',
          factonetUrl,
          year: new Date().getFullYear().toString(),
        });
        this.logger.log(`Notification sent to authorized signer: ${admin.strUserName}`);
      } catch (err) {
        this.logger.warn(`Failed to notify ${admin.strUserName}: ${err.message}`);
      }
    }
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

    // Owner users with isAuthorizedSigner can operate alone without dependents
    const ownerCanSignAlone = contract.user?.isAuthorizedSigner === true;

    if (!ownerCanSignAlone) {
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

      // Owner users with isAuthorizedSigner can operate alone without dependents
      const ownerCanSignAlone = contract.user?.isAuthorizedSigner === true;

      // Paquetes no facturables (DEV, FREE) se activan directamente sin dependientes, PDF ni firma.
      const isNonBillable = contract.package?.isBillable === false || Number(contract.package?.price) === 0;

      if (!isNonBillable && !ownerCanSignAlone) {
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
      }

      if (!isNonBillable && (!contract.pdfUrl || contract.pdfUrl.trim() === '')) {
        throw new BadRequestException(
          'Cannot activate contract. Contract PDF must be generated before activation.',
        );
      }

      if (!isNonBillable && !contract.issuedAt) {
        throw new BadRequestException(
          'Cannot activate contract. The contract must be issued (PDF generated) first.',
        );
      }

      if (!isNonBillable && !contract.signedAt) {
        throw new BadRequestException(
          'Cannot activate contract. The contract must be signed before activation.',
        );
      }
    }

    contract.status = status as ContractStatus;
    const savedContract = await this.contractRepository.save(contract);

    if (status === ContractStatus.ACTIVE) {
      // Reactivar los roles ligados a ESTE contrato (por si fueron desactivados antes)
      await this.contractRepository.manager.query(
        `UPDATE user_roles SET status = 'ACTIVE' WHERE "contractId" = $1`,
        [contract.id],
      );

      // Activate principal user and dependents (solo pone ACTIVE; no rompe otras apps)
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

      // Asignar los roles configurados en el paquete al usuario del contrato
      if (contract.package?.id) {
        await this.assignPackageRoles(contract.user.id, contract.package.id, contract.id);
      }

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

      // Notify Kiri to reactivate local user (for Kiri app contracts)
      if (contract.package?.targetApplication === 'Kiri') {
        this.notifyKiriUserReactivation(contract).catch(err =>
          this.logger.warn(`Failed to notify Kiri for user reactivation: ${err.message}`)
        );
      }
    } else {
      // Desactivación AISLADA AL CONTRATO: solo se desactivan los roles ligados a
      // ESTE contrato. El strStatus global del usuario solo cae a INACTIVE si no le
      // queda ningún otro rol activo (en ninguna otra app/contrato). Así una app no
      // rompe el acceso a las demás.
      await this.deactivateContractScope(contract.id, contract.user.id);

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

  /**
   * Asigna al usuario del contrato los roles configurados en el paquete
   * (configuration_package → user_roles), scopeados a ESTE contractId.
   * Idempotente: no duplica filas existentes. Reutilizado por create() y updateStatus().
   */
  private async assignPackageRoles(userId: string, packageId: string, contractId: string): Promise<void> {
    const manager = this.contractRepository.manager;
    try {
      const packageConfigs = await manager.query(
        `SELECT cp."rolId" FROM configuration_package cp WHERE cp."packageId" = $1`,
        [packageId],
      );
      for (const config of packageConfigs) {
        const existingRole = await manager.query(
          `SELECT id FROM user_roles WHERE "userId" = $1 AND "roleId" = $2 AND "contractId" = $3`,
          [userId, config.rolId, contractId],
        );
        if (!existingRole || existingRole.length === 0) {
          await manager.query(
            `INSERT INTO user_roles (id, "userId", "roleId", "contractId", status) VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE')`,
            [userId, config.rolId, contractId],
          );
          this.logger.log(`Role ${config.rolId} assigned to user ${userId} for contract ${contractId}`);
        }
      }

      // BONUS CycloNet: al activar un contrato de InOut, el/los OPERADOR(es) con
      // adminInout de este contrato obtienen acceso gratuito a Shotra (userShotra
      // / plan FREE) para publicar solicitudes de domicilio desde InOut.
      await this.grantShotraBonusIfInout(packageId, contractId);
    } catch (err) {
      this.logger.warn(`Failed to assign package roles: ${(err as Error).message}`);
    }
  }

  /**
   * BONUS por ser cliente CycloNet: si el contrato activado apunta a InOut, se
   * otorga el rol `userShotra` (SHOTRA FREE) al/los OPERADOR(es) del contrato —
   * es decir, quien(es) tienen `adminInout` en ESTE contrato— habilitándolos para
   * iniciar sesión en Shotra y publicar solicitudes (p. ej. "entrega a domicilio").
   *
   * IMPORTANTE — a quién se otorga:
   *   En el flujo de InOut el TITULAR (dueño del contrato) queda con `accountOwner`,
   *   que está BLOQUEADO para iniciar sesión en las apps. Quien realmente usa InOut
   *   es el DEPENDIENTE/operador con `adminInout`. Por eso el bonus va a los
   *   titulares de `adminInout` del contrato, NO al dueño del contrato.
   *
   * - Solo aplica a paquetes cuyo targetApplication sea 'Inout'.
   * - Rol otorgado: `userShotra` (plan FREE). NO se otorga adminShotra (PRO).
   * - PERMANENTE: se inserta con contractId = null para que NO se revoque cuando el
   *   contrato de InOut se desactive/cancele (deactivateContractScope solo afecta
   *   filas ligadas a un contractId concreto).
   * - Idempotente: no duplica si el operador ya tiene userShotra. Un rol Shotra
   *   ACTIVE basta para acceder a Shotra (el login no exige contrato de Shotra).
   */
  private async grantShotraBonusIfInout(packageId: string, contractId: string): Promise<void> {
    const manager = this.contractRepository.manager;
    try {
      // 1. Verificar que el paquete apunte a InOut.
      const pkgRows = await manager.query(
        `SELECT "targetApplication" FROM package WHERE id = $1`,
        [packageId],
      );
      const targetApplication: string | undefined = pkgRows?.[0]?.targetApplication;
      if (!targetApplication || targetApplication.toLowerCase() !== 'inout') return;

      // 2. Resolver el rol userShotra.
      const roleRows = await manager.query(
        `SELECT id FROM rol WHERE "strName" = 'userShotra' LIMIT 1`,
      );
      const userShotraRoleId: string | undefined = roleRows?.[0]?.id;
      if (!userShotraRoleId) {
        this.logger.warn(`No se encontró el rol userShotra; no se otorgó el bonus Shotra (contrato ${contractId}).`);
        return;
      }

      // 3. Identificar al/los operador(es) del contrato: usuarios con adminInout
      //    ligado a ESTE contrato. Ellos son quienes usan InOut (no el titular).
      const operators: Array<{ userId: string }> = await manager.query(
        `SELECT ur."userId"
           FROM user_roles ur
           JOIN rol r ON r.id = ur."roleId"
          WHERE ur."contractId" = $1
            AND r."strName" = 'adminInout'
            AND ur.status = 'ACTIVE'`,
        [contractId],
      );
      if (!operators || operators.length === 0) {
        // Aún no hay operador con adminInout (p. ej. contrato pagado activado antes
        // de asignar el rol al dependiente). Se otorgará en verifyRegistration.
        return;
      }

      // 4. Otorgar userShotra PERMANENTE (contractId = null) a cada operador que
      //    no lo tenga ya. Idempotente.
      for (const op of operators) {
        const existing = await manager.query(
          `SELECT id FROM user_roles WHERE "userId" = $1 AND "roleId" = $2 LIMIT 1`,
          [op.userId, userShotraRoleId],
        );
        if (existing && existing.length > 0) continue;

        await manager.query(
          `INSERT INTO user_roles (id, "userId", "roleId", "contractId", status)
           VALUES (gen_random_uuid(), $1, $2, NULL, 'ACTIVE')`,
          [op.userId, userShotraRoleId],
        );
        this.logger.log(`Bonus CycloNet: rol userShotra (Shotra FREE) otorgado al operador ${op.userId} por contrato de InOut ${contractId}.`);
      }
    } catch (err) {
      this.logger.warn(`No se pudo otorgar el bonus Shotra (contrato ${contractId}): ${(err as Error).message}`);
    }
  }

  /**
   * Desactiva el acceso ligado a UN contrato específico, sin afectar el acceso
   * del usuario (ni sus dependientes) a otras aplicaciones/contratos.
   *
   * - Marca user_roles.status = 'INACTIVE' SOLO para las filas de este contractId
   *   (del principal y de los dependientes ligados a ese contrato).
   * - Recalcula el strStatus global del usuario y de cada dependiente: solo queda
   *   INACTIVE si NO le queda ningún otro rol ACTIVE en ninguna app/contrato.
   */
  private async deactivateContractScope(contractId: string, principalUserId: string): Promise<void> {
    const manager = this.contractRepository.manager;

    // 1. Usuarios afectados por este contrato: el titular + dependientes con rol en este contrato
    const affected: Array<{ userId: string }> = await manager.query(
      `SELECT DISTINCT "userId" FROM user_roles WHERE "contractId" = $1`,
      [contractId],
    );
    const affectedIds = new Set<string>(affected.map((r) => r.userId));
    affectedIds.add(principalUserId);

    // 2. Desactivar SOLO los roles de este contrato
    await manager.query(
      `UPDATE user_roles SET status = 'INACTIVE' WHERE "contractId" = $1`,
      [contractId],
    );

    // 3. Recalcular el estado global de cada usuario afectado
    for (const userId of affectedIds) {
      await this.recomputeUserGlobalStatus(userId);
    }
  }

  /**
   * Recalcula user.strStatus según sus roles: si tiene al menos un user_roles
   * ACTIVE, queda 'ACTIVE'; si no le queda ninguno, 'INACTIVE'. No pisa estados
   * especiales de verificación (UNCONFIRMED).
   */
  private async recomputeUserGlobalStatus(userId: string): Promise<void> {
    const manager = this.contractRepository.manager;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;
    // No tocar usuarios que están en proceso de verificación
    if (user.strStatus === 'UNCONFIRMED' || user.strStatus === 'CONFIRMED') return;

    const activeRoles: Array<{ cnt: string }> = await manager.query(
      `SELECT COUNT(*)::int AS cnt FROM user_roles WHERE "userId" = $1 AND status = 'ACTIVE'`,
      [userId],
    );
    const hasActive = Number(activeRoles?.[0]?.cnt || 0) > 0;
    const newStatus = hasActive ? 'ACTIVE' : 'INACTIVE';

    if (user.strStatus !== newStatus) {
      await this.userRepository.update({ id: userId }, { strStatus: newStatus });
      this.logger.log(`User ${userId} global status recomputed to ${newStatus} (activeRoles=${hasActive})`);
    }
  }

  private getCustomerName(contract: Contract): string {
    return contract.user.basicData?.naturalPersonData
      ? `${contract.user.basicData.naturalPersonData.firstName} ${contract.user.basicData.naturalPersonData.firstSurname}`
      : contract.user.basicData?.legalEntityData?.businessName || contract.user.strUserName;
  }

  private async sendContractEmail(contract: Contract, pdfUrl: string): Promise<void> {
    const factonetUrl = process.env.FACTONET_LOGIN_URL || 'http://localhost:4202/login';
    await this.notificationsService.sendByTemplate('CONTRACT_READY', contract.user.strUserName, {
      customerName: this.getCustomerName(contract),
      contractCode: contract.code,
      packageName: contract.package?.name || 'N/A',
      factonetUrl,
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

    // En flujo admin-primero (Kiri/Shotra) el correo se envía tras la firma del
    // admin, no al verificar el correo del usuario.
    if (this.isAdminFirstSigningFlow(contract)) return;

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

  async findTenantLimits(tenantId: string, application?: string) {
    // Si el tenant es un usuario DEPENDIENTE, resolver al usuario PRINCIPAL
    // (el dueño del contrato). Se usa SQL crudo con los nombres de columna reales
    // entre comillas: sin comillas, Postgres baja a minusculas ("principaluserid")
    // y no encuentra las columnas camelCase, por lo que la dependencia nunca se
    // resolvia y un dependiente terminaba tratado como "sin plan" (FREE).
    const depRows: Array<{ principalUserId: string }> = await this.contractRepository.manager.query(
      `SELECT "principalUserId" FROM user_dependencies
       WHERE "dependentUserId" = $1 AND status = 'ACTIVE' LIMIT 1`,
      [tenantId],
    );
    const userId = depRows[0]?.principalUserId || tenantId;

    // Resolve the contract that governs access. Only ACTIVE contracts grant a plan.
    // A PENDING contract (e.g. a plan upgrade awaiting signature) must NOT be
    // returned, so the app keeps applying the previous/free plan until it activates.
    let contract: any = null;
    const allContracts = await this.contractRepository.find({
      where: { user: { id: userId } },
      relations: ['package', 'package.usageLimitVariables'],
    });

    const activeContracts = allContracts.filter((c) => c.status === 'ACTIVE');

    if (application) {
      const app = application.toLowerCase();

      // ¿Cuántas variables de ESTA app expone el paquete de un contrato?
      // Sirve tanto para incluir paquetes maestro cross-app (CYCLON PLUS, cuyo
      // package.targetApplication es 'Authoriza' pero trae variables de Kiri con
      // maxValue 1) como para desempatar por cobertura de features.
      const appVarCount = (c: any) =>
        (c.package?.usageLimitVariables ?? []).filter(
          (v: any) => v.targetApplication?.toLowerCase() === app,
        ).length;

      // Cuántas de esas variables estan HABILITADAS (feature con maxValue >= 1 o
      // cualquier variable con tope > 0). Un PLUS tendra mas que un FREE, asi que
      // gana el desempate cuando el usuario tiene varios contratos ACTIVE.
      const enabledAppVarCount = (c: any) =>
        (c.package?.usageLimitVariables ?? []).filter(
          (v: any) => v.targetApplication?.toLowerCase() === app && Number(v.maxValue) >= 1,
        ).length;

      // Candidatos: contratos ACTIVE cuyo paquete aplica a la app, ya sea por su
      // targetApplication o por exponer variables de esa app (paquete maestro).
      const candidates = activeContracts.filter(
        (c) =>
          c.package?.targetApplication?.toLowerCase() === app || appVarCount(c) > 0,
      );

      // Seleccion determinista: preferir el que habilita MAS features de la app
      // (PLUS/maestro sobre FREE); desempate por fecha de inicio mas reciente.
      candidates.sort((a, b) => {
        const diff = enabledAppVarCount(b) - enabledAppVarCount(a);
        if (diff !== 0) return diff;
        const ad = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bd = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bd - ad;
      });

      contract = candidates[0] ?? null;
    } else {
      // No application specified: any ACTIVE contract
      contract = activeContracts[0] ?? null;
    }

    if (!contract) {
      // No ACTIVE contract for this app → treated as "no plan" (free tier).
      // Do NOT fall back to PENDING/other-status contracts: an unsigned upgrade
      // must not unlock the new plan.
      throw new NotFoundException(
        `No se encontró un contrato activo para el tenant '${tenantId}'`,
      );
    }

    const limits = (contract.package?.usageLimitVariables ?? []).map((v) => ({
      variableName: v.variableName,
      displayName: v.displayName,
      maxValue: v.maxValue,
      targetApplication: v.targetApplication,
      limitType: v.limitType || 'quantity',
    }));

    return {
      contractId: contract.id,
      packageName: contract.package?.name ?? '',
      isBillable: contract.package?.isBillable ?? true,
      startDate: contract.startDate ?? null,
      endDate: contract.endDate ?? null,
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

  /**
   * Notifies the Kiri backend to reactivate a user's local account
   * after their contract has been activated, and flags a plan-upgrade welcome.
   */
  private async notifyKiriUserReactivation(contract: Contract): Promise<void> {
    const kiriApiUrl = process.env.KIRI_API_URL || 'http://localhost:4000';
    const email = contract.user?.strUserName;

    if (!email) {
      this.logger.warn('Cannot notify Kiri: no user email on contract');
      return;
    }

    const isBillablePlan = (contract.package as any)?.isBillable !== false && Number(contract.package?.price) > 0;
    const packageName = contract.package?.name || 'Kiri Plus';

    try {
      const response = await fetch(`${kiriApiUrl}/api/plan/activate-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          contractId: contract.id,
          planUpgraded: isBillablePlan,
          packageName,
        }),
      });

      if (response.ok) {
        this.logger.log(`Kiri user ${email} reactivated successfully`);
      } else {
        const data = await response.json().catch(() => ({}));
        this.logger.warn(`Kiri reactivation failed for ${email}: ${data.error || response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Could not reach Kiri API for user reactivation: ${error.message}`);
    }

    // Send welcome email for paid plan upgrade
    if (isBillablePlan) {
      this.sendKiriPlusWelcomeEmail(contract).catch(err =>
        this.logger.warn(`Failed to send Kiri Plus welcome email: ${err.message}`)
      );
    }
  }

  /**
   * Sends a warm welcome email when a Kiri user upgrades to a paid plan.
   */
  private async sendKiriPlusWelcomeEmail(contract: Contract): Promise<void> {
    const email = contract.user?.strUserName;
    if (!email) return;

    const customerName = contract.user?.basicData?.naturalPersonData?.firstName
      || contract.user?.basicData?.legalEntityData?.businessName
      || 'crack de las finanzas';
    const packageName = contract.package?.name || 'Kiri Plus';
    const year = new Date().getFullYear().toString();

    await this.notificationsService.sendByTemplate('KIRI_PLUS_WELCOME', email, {
      customerName,
      packageName,
      year,
    });
    this.logger.log(`Kiri Plus welcome email sent to ${email}`);
  }
}
