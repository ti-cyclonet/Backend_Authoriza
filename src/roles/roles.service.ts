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
import { MenuoptionsService } from 'src/menuoptions/menuoptions.service';
import { Menuoption } from 'src/menuoptions/entities/menuoption.entity';

@Injectable()
export class RolesService {
  private readonly logger = new Logger('RolesService');
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,    
    private readonly menuoptionsService: MenuoptionsService,
    @InjectRepository(Menuoption)
    private readonly menuoptionRepository: Repository<Menuoption>
  ) {}

  async create(createRolDto: CreateRolDto) {
    try {
      // Crear el rol
      const rol = this.rolRepository.create(createRolDto);
      await this.rolRepository.save(rol);

      // Crear las opciones de menú asociadas al rol
      for (const menuOption of createRolDto.menuOptions) {
        await this.menuoptionsService.create(menuOption); // Crear cada opción de menú
      }

      return rol;
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }
  
  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
  
    const roles = await this.rolRepository.find({
      take: limit,
      skip: offset,
      relations: ['rolMenuoptions', 'rolMenuoptions.menuoption'],
    });
  
    return Promise.all(
      roles.map(async (rol) => ({
        id: rol.id,
        strName: rol.strName,
        strDescription1: rol.strDescription1,
        strDescription2: rol.strDescription2,
        strMenuOptions: await Promise.all(
          rol.rolMenuoptions.map(async (rolMenuoption) => {
            const menuoption = await this.menuoptionRepository.findOne({
              where: { id: rolMenuoption.menuoption.id },
              relations: ['strSubmenus'],
            });
  
            return {
              strName: menuoption?.strName || rolMenuoption.menuoption.strName,
              strDescription: menuoption?.strDescription || rolMenuoption.menuoption.strDescription,
              strUrl: menuoption?.strUrl || rolMenuoption.menuoption.strUrl,
              strIcon: menuoption?.strIcon || rolMenuoption.menuoption.strIcon,
              strType: menuoption?.strType || rolMenuoption.menuoption.strType,
              ingOrder: menuoption?.ingOrder || rolMenuoption.menuoption.ingOrder,
              strSubmenus: menuoption?.strSubmenus?.map((submenu) => ({
                id: submenu.id,
                strName: submenu.strName,
                strDescription: submenu.strDescription,
                strUrl: submenu.strUrl,
                strIcon: submenu.strIcon,
                strType: submenu.strType,
                ingOrder: submenu.ingOrder,
              })) || [],
            };
          })
        ),
      }))
    );
  }  

  async findOne(id: string) {
    const rol = await this.rolRepository.findOne({
      where: { id },
      relations: ['rolMenuoptions', 'rolMenuoptions.menuoption'],
    });
  
    if (!rol) {
      throw new NotFoundException(`Rol with ID ${id} not found`);
    }
  
    // Obtener detalles de cada menuoption junto con sus submenus
    const menuOptionsWithSubmenus = await Promise.all(
      rol.rolMenuoptions.map(async (rolMenuoption) => {
        const menuoption = await this.menuoptionRepository.findOne({
          where: { id: rolMenuoption.menuoption.id },
          relations: ['strSubmenus'],
        });
  
        return {
          id: rol.id,
          strName: menuoption?.strName || rolMenuoption.menuoption.strName,
          strDescription: menuoption?.strDescription || rolMenuoption.menuoption.strDescription,
          strUrl: menuoption?.strUrl || rolMenuoption.menuoption.strUrl,
          strIcon: menuoption?.strIcon || rolMenuoption.menuoption.strIcon,
          strType: menuoption?.strType || rolMenuoption.menuoption.strType,
          ingOrder: menuoption?.ingOrder || rolMenuoption.menuoption.ingOrder,
          strSubmenus: menuoption?.strSubmenus?.map((submenu) => ({
            id: submenu.id,
            strName: submenu.strName,
            strDescription: submenu.strDescription,
            strUrl: submenu.strUrl,
            strIcon: submenu.strIcon,
            strType: submenu.strType,
            ingOrder: submenu.ingOrder,
          })) || [],
        };
      })
    );
  
    return {
      strName: rol.strName,
      strDescription1: rol.strDescription1,
      strDescription2: rol.strDescription2,
      strMenuOptions: menuOptionsWithSubmenus,
    };
  }

  async checkRoleName(strName: string): Promise<boolean> {
    const rol = await this.rolRepository.findOne({ where: { strName } });
    return !rol;
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
    const rol = await this.rolRepository.findOne({
      where: { id },
      relations: ['rolMenuoptions', 'rolMenuoptions.menuoption'],
    });
  
    if (!rol) {
      throw new NotFoundException(`Rol with ID ${id} not found`);
    }
  
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
