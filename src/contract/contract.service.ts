import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class ContractService {
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
    });

    const savedContract = await this.contractRepository.save(entity);
    
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
        throw new BadRequestException('No se puede activar el contrato. Debe crear al menos una cuenta de usuario dependiente.');
      }
      
      // Validar que tenga PDF generado
      if (!contract.pdfUrl || contract.pdfUrl.trim() === '') {
        throw new BadRequestException('No se puede activar el contrato. Debe generar el PDF del contrato antes de activarlo.');
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
}
