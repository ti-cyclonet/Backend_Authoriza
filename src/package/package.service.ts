import { BadRequestException, Injectable } from '@nestjs/common';
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
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PackageService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly imageService: ImageService,
    @InjectRepository(ConfigurationPackage)
    private readonly configurationRepository: Repository<ConfigurationPackage>,
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
  ) {}

  async create(dto: CreatePackageDto, files: Express.Multer.File[]) {
    // Si viene como string en FormData, convertirlo a array
    if (typeof dto.configurations === 'string') {
      try {
        dto.configurations = JSON.parse(dto.configurations);
      } catch (err) {
        throw new BadRequestException('Invalid JSON in configurations');
      }
    }

    // 1) Guardar paquete
    const newPackage = await this.packageRepository.save({
      name: dto.name,
      description: dto.description,
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

    return {
      message: 'Paquete creado correctamente',
      data: {
        ...newPackage,
        images: imageEntities,
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
        'images'
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
    const { images, ...packageData } = updatePackageDto;

    // 1) Actualizar solo datos del paquete
    await this.packageRepository.update(id, packageData);

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

    return !!existing;
  }
}
