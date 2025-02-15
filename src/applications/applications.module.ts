import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Application } from './entities';
import { Rol } from 'src/roles/entities/rol.entity';
import { Menuoption } from 'src/menuoptions/entities/menuoption.entity';
import { RolMenuoption } from 'src/roles/entities/rol-menuoption.entity';
import { MenuoptionsModule } from 'src/menuoptions/menuoptions.module';
import { RolesModule } from 'src/roles/roles.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports: [
    TypeOrmModule.forFeature([Application, Rol, Menuoption, RolMenuoption]),
    MenuoptionsModule,
    RolesModule,
    CloudinaryModule
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
