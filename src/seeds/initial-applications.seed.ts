import { DataSource } from 'typeorm';
import { Application } from '../applications/entities/application.entity';

import { User } from '../users/entities/user.entity';
import { BasicData } from '../basic-data/entities/basic-data.entity';
import { NaturalPersonData } from '../natural-person-data/entities/natural-person-data.entity';
import { Rol } from '../roles/entities/rol.entity';
import { Menuoption } from '../menuoptions/entities/menuoption.entity';
import { RolMenuoption } from 'src/roles/entities/rol-menuoption.entity';

export default class InitialApplicationsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const appRepo = dataSource.getRepository(Application);
    const roleRepo = dataSource.getRepository(Rol);
    const menuRepo = dataSource.getRepository(Menuoption);
    const userRepo = dataSource.getRepository(User);
    const basicRepo = dataSource.getRepository(BasicData);
    const naturalRepo = dataSource.getRepository(NaturalPersonData);

    // =============== 🔹 SEED APPLICATIONS ==================
    const applications = [
      {
        strName: 'Authoriza',
        strDescription: 'Control Access for Cyclonet Applications',
        strUrlImage:
          'https://res.cloudinary.com/dn8ki4idz/image/upload/v1755136261/Authoriza-logo_qxdabx.png',
        strSlug: 'authoriza app',
        strTags: ['control access', 'security', 'users'],
        roles: [
          {
            strName: 'adminAuthoriza',
            strDescription1: 'Administrador',
            strDescription2: 'Full access',
            menuOptions: [
              {
                strName: 'homeAuthoriza',
                strDescription: 'Home',
                strUrl: '/home',
                strIcon: 'house',
                strType: 'main_menu',
                ingOrder: 1,
              },
              {
                strName: 'userAuthoriza',
                strDescription: 'Users',
                strUrl: '/users',
                strIcon: 'people',
                strType: 'main_menu',
                ingOrder: 2,
              },
              {
                strName: 'applicationsAuthoriza',
                strDescription: 'Applications',
                strUrl: '/applications',
                strIcon: 'window-stack',
                strType: 'main_menu',
                ingOrder: 3,
              },
              {
                strName: 'packagesAuthoriza',
                strDescription: 'Packages',
                strUrl: '/packages',
                strIcon: 'boxes',
                strType: 'main_menu',
                ingOrder: 4,
              },
              {
                strName: 'contractsAuthoriza',
                strDescription: 'Contracts',
                strUrl: '/contracts',
                strIcon: 'file-earmark-text',
                strType: 'main_menu',
                ingOrder: 5,
              },
              {
                strName: 'settingsAuthoriza',
                strDescription: 'Settings',
                strUrl: '/setup',
                strIcon: 'gear',
                strType: 'main_menu',
                ingOrder: 6,
              },
            ],
          },
        ],
      },
      {
        strName: 'Inout',
        strDescription: 'Inventory and Manufacturing Management',
        strUrlImage:
          'https://res.cloudinary.com/dn8ki4idz/image/upload/v1755134161/logos-applications/rejxz5x2vlaqkycvwn23.png',
        strSlug: 'inout app',
        strTags: ['inventory', 'products', 'raw material'],
        roles: [
          {
            strName: 'adminInout',
            strDescription1: 'Administrador',
            strDescription2: 'Full access',
            menuOptions: [
              {
                strName: 'materialInout',
                strDescription: 'Materials',
                strUrl: '/materials',
                strIcon: 'boxes',
                strType: 'main_menu',
                ingOrder: 1,
              },
              {
                strName: 'dashboardInout',
                strDescription: 'Dashboard',
                strUrl: '/home',
                strIcon: 'file-bar-graph',
                strType: 'main_menu',
                ingOrder: 2,
              },
              {
                strName: 'kardexInout',
                strDescription: 'Kardex',
                strUrl: '/kardex',
                strIcon: 'file-ppt-fill',
                strType: 'main_menu',
                ingOrder: 3,
              },
            ],
          },
        ],
      },
    ];

    for (const appData of applications) {
      let app = await appRepo.findOne({ where: { strName: appData.strName } });
      if (!app) {
        app = appRepo.create({
          strName: appData.strName,
          strDescription: appData.strDescription,
          strUrlImage: appData.strUrlImage,
          strSlug: appData.strSlug,
          strTags: appData.strTags,
        });
        await appRepo.save(app);
      }

      for (const roleData of appData.roles) {
        let role = await roleRepo.findOne({
          where: { strName: roleData.strName },
        });
        if (!role) {
          role = roleRepo.create({
            strName: roleData.strName,
            strDescription1: roleData.strDescription1,
            strDescription2: roleData.strDescription2,
            strApplication: app,
          });

          await roleRepo.save(role);
        }

        for (const menu of roleData.menuOptions) {
          let existsMenu = await menuRepo.findOne({
            where: { strName: menu.strName },
          });
          if (!existsMenu) {
            existsMenu = menuRepo.create({
              ...menu,
            });
            await menuRepo.save(existsMenu);

            // ahora vinculas el rol con el menú
            const rolMenuoptionRepo = dataSource.getRepository(RolMenuoption);
            const rolMenuoption = rolMenuoptionRepo.create({
              rol: role,
              menuoption: existsMenu,
            });
            await rolMenuoptionRepo.save(rolMenuoption);
          }
        }
      }
    }
  }
}
