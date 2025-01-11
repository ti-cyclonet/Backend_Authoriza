import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { Application } from './entities/application.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ApplicationImage } from './entities';
import { application } from 'express';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('ApplicationsService');
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,

    @InjectRepository(ApplicationImage)
    private readonly applicationImageRepository: Repository<ApplicationImage>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createApplicationDto: CreateApplicationDto) {
    try {
      const { strImages = [], ...applicationDetails } = createApplicationDto;

      const application = this.applicationRepository.create({
        ...applicationDetails,
        strImages: strImages.map((image) =>
          this.applicationImageRepository.create({ strUrl: image }),
        ),
      });
      await this.applicationRepository.save(application);
      return { ...application, strImages };
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    const applications = await this.applicationRepository.find({
      take: limit,
      skip: offset,
      relations: {
        strImages: true,
      },
    });

    return applications.map((application) => ({
      ...application,
      strImages: application.strImages.map((img) => img.strUrl),
    }));
  }

  async findOne(term: string) {
    let application: Application;
    if (isUUID(term)) {
      application = await this.applicationRepository.findOneBy({ id: term });
    } else {
      // application = await this.applicationRepository.findOneBy({strSlug: term});
      const queryBuilder = this.applicationRepository.createQueryBuilder('app');
      application = await queryBuilder
        .where(`UPPER("strName") = :strName or "strSlug" = :strSlug`, {
          strName: term.toUpperCase(),
          strSlug: term.toLowerCase(),
        })
        .leftJoinAndSelect('app.strImages', 'appImages')
        .getOne();
    }
    if (!application)
      throw new NotFoundException(`Application with ${term} not found`);
    return application;
  }

  async findOnePlain(term: string) {
    const { strImages = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      strImages: strImages.map((img) => img.strUrl),
    };
  }

  async update(id: string, updateApplicationDto: UpdateApplicationDto) {
    const { strImages, ...toUpdate } = updateApplicationDto;
    const application = await this.applicationRepository.preload({
      id,
      ...toUpdate,
    });
    if (!application)
      throw new NotFoundException(`Application with id #${id} not found`);

    //create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (strImages) {
        await queryRunner.manager.delete(ApplicationImage, {
          strApplication: { id },
        });
        application.strImages = strImages.map((img) =>
          this.applicationImageRepository.create({ strUrl: img }),
        );
      }
      await queryRunner.manager.save(application);
      // await this.applicationRepository.save(application);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExcelption(error);
    }

    return application;
  }

  async remove(id: string) {
    const application = await this.findOne(id);
    await this.applicationRepository.remove(application);
    return `The application with id #${id} was deleted successfully`;
  }

  private handleDBExcelption(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      `Unexpected error, check server logs`,
    );
  }
}
