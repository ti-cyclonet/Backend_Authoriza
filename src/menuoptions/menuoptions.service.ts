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

      const { strSubmenus = [], ...submenuDetails} = createMenuoptionDto;
      const menuOption = this.menuoptionRepository.create({
        ...submenuDetails,
        strSubmenus: strSubmenus.map(submenu => 
          this.menuoptionRepository.create(
          {
            strName: submenu.strName,
            strDescription: submenu.strDescription,
            strUrl: submenu.strUrl,
            strIcon: submenu.strIcon,
            strType: submenu.strType,
            ingOrder: submenu.ingOrder
          })
        )
      });
      await this.menuoptionRepository.save(menuOption);
      return menuOption;
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
  
    const [menuoptions, total] = await this.menuoptionRepository.findAndCount({
      take: limit,
      skip: offset,
      relations: {
        strSubmenus: true,
      },
    });
  
    const filteredMenuoptions = menuoptions
      .filter((menuoption) => menuoption.strType === 'main_menu')
      .map((menuoption) => ({
        ...menuoption,
        strSubmenus: menuoption.strSubmenus.map((submenu) => ({
          id: submenu.id,
          strName: submenu.strName,
          strDescription: submenu.strDescription,
          strUrl: submenu.strUrl,
          strIcon: submenu.strIcon,
          strType: submenu.strType,
          ingOrder: submenu.ingOrder,
        })),
      }));
  
    return {
      total,
      limit,
      offset,
      data: filteredMenuoptions,
    };
  }
  

  async findOne(id: string) {
    const menuoption = await this.menuoptionRepository.findOne({
      where: { id },
      relations: {
        strSubmenus: true,
      },
    });
  
    if (!menuoption) {
      throw new NotFoundException(`MenuOption with ID ${id} not found`);
    }
  
    return {
      ...menuoption,
      strSubmenus: menuoption.strSubmenus.map((submenu) => ({
        id: submenu.id,
        strName: submenu.strName,
        strDescription: submenu.strDescription,
        strUrl: submenu.strUrl,
        strIcon: submenu.strIcon,
        strType: submenu.strType,
        ingOrder: submenu.ingOrder,
      })),
    };
  }

  async update(id: string, updateMenuoptionDto: UpdateMenuoptionDto) {
    const menuoption = await this.menuoptionRepository.preload({
      id: id,
      ...updateMenuoptionDto,
      strSubmenus: [],
    });
    if(!menuoption) throw new NotFoundException(`Menu option with id # ${id} not found`);
    await this.menuoptionRepository.save(menuoption);
    return menuoption;
  }

  async remove(id: string) {
    // Buscar la opción de menú con sus submenús
    const menuoption = await this.menuoptionRepository.findOne({
      where: { id },
      relations: {
        strSubmenus: true, // Incluir submenús en la consulta
      },
    });
  
    // Si no existe, lanzar una excepción
    if (!menuoption) {
      throw new NotFoundException(`MenuOption with ID ${id} not found`);
    }
  
    // Primero eliminar los submenús si existen
    if (menuoption.strSubmenus.length > 0) {
      await this.menuoptionRepository.remove(menuoption.strSubmenus);
    }
  
    // Luego eliminar el menú principal
    await this.menuoptionRepository.remove(menuoption);
  
    return { message: `The menu option with id #${id} was deleted successfully` };
  }
  

  private handleDBExcelption(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      `Unexpected error, check server logs`,
    );
  }
}