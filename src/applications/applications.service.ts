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
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('ApplicationsService');
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto) {
    try {
      const application = this.applicationRepository.create(createApplicationDto);
      await this.applicationRepository.save(application);
      return application;
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const {limit = 10, offset = 0 } = paginationDto;
    return this.applicationRepository.find({
      take: limit,
      skip: offset,
      //TODO: relaciones
    });
  }

  async findOne(term: string) {

    let application: Application;
    if (isUUID(term)){
      application = await this.applicationRepository.findOneBy({id: term});
    }else{
      // application = await this.applicationRepository.findOneBy({strSlug: term});
      const queryBuilder = this.applicationRepository.createQueryBuilder();
      application = await queryBuilder
      .where(`UPPER("strName") = :strName or "strSlug" = :strSlug`, {        
        strName: term.toUpperCase(),
        strSlug: term.toLowerCase()
      }).getOne();
    }
    if (!application)
      throw new NotFoundException(`Application with ${term} not found`);
    return application;
  }

  async update(id: string, updateApplicationDto: UpdateApplicationDto) {
    const application = await this.applicationRepository.preload({
      id: id,
      ...updateApplicationDto
    });
    if (!application) throw new NotFoundException(`Application with id #${id} not found`);

    await this.applicationRepository.save (application);

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
  }}
