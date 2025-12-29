import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';
import { ContractStatus } from './enums/contract-status.enum';
import { PaymentMode } from './enums/payment-mode.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { InvoiceGeneratorService } from '../invoices/invoice-generator.service';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly invoiceGeneratorService: InvoiceGeneratorService,
    private readonly entityCodeService: EntityCodeService,
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
    
    // Si el contrato se crea como ACTIVE, generar la primera factura
    if (savedContract.status === ContractStatus.ACTIVE) {
      await this.invoiceGeneratorService.generateInvoiceForContract(savedContract.id);
    }
    
    return savedContract;
  }

  async findOne(id: string) {
    const contract = await this.contractRepository.findOne({ where: { id } });
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
    
    // Si el contrato cambia a ACTIVE, generar factura
    if (dto.status === ContractStatus.ACTIVE && contract.status !== ContractStatus.ACTIVE) {
      await this.invoiceGeneratorService.generateInvoiceForContract(savedContract.id);
    }
    
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
    return this.contractRepository.find({ where: { user: { id: userId } } });
  }

  async findByPackage(packageId: string) {
    return this.contractRepository.find({
      where: { package: { id: packageId } },
    });
  }

  async findActive() {
    return this.contractRepository.find({
      where: { status: ContractStatus.ACTIVE },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [contracts, total] = await this.contractRepository.findAndCount({
      take: limit,
      skip: offset,
    });

    return {
      data: contracts,
      total,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
    };
  }

  async activateContract(id: string): Promise<Contract> {
    const contract = await this.findOne(id);
    
    if (contract.status === ContractStatus.ACTIVE) {
      throw new BadRequestException('Contract is already active');
    }
    
    contract.status = ContractStatus.ACTIVE;
    const savedContract = await this.contractRepository.save(contract);
    
    // Generar primera factura al activar
    await this.invoiceGeneratorService.generateInvoiceForContract(savedContract.id);
    
    return savedContract;
  }
}
