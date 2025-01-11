import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateMenuoptionDto } from './dto/create-menuoption.dto';
import { UpdateMenuoptionDto } from './dto/update-menuoption.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Menuoption } from './entities/menuoption.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class MenuoptionsService {
  private readonly logger = new Logger('MenuoptionsService');
  constructor(
    @InjectRepository(Menuoption)
    private readonly menuoptionRepository: Repository<Menuoption>,
  ) {}

  async create(createMenuoptionDto: CreateMenuoptionDto) {
    try {
      const menuOption = this.menuoptionRepository.create(createMenuoptionDto);
      await this.menuoptionRepository.save(menuOption);
      return menuOption;
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }

  //TODO: Paginar
  findAll(paginationDto: PaginationDto) {
    const {limit = 10, offset = 0} = paginationDto;
    return this.menuoptionRepository.find({
      take: limit,
      skip: offset,
      //TODO: relaciones
    });
  }

  async findOne(id: string) {
    const menuoption = await this.menuoptionRepository.findOneBy({id});
    if (!menuoption)
      throw new NotFoundException(`Menu option with id "${id}" not found`);
    return menuoption;
  }

  async update(id: string, updateMenuoptionDto: UpdateMenuoptionDto) {
    const menuoption = await this.menuoptionRepository.preload({
      id: id,
      ...updateMenuoptionDto
    });
    if(!menuoption) throw new NotFoundException(`Menu option with id # ${id} not found`);
    await this.menuoptionRepository.save(menuoption);
    return menuoption;
  }

  async remove(id: string) {
    const menuoption = await this.findOne(id);
    await this.menuoptionRepository.remove(menuoption);
    return `The menu option with id #${id} was deleted successfully`;
  }

  private handleDBExcelption(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      `Unexpected error, check server logs`,
    );
  }
}
