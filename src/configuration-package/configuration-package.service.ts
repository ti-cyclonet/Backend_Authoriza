import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationPackage } from './entities/configuration-package.entity';
import { CreateConfigurationPackageDto } from './dto/create-configuration-package.dto';
import { UpdateConfigurationPackageDto } from './dto/update-configuration-package.dto';

import { Package } from 'src/package/entities/package.entity';
import { Rol } from 'src/roles/entities/rol.entity';

@Injectable()
export class ConfigurationPackageService {
  constructor(
    @InjectRepository(ConfigurationPackage)
    private configRepo: Repository<ConfigurationPackage>,

    @InjectRepository(Rol)
    private rolRepo: Repository<Rol>,

    @InjectRepository(Package)
    private packageRepo: Repository<Package>,
  ) {}

  async create(dto: CreateConfigurationPackageDto) {
    const rol = await this.rolRepo.findOneBy({ id: dto.rolId });
    if (!rol) {
      throw new NotFoundException(`Rol with ID ${dto.rolId} not found`);
    }

    const pkg = await this.packageRepo.findOneBy({ id: dto.packageId });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${dto.packageId} not found`);
    }

    const config = this.configRepo.create({
      price: dto.price,
      totalAccount: dto.totalAccount,
      rol,
      package: pkg,
    });

    return this.configRepo.save(config);
  }

  findAll() {
    return this.configRepo.find({ relations: ['rol', 'package'] });
  }

  findOne(id: string) {
    return this.configRepo.findOne({
      where: { id },
      relations: ['rol', 'package'],
    });
  }

  async update(id: string, dto: UpdateConfigurationPackageDto) {
    const existing = await this.configRepo.findOneBy({ id });
    if (!existing) {
      throw new NotFoundException(
        `ConfigurationPackage with ID ${id} not found`,
      );
    }

    await this.configRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const config = await this.findOne(id);
    if (!config) {
      throw new NotFoundException(
        `ConfigurationPackage with ID ${id} not found`,
      );
    }

    return this.configRepo.remove(config);
  }
}
