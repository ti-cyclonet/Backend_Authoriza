import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { RolMenuoption } from './entities/rol-menuoption.entity';
import { MenuoptionsModule } from 'src/menuoptions/menuoptions.module';


@Module({
  imports: [TypeOrmModule.forFeature([Rol]), MenuoptionsModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService, TypeOrmModule], 
})
export class RolesModule {}
