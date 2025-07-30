import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Package } from './entities/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class PackageService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(ConfigurationPackage)
    private configurationRepository: Repository<ConfigurationPackage>,
  ) {}

  async createPackageWithConfigurations(createPackageDto: CreatePackageDto) {
    const { configurations, ...packageData } = createPackageDto;

    // Crear y guardar el paquete
    const newPackage = await this.packageRepository.save(packageData);

    // Preparar configuraciones con relaciones completas
    const configurationsEntities = await Promise.all(
      configurations.map(async (config) => {
        const rol = await this.configurationRepository.manager.findOne(Rol, {
          where: { id: config.rolId },
        });

        if (!rol) {
          throw new Error(`Rol not found with id: ${config.rolId}`);
        }

        const configuration = this.configurationRepository.create({
          price: config.price,
          totalAccount: config.totalAccount,
          package: newPackage,
          rol: rol,
        });

        return configuration;
      }),
    );

    // Guardar configuraciones
    await this.configurationRepository.save(configurationsEntities);

    return {
      ...newPackage,
      configurations: configurationsEntities,
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
      ],
    });
  }

  findOne(id: string) {
    return this.packageRepository.findOne({
      where: { id },
      relations: ['configurations', 'configurations.rol'],
    });
  }

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    await this.packageRepository.update(id, updatePackageDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const pkg = await this.findOne(id);
    return this.packageRepository.remove(pkg);
  }

  async checkNameExists(name: string): Promise<boolean> {
    const existing = await this.packageRepository.findOne({
      where: {
        name: ILike(name),
      },
    });

    return !!existing; // true si ya existe, false si no
  }
}
