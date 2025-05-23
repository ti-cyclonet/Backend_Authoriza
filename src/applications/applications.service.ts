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
import { DataSource, ILike, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { Rol } from 'src/roles/entities/rol.entity';
import { Menuoption } from 'src/menuoptions/entities/menuoption.entity';
import { RolMenuoption } from 'src/roles/entities/rol-menuoption.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('ApplicationsService');
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,

    @InjectRepository(Rol)
    private readonly RolRepository: Repository<Rol>,

    @InjectRepository(Menuoption)
    private readonly menuoptionRepository: Repository<Menuoption>,

    @InjectRepository(RolMenuoption)
    private readonly rolMenuOptionRepository: Repository<RolMenuoption>,

    private readonly dataSource: DataSource,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
    file?: Express.Multer.File,
  ) {
    try {
      // 🔍 Imprimir el DTO completo recibido del frontend
      // console.log('📦 DTO recibido del frontend:');
      // console.log(JSON.stringify(createApplicationDto, null, 2)); // Formato legible
      // console.log('📥 Archivo recibido:', file?.originalname, file?.mimetype);

      const { strRoles = [], ...applicationDetails } = createApplicationDto;

      // Subir imagen a Cloudinary si se proporcionó un archivo
      let imageUrl = '';
      if (file) {
        const result = await this.cloudinaryService.uploadImage(
          file,
          'logos-applications',
        );
        imageUrl = result.secure_url;
      }

      // Crear la aplicación con la URL de la imagen
      const application = this.applicationRepository.create({
        ...applicationDetails,
        strUrlImage: imageUrl,
      });

      await this.applicationRepository.save(application);

      // Crear roles y sus opciones de menú
      for (const rolDto of strRoles) {
        const rol = this.RolRepository.create({
          strName: rolDto.strName,
          strDescription1: rolDto.strDescription1,
          strDescription2: rolDto.strDescription2,
          strApplication: application,
        });

        await this.RolRepository.save(rol);

        if (Array.isArray(rolDto.menuOptions)) {
          for (const menuOptionDto of rolDto.menuOptions) {
            let menuOption = await this.menuoptionRepository.findOne({
              where: { strName: menuOptionDto.strName },
            });

            if (!menuOption) {
              menuOption = this.menuoptionRepository.create({
                strName: menuOptionDto.strName,
                strDescription: menuOptionDto.strDescription,
                strUrl: menuOptionDto.strUrl,
                strIcon: menuOptionDto.strIcon,
                strType: menuOptionDto.strType,
                ingOrder: menuOptionDto.ingOrder,
              });

              await this.menuoptionRepository.save(menuOption);
            }

            const existingRelation = await this.rolMenuOptionRepository.findOne(
              {
                where: { rol, menuoption: menuOption },
              },
            );

            if (!existingRelation) {
              const rolMenuOption = this.rolMenuOptionRepository.create({
                rol: rol,
                menuoption: menuOption,
              });

              await this.rolMenuOptionRepository.save(rolMenuOption);
            }

            if (Array.isArray(menuOptionDto.strSubmenus)) {
              for (const submenuDto of menuOptionDto.strSubmenus) {
                let submenu = await this.menuoptionRepository.findOne({
                  where: { strName: submenuDto.strName },
                });

                if (!submenu) {
                  submenu = this.menuoptionRepository.create({
                    strName: submenuDto.strName,
                    strDescription: submenuDto.strDescription,
                    strUrl: submenuDto.strUrl,
                    strIcon: submenuDto.strIcon,
                    strType: submenuDto.strType,
                    ingOrder: submenuDto.ingOrder,
                    strMPatern: menuOption,
                  });

                  await this.menuoptionRepository.save(submenu);
                }
              }
            }
          }
        }
      }

      return {
        ...application,
        strRoles,
      };
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }

  async checkApplicationName(strName: string): Promise<boolean> {
    const application = await this.applicationRepository.findOne({
      where: { strName },
    });
    return !application;
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    // Obtener todas las aplicaciones con imágenes y roles
    const applications = await this.applicationRepository.find({
      take: limit,
      skip: offset,
      relations: {
        strRoles: true,
      },
    });

    // Mapear las aplicaciones y agregar las opciones de menú
    return await Promise.all(
      applications.map(async (application) => {
        const rolesWithMenuOptions = await Promise.all(
          application.strRoles.map(async (rol) => {
            // Obtener las opciones de menú asociadas al rol a través de RolMenuoption
            const rolMenuoptions = await this.rolMenuOptionRepository.find({
              where: {
                rol: { id: rol.id },
              },
              relations: {
                menuoption: { strSubmenus: true },
              },
            });

            // Mapear las opciones de menú para cada rol
            const menuOptions = rolMenuoptions.map(
              (rolMenuoption) => rolMenuoption.menuoption,
            );

            return {
              id: rol.id,
              strName: rol.strName,
              strDescription1: rol.strDescription1,
              strDescription2: rol.strDescription2,
              // Modificar el mapeo para asegurar que 'menuOptions' está definido
              menuOptions: (menuOptions || []).map((menu: Menuoption) => ({
                id: menu.id,
                strName: menu.strName || '',
                strDescription: menu.strDescription || '',
                strUrl: menu.strUrl || '',
                strIcon: menu.strIcon || '',
                strType: menu.strType || '',
                ingOrder: menu.ingOrder || '',
                // Asegurarse de que strSubmenus existe y tiene datos
                strSubmenus:
                  menu.strSubmenus && menu.strSubmenus.length > 0
                    ? menu.strSubmenus.map((submenu) => ({
                        id: submenu.id,
                        strName: submenu.strName,
                        strDescription: submenu.strDescription,
                        strUrl: submenu.strUrl || '',
                        strIcon: submenu.strIcon || '',
                        strType: submenu.strType,
                        ingOrder: submenu.ingOrder,
                      }))
                    : [],
              })),
            };
          }),
        );

        return {
          ...application,
          strRoles: rolesWithMenuOptions,
        };
      }),
    );
  }

  async findOne(term: string) {
    let application: Application;

    if (isUUID(term)) {
      application = await this.applicationRepository.findOne({
        where: { id: term },
        relations: {
          strRoles: true,
        },
      });
    } else {
      const queryBuilder = this.applicationRepository.createQueryBuilder('app');
      application = await queryBuilder
        .where(`UPPER(app.strName) = :strName OR app.strSlug = :strSlug`, {
          strName: term.toUpperCase(),
          strSlug: term.toLowerCase(),
        })
        .leftJoinAndSelect('app.strRoles', 'appRoles')
        .getOne();
    }

    if (!application) {
      throw new NotFoundException(`Application with ${term} not found`);
    }

    // Obtener las opciones de menú para cada rol
    const rolesWithMenuOptions = await Promise.all(
      application.strRoles.map(async (rol) => {
        const rolMenuoptions = await this.rolMenuOptionRepository.find({
          where: { rol: { id: rol.id } },
          relations: { menuoption: { strSubmenus: true } },
        });

        // Si no hay opciones de menú, retornar un array vacío
        if (!rolMenuoptions || rolMenuoptions.length === 0) {
          return {
            id: rol.id,
            strName: rol.strName,
            strDescription1: rol.strDescription1,
            strDescription2: rol.strDescription2,
            menuOptions: [],
          };
        }

        // Extraer las opciones de menú sin anidación de arrays
        const menuOptions = rolMenuoptions.map(
          (rolMenuoption) => rolMenuoption.menuoption,
        );

        return {
          id: rol.id,
          strName: rol.strName,
          strDescription1: rol.strDescription1,
          strDescription2: rol.strDescription2,
          // Modificar el mapeo para asegurar que 'menuOptions' está definido
          menuOptions: (menuOptions || []).map((menu: Menuoption) => ({
            id: menu.id,
            strName: menu.strName || '',
            strDescription: menu.strDescription || '',
            strUrl: menu.strUrl || '',
            strIcon: menu.strIcon || '',
            strType: menu.strType || '',
            ingOrder: menu.ingOrder || '',
            // Asegurarse de que strSubmenus existe y tiene datos
            strSubmenus:
              menu.strSubmenus && menu.strSubmenus.length > 0
                ? menu.strSubmenus.map((submenu) => ({
                    id: submenu.id,
                    strName: submenu.strName,
                    strDescription: submenu.strDescription,
                    strUrl: submenu.strUrl || '',
                    strIcon: submenu.strIcon || '',
                    strType: submenu.strType,
                    ingOrder: submenu.ingOrder,
                  }))
                : [],
          })),
        };
      }),
    );

    return {
      ...application,
      strRoles: rolesWithMenuOptions,
    };
  }

  async findByApplicationAndRol(applicationName: string, rolName: string) {
    const application = await this.applicationRepository.findOne({
      where: { strName: ILike(applicationName) },
      relations: { strRoles: true },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with name ${applicationName} not found`,
      );
    }

    // Buscar el rol dentro de la aplicación
    const rol = application.strRoles.find((rol) => rol.strName === rolName);

    if (!rol) {
      throw new NotFoundException(
        `Role ${rolName} not found in application ${applicationName}`,
      );
    }

    // Obtener las opciones de menú asociadas al rol
    const rolMenuoptions = await this.rolMenuOptionRepository.find({
      where: { rol: { id: rol.id } },
      relations: { menuoption: { strSubmenus: true } },
    });

    // Mapear las opciones de menú asegurando que la estructura es idéntica a findOne
    const menuOptions = rolMenuoptions.map((rolMenuoption) => ({
      id: rolMenuoption.menuoption.id,
      strName: rolMenuoption.menuoption.strName || '',
      strDescription: rolMenuoption.menuoption.strDescription || '',
      strUrl: rolMenuoption.menuoption.strUrl || '',
      strIcon: rolMenuoption.menuoption.strIcon || '',
      strType: rolMenuoption.menuoption.strType || '',
      ingOrder: rolMenuoption.menuoption.ingOrder || '',
      strSubmenus:
        rolMenuoption.menuoption.strSubmenus?.map((submenu) => ({
          id: submenu.id,
          strName: submenu.strName,
          strDescription: submenu.strDescription,
          strUrl: submenu.strUrl || '',
          strIcon: submenu.strIcon || '',
          strType: submenu.strType,
          ingOrder: submenu.ingOrder,
        })) || [],
    }));

    // Estructura idéntica a findOne
    const rolesWithMenuOptions = [
      {
        id: rol.id,
        strName: rol.strName,
        strDescription1: rol.strDescription1,
        strDescription2: rol.strDescription2,
        menuOptions,
      },
    ];

    return {
      ...application,
      strRoles: rolesWithMenuOptions,
    };
  }

  async findOnePlain(term: string) {
    const application = await this.findOne(term);

    const roles = Array.isArray(application.strRoles)
      ? application.strRoles.map(
          (rol: {
            id: string;
            strName: string;
            strDescription1: string;
            strDescription2: string;
            menuOptions?: any[];
          }) => ({
            id: rol.id,
            strName: rol.strName,
            strDescription1: rol.strDescription1,
            strDescription2: rol.strDescription2,
            menuOptions: rol.menuOptions ?? [],
          }),
        )
      : [];

    return {
      ...application,
      strRoles: roles,
    };
  }

  async updateApplication(
    id: string,
    data: any,
    file?: Express.Multer.File,
  ): Promise<Application> {
    // 🧩 Parsear strTags si viene como string JSON
    if (typeof data.strTags === 'string') {
      try {
        data.strTags = JSON.parse(data.strTags);
      } catch (e) {
        throw new BadRequestException('Invalid format for strTags');
      }
    }

    // 🧩 Parsear strRoles si viene como string JSON
    if (typeof data.strRoles === 'string') {
      try {
        data.strRoles = JSON.parse(data.strRoles);
      } catch (e) {
        throw new BadRequestException('Invalid format for strRoles');
      }
    }

    // 🔎 Buscar la aplicación
    const app = await this.applicationRepository.findOne({
      where: { id },
      relations: ['strRoles', 'strRoles.rolMenuoptions'],
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    // 📸 Manejo de imagen con Cloudinary
    if (file) {
      const uploaded = await this.cloudinaryService.uploadImage(file);
      if (data.strUrlImage) {
        await this.cloudinaryService.deleteImageByUrl(data.strUrlImage);
      }
      data.strUrlImage = uploaded.secure_url;
    }

    // 🚫 Guardar copia de los roles entrantes antes de eliminarlos de data
    const incomingRolesDto = data.strRoles || [];
    delete data.strRoles;
    delete data.id; // No permitir cambio de ID

    // 🧬 Asignar datos restantes
    Object.assign(app, data);
    await this.applicationRepository.save(app);

    // 🔄 Obtener roles actuales de la DB
    const existingRoles = await this.RolRepository.find({
      where: { strApplication: { id } },
      relations: ['rolMenuoptions'],
    });

    const existingRolesMap = new Map(existingRoles.map((r) => [r.strName, r]));
    const incomingRoles: Rol[] = [];

    // 🔁 Procesar roles entrantes
    for (const rolDto of incomingRolesDto) {
      if (!rolDto.strName || typeof rolDto.strName !== 'string') {
        throw new BadRequestException('Each role must have a valid strName');
      }

      let rol = existingRolesMap.get(rolDto.strName);

      if (rol) {
        rol.strDescription1 = rolDto.strDescription1;
        rol.strDescription2 = rolDto.strDescription2;
      } else {
        rol = this.RolRepository.create({
          strName: rolDto.strName,
          strDescription1: rolDto.strDescription1 ?? null,
          strDescription2: rolDto.strDescription2 ?? null,
          strApplication: app,
        });
      }

      await this.RolRepository.save(rol);
      incomingRoles.push(rol);

      // 📌 Procesar MenuOptions
      const processedMenuOptions = new Set<string>();

      for (const menuOptionDto of rolDto.menuOptions || []) {
        if (!menuOptionDto.strName) continue;

        processedMenuOptions.add(menuOptionDto.strName);

        let menuOption = await this.menuoptionRepository.findOne({
          where: { strName: menuOptionDto.strName },
        });

        if (!menuOption) {
          menuOption = this.menuoptionRepository.create({
            strName: menuOptionDto.strName,
            strDescription: menuOptionDto.strDescription ?? null,
            strUrl: menuOptionDto.strUrl ?? null,
            strIcon: menuOptionDto.strIcon ?? null,
            strType: menuOptionDto.strType ?? null,
            ingOrder: menuOptionDto.ingOrder ?? 0,
          });
          await this.menuoptionRepository.save(menuOption);
        }

        const relationExists = await this.rolMenuOptionRepository.findOne({
          where: { rol, menuoption: menuOption },
        });

        if (!relationExists) {
          const rolMenuOption = this.rolMenuOptionRepository.create({
            rol,
            menuoption: menuOption,
          });
          await this.rolMenuOptionRepository.save(rolMenuOption);
        }

        // 📂 Submenús
        for (const submenuDto of menuOptionDto.strSubmenus || []) {
          if (!submenuDto.strName) continue;

          let submenu = await this.menuoptionRepository.findOne({
            where: { strName: submenuDto.strName },
          });

          if (!submenu) {
            submenu = this.menuoptionRepository.create({
              strName: submenuDto.strName,
              strDescription: submenuDto.strDescription ?? null,
              strUrl: submenuDto.strUrl ?? null,
              strIcon: submenuDto.strIcon ?? null,
              strType: submenuDto.strType ?? null,
              ingOrder: submenuDto.ingOrder ?? 0,
              strMPatern: menuOption,
            });
            await this.menuoptionRepository.save(submenu);
          }
        }
      }

      // 🧹 Eliminar relaciones menú que ya no están
      const currentRelations = await this.rolMenuOptionRepository.find({
        where: { rol },
        relations: ['menuoption'],
      });

      for (const rel of currentRelations) {
        if (!processedMenuOptions.has(rel.menuoption.strName)) {
          await this.rolMenuOptionRepository.remove(rel);
        }
      }
    }

    // 🗑️ Eliminar roles que ya no existen en el DTO
    for (const existingRol of existingRoles) {
      const stillExists = incomingRolesDto.some(
        (r) => r.strName === existingRol.strName,
      );
      if (!stillExists) {
        await this.RolRepository.remove(existingRol);
      }
    }

    return {
      ...app,
      strRoles: incomingRoles,
    } as Application;
  }

  async remove(id: string) {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

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

  async deleteAllApplications() {
    const query = this.applicationRepository.createQueryBuilder('application');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExcelption(error);
    }
  }
}
