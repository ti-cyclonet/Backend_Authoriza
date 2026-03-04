import { DataSource } from 'typeorm';
import { Application } from '../applications/entities/application.entity';
import { User } from '../users/entities/user.entity';
import { BasicData } from '../basic-data/entities/basic-data.entity';
import { NaturalPersonData } from '../natural-person-data/entities/natural-person-data.entity';
import { Rol } from '../roles/entities/rol.entity';
import { Menuoption } from '../menuoptions/entities/menuoption.entity';
import { RolMenuoption } from 'src/roles/entities/rol-menuoption.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { EntityCode } from '../entity-codes/entities/entity-code.entity';

export default class InitialApplicationsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const appRepo = dataSource.getRepository(Application);
    const roleRepo = dataSource.getRepository(Rol);
    const menuRepo = dataSource.getRepository(Menuoption);
    const userRepo = dataSource.getRepository(User);
    const basicRepo = dataSource.getRepository(BasicData);
    const naturalRepo = dataSource.getRepository(NaturalPersonData);
    const entityCodeRepo = dataSource.getRepository(EntityCode);
    
    // Initialize entity code service
    const entityCodeService = new EntityCodeService(entityCodeRepo);
    await entityCodeService.initializeEntityCodes();

    // =============== 🔹 SEED APPLICATIONS ==================
    const applications = [
      // Authoriza
      {
        strName: 'Authoriza',
        strDescription: 'Control Access for Cyclonet Applications',
        strUrlImage:
          'https://res.cloudinary.com/dn8ki4idz/image/upload/v1755136261/Authoriza-logo_qxdabx.png',
        strSlug: 'authoriza app',
        strTags: ['control access', 'security', 'users'],
        roles: [
          {
            strName: 'accountOwner',
            strDescription1: 'Account Owner',
            strDescription2: 'Owner of the account',
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
                strName: 'usersAuthoriza',
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
          {
            strName: 'adminAuthoriza',
            strDescription1: 'Administrator',
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
                strName: 'usersAuthoriza',
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
      // InOut
      {
        strName: 'Inout',
        strDescription: 'Gestión de Inventario y Manufactura',
        strUrlImage:
          'https://res.cloudinary.com/dn8ki4idz/image/upload/v1755134161/logos-applications/rejxz5x2vlaqkycvwn23.png',
        strSlug: 'inout app',
        strTags: ['inventory', 'manufacturing', 'materials', 'products'],
        roles: [
          {
            strName: 'adminInout',
            strDescription1: 'Administrator',
            strDescription2: 'Full access to inventory and manufacturing',
            menuOptions: [
              // Dashboard común
              {
                strName: 'dashboardInout',
                strDescription: 'Dashboard',
                strUrl: '/home',
                strIcon: 'house',
                strType: 'main_menu',
                ingOrder: 1,
              },
              // MÓDULO INVENTARIO
              {
                strName: 'warehousesInout',
                strDescription: 'Warehouses',
                strUrl: '/warehouses',
                strIcon: 'building',
                strType: 'main_menu',
                ingOrder: 2,
              },
              {
                strName: 'locationsInout',
                strDescription: 'Locations',
                strUrl: '/locations',
                strIcon: 'geo-alt',
                strType: 'main_menu',
                ingOrder: 3,
              },
              // {
              //   strName: 'movementsInout',
              //   strDescription: 'Movements',
              //   strUrl: '/movements',
              //   strIcon: 'arrow-left-right',
              //   strType: 'main_menu',
              //   ingOrder: 4,
              // },
              // {
              //   strName: 'inventoryReportsInout',
              //   strDescription: 'Inventory Reports',
              //   strUrl: '/reports-inventory',
              //   strIcon: 'file-earmark-bar-graph',
              //   strType: 'main_menu',
              //   ingOrder: 5,
              // },
              // MÓDULO MANUFACTURA
              {
                strName: 'materialsInout',
                strDescription: 'Materials',
                strUrl: '/materials',
                strIcon: 'box-seam',
                strType: 'main_menu',
                ingOrder: 6,
              },
              {
                strName: 'productsInout',
                strDescription: 'Products',
                strUrl: '/products',
                strIcon: 'box',
                strType: 'main_menu',
                ingOrder: 7,
              },
              {
                strName: 'salesInout',
                strDescription: 'Sales',
                strUrl: '/sales',
                strIcon: 'cart-check',
                strType: 'main_menu',
                ingOrder: 8,
              },
              // {
              //   strName: 'usersInout',
              //   strDescription: 'Users',
              //   strUrl: '/users',
              //   strIcon: 'people',
              //   strType: 'main_menu',
              //   ingOrder: 10,
              // },
              // {
              //   strName: 'costsInout',
              //   strDescription: 'Costs',
              //   strUrl: '/costs',
              //   strIcon: 'calculator',
              //   strType: 'main_menu',
              //   ingOrder: 10,
              // },
              // Configuración común
              {
                strName: 'setupInout',
                strDescription: 'Settings',
                strUrl: '/setting',
                strIcon: 'gear',
                strType: 'main_menu',
                ingOrder: 99,
              },
            ],
          },
          {
            strName: 'inventoryManagerInout',
            strDescription1: 'Inventory Manager',
            strDescription2: 'Access only to inventory module',
            menuOptions: [
              {
                strName: 'dashboardInventoryInout',
                strDescription: 'Dashboard',
                strUrl: '/home',
                strIcon: 'house',
                strType: 'main_menu',
                ingOrder: 1,
              },
              {
                strName: 'warehousesInventoryInout',
                strDescription: 'Warehouses',
                strUrl: '/warehouses',
                strIcon: 'building',
                strType: 'main_menu',
                ingOrder: 2,
              },
              {
                strName: 'locationsInventoryInout',
                strDescription: 'Locations',
                strUrl: '/locations',
                strIcon: 'geo-alt',
                strType: 'main_menu',
                ingOrder: 3,
              },
              {
                strName: 'movementsInventoryInout',
                strDescription: 'Movements',
                strUrl: '/movements',
                strIcon: 'arrow-left-right',
                strType: 'main_menu',
                ingOrder: 4,
              },
            ],
          },
          {
            strName: 'manufacturingManagerInout',
            strDescription1: 'Manufacturing Manager',
            strDescription2: 'Access only to manufacturing module',
            menuOptions: [
              {
                strName: 'dashboardManufacturingInout',
                strDescription: 'Dashboard',
                strUrl: '/home',
                strIcon: 'house',
                strType: 'main_menu',
                ingOrder: 1,
              },
              {
                strName: 'materialsManufacturingInout',
                strDescription: 'Materials',
                strUrl: '/materials',
                strIcon: 'box-seam',
                strType: 'main_menu',
                ingOrder: 2,
              },
              {
                strName: 'productsManufacturingInout',
                strDescription: 'Products',
                strUrl: '/products',
                strIcon: 'box',
                strType: 'main_menu',
                ingOrder: 3,
              }
            ],
          },
        ],
      },
      // FactoNet
      {
        strName: 'Factonet',
        strDescription:
          'Invoice and payment management for Cyclonet Applications',
        strUrlImage:
          'https://res.cloudinary.com/dn8ki4idz/image/upload/v1763930796/logos-applications/eviplcxfodjcezc6zjkn.png',
        strSlug: 'factonet app',
        strTags: ['invoice', 'security', 'payment'],
        roles: [
          {
            strName: 'adminFactonet',
            strDescription1: 'Administrator',
            strDescription2: 'Full access',
            menuOptions: [
              {
                id: '07ff9168-58af-4f34-a5a5-fd746fa525d0',
                strName: 'contratosFactonet',
                strDescription: 'Contracts',
                strUrl: '/contracts',
                strIcon: 'journal-richtext',
                strType: 'main_menu',
                ingOrder: 1,
                strSubmenus: [],
              },
              {
                id: '0dcd4725-5f61-40ed-9c5d-70ed7ecbd250',
                strName: 'facturasFactonet',
                strDescription: 'Invoices',
                strUrl: '/invoices',
                strIcon: 'file-earmark-text',
                strType: 'main_menu',
                ingOrder: 2,
                strSubmenus: [],
              },
              {
                id: 'e1872e8e-eeda-472f-a90d-22a52e5d52ef',
                strName: 'parametersFactonet',
                strDescription: 'Periods',
                strUrl: '/parametros-globales',
                strIcon: 'gear-fill',
                strType: 'main_menu',
                ingOrder: 3,
                strSubmenus: [],
              },
              {
                strName: 'invoiceParametersFactonet',
                strDescription: 'Invoice Parameters',
                strUrl: '/parametros-facturas',
                strIcon: 'sliders',
                strType: 'main_menu',
                ingOrder: 4,
                strSubmenus: [],
              },
            ],
          },
          {
            strName: 'adminInvoices',
            strDescription1: 'Invoice Administrator',
            strDescription2: 'Access only to invoices',
            menuOptions: [
              {
                strName: 'facturasFactonetInvoices',
                strDescription: 'Invoices',
                strUrl: '/invoices',
                strIcon: 'file-earmark-text',
                strType: 'main_menu',
                ingOrder: 1,
                strSubmenus: [],
              },
            ],
          },
        ],
      },
    ];

    for (const appData of applications) {
      let app = await appRepo.findOne({ where: { strName: appData.strName } });
      if (!app) {
        const appCode = await entityCodeService.generateCode('Application');
        app = appRepo.create({
          strName: appData.strName,
          strDescription: appData.strDescription,
          strUrlImage: appData.strUrlImage,
          strSlug: appData.strSlug,
          strTags: appData.strTags,
          code: appCode,
        });
        await appRepo.save(app);
        console.log('✅ Application created:', app.strName, 'Code:', appCode);
      }

      for (const roleData of appData.roles) {
        let role = await roleRepo.findOne({
          where: { strName: roleData.strName },
        });
        if (!role) {
          const roleCode = await entityCodeService.generateCode('Rol');
          role = roleRepo.create({
            strName: roleData.strName,
            strDescription1: roleData.strDescription1,
            strDescription2: roleData.strDescription2,
            strApplication: app,
            code: roleCode,
          });

          await roleRepo.save(role);
          console.log('✅ Role created:', role.strName, 'Code:', roleCode);
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
            console.log('✅ Menu created:', existsMenu.strName);
          }

          // Check if rol-menuoption relationship already exists
          const rolMenuoptionRepo = dataSource.getRepository(RolMenuoption);
          const existingRelation = await rolMenuoptionRepo.findOne({
            where: {
              rol: { id: role.id },
              menuoption: { id: existsMenu.id }
            }
          });

          if (!existingRelation) {
            const rolMenuoption = rolMenuoptionRepo.create({
              rol: role,
              menuoption: existsMenu,
            });
            await rolMenuoptionRepo.save(rolMenuoption);
            console.log('✅ Rol-Menu relationship created:', role.strName, '-', existsMenu.strName);
          }
        }
      }
    }
  }
}
