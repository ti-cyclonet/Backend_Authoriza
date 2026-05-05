import { BadRequestException, Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Package } from './entities/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';
import { Image } from '../images/entities/image.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ImageService } from 'src/images/image.service';
import { EntityCodeService } from 'src/entity-codes/services/entity-code.service';
import { Contract } from 'src/contract/entities/contract.entity';
import { ContractStatus } from 'src/contract/enums/contract-status.enum';
import { User } from 'src/users/entities/user.entity';
import { UsageLimitVariablesService } from 'src/usage-limit-variables/usage-limit-variables.service';
import { CreateUsageLimitVariableDto } from 'src/usage-limit-variables/dto/create-usage-limit-variable.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PackageService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly imageService: ImageService,
    private readonly entityCodeService: EntityCodeService,
    @InjectRepository(ConfigurationPackage)
    private readonly configurationRepository: Repository<ConfigurationPackage>,
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usageLimitVariablesService: UsageLimitVariablesService,
  ) {}

  /**
   * Parses usageLimitVariables from DTO (may come as JSON string in FormData)
   * and validates no duplicate variableNames and no negative maxValues.
   */
  private parseAndValidateUsageLimitVariables(
    raw: CreateUsageLimitVariableDto[] | string | undefined,
  ): CreateUsageLimitVariableDto[] | undefined {
    if (raw === undefined || raw === null) {
      return undefined;
    }

    let variables: CreateUsageLimitVariableDto[];

    // If it comes as a JSON string (FormData), parse it
    if (typeof raw === 'string') {
      try {
        variables = JSON.parse(raw);
      } catch {
        throw new BadRequestException('Invalid JSON in usageLimitVariables');
      }
    } else {
      variables = raw;
    }

    if (!Array.isArray(variables)) {
      throw new BadRequestException('usageLimitVariables must be an array');
    }

    if (variables.length === 0) {
      return variables;
    }

    // Validate no negative maxValues
    for (const variable of variables) {
      if (variable.maxValue < 0) {
        throw new BadRequestException(
          `El valor máximo de la variable '${variable.variableName}' debe ser un entero no negativo`,
        );
      }
    }

    // Validate no duplicate variableNames
    const names = variables.map((v) => v.variableName);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `La variable '${duplicates[0]}' está duplicada en este paquete`,
      );
    }

    return variables;
  }

  async create(dto: CreatePackageDto, files: Express.Multer.File[]) {
    // Si viene como string en FormData, convertirlo a array
    if (typeof dto.configurations === 'string') {
      try {
        dto.configurations = JSON.parse(dto.configurations);
      } catch (err) {
        throw new BadRequestException('Invalid JSON in configurations');
      }
    }

    // Parse and validate usageLimitVariables (may come as JSON string in FormData)
    const usageLimitVariables = this.parseAndValidateUsageLimitVariables(
      dto.usageLimitVariables as any,
    );

    // 1) Guardar paquete con código generado
    const code = await this.entityCodeService.generateCode('Package');
    const newPackage = await this.packageRepository.save({
      name: dto.name,
      description: dto.description,
      code,
    });

    // 2) Guardar configuraciones
    if (dto.configurations?.length) {
      const configurationsEntities = await Promise.all(
        dto.configurations.map(async (config) => {
          const rol = await this.configurationRepository.manager.findOne(Rol, {
            where: { id: config.rolId },
          });
          if (!rol) throw new Error(`Rol not found with id: ${config.rolId}`);

          return this.configurationRepository.create({
            price: config.price,
            totalAccount: config.totalAccount,
            package: newPackage,
            rol: rol,
          });
        }),
      );
      await this.configurationRepository.save(configurationsEntities);
    }

    // 3) Subir imágenes
    const imageEntities = [];
    if (files?.length) {
      for (const file of files) {
        const uploadResult = await this.imageService.uploadBuffer(
          file.buffer,
          'packages',
        );

        const imageEntity = this.imageRepository.create({
          fileName: uploadResult.public_id,
          url: uploadResult.secure_url,
          package: newPackage,
        });

        imageEntities.push(imageEntity);
      }

      await this.imageRepository.save(imageEntities);
    }

    // 4) Persistir usageLimitVariables
    let savedVariables = [];
    if (usageLimitVariables && usageLimitVariables.length > 0) {
      savedVariables = await this.usageLimitVariablesService.createForPackage(
        newPackage.id,
        usageLimitVariables,
      );
    }

    return {
      message: 'Package created successfully',
      data: {
        ...newPackage,
        images: imageEntities,
        usageLimitVariables: savedVariables,
      },
    };
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.packageRepository.find({
      take: limit,
      skip: offset,
      relations: [
        'configurations',
        'configurations.rol',
        'configurations.package',
        'images',
        'usageLimitVariables',
      ],
    });
  }

  findOne(id: string) {
    return this.packageRepository.findOne({
      where: { id },
      relations: ['configurations', 'configurations.rol', 'usageLimitVariables'],
    });
  }

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    const { images, usageLimitVariables: rawVariables, ...packageData } = updatePackageDto;

    // 1) Actualizar solo datos del paquete (exclude nested relations)
    const { configurations, ...scalarPackageData } = packageData;
    if (Object.keys(scalarPackageData).length > 0) {
      await this.packageRepository.update(id, scalarPackageData);
    }

    // 2) Manejar imágenes si vienen
    if (images && images.length > 0) {
      const imageEntities = await Promise.all(
        images.map((urlOrBase64) =>
          this.imageRepository.create({
            fileName: `pkg_${Date.now()}`,
            url: urlOrBase64,
            package: { id },
          }),
        ),
      );
      await this.imageRepository.save(imageEntities);
    }

    // 3) Reemplazar usageLimitVariables si vienen (delete + insert)
    const parsedVariables = this.parseAndValidateUsageLimitVariables(
      rawVariables as any,
    );
    if (parsedVariables !== undefined) {
      await this.usageLimitVariablesService.replaceForPackage(id, parsedVariables);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const pkg = await this.packageRepository.findOne({
      where: { id },
      relations: ['contracts', 'images']
    });

    if (!pkg) {
      throw new BadRequestException('Package not found');
    }

    // Verificar si tiene contratos activos
    const activeContracts = await this.contractRepository.count({
      where: { 
        package: { id },
        status: ContractStatus.ACTIVE
      }
    });

    if (activeContracts > 0) {
      throw new ConflictException(
        `Cannot delete package. It has ${activeContracts} active contract(s). Please terminate all contracts first.`
      );
    }

    // Eliminar imágenes de Cloudinary
    if (pkg.images?.length > 0) {
      for (const image of pkg.images) {
        try {
          await cloudinary.uploader.destroy(image.fileName);
        } catch (error) {
          console.warn(`Failed to delete image ${image.fileName}:`, error.message);
        }
      }
    }

    await this.packageRepository.remove(pkg);
    return { message: 'Package deleted successfully' };
  }

  async findContractedByUser(userId: string) {
    const contracts = await this.contractRepository.find({
      where: { 
        user: { id: userId }
      },
      relations: ['package', 'package.configurations', 'package.configurations.rol']
    });

    // Eliminar duplicados usando un Map
    const uniquePackages = new Map();
    
    contracts.forEach(contract => {
      if (contract.package && !uniquePackages.has(contract.package.id)) {
        uniquePackages.set(contract.package.id, {
          ...contract.package,
          contractDate: contract.createdAt,
          expirationDate: contract.endDate,
          roles: contract.package.configurations?.map(config => config.rol) || []
        });
      }
    });

    return Array.from(uniquePackages.values());
  }

  async checkNameExists(name: string): Promise<boolean> {
    const existing = await this.packageRepository.findOne({
      where: {
        name: ILike(name),
      },
    });

    return !!existing;
  }
}
