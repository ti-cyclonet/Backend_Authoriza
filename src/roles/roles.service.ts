import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger('RolesService');
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async create(createRolDto: CreateRolDto) {
    try {
      const rol = this.rolRepository.create(createRolDto);
      await this.rolRepository.save(rol);
      return rol;
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }
  
  findAll(paginationDto: PaginationDto) {
    const {limit = 10, offset = 0 } = paginationDto;
    return this.rolRepository.find({
      take: limit,
      skip: offset,
      //TODO: relaciones
    });
  }

  async findOne(id: string) {
    const rol = await this.rolRepository.findOneBy({id});
    if (!rol)
      throw new NotFoundException(`Rol with id "${id}" not found`);
    return rol;
  }

  async update(id: string, updateRolDto: UpdateRolDto) {
    const rol = await this.rolRepository.preload({
      id: id,
      ...updateRolDto
    });
    if (! rol) throw new NotFoundException(`Rol with id #${id} not found`);
    try {
      await this.rolRepository.save(rol);      
      return rol;
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }

  async remove(id: string) {
    const rol = await this.findOne(id);
    await this.rolRepository.remove(rol);
    return `The rol with id #${id} was deleted successfully`;
  }

  private handleDBExcelption(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      `Unexpected error, check server logs`,
    );
  }
}
