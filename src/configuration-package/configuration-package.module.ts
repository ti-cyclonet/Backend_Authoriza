import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationPackage } from './entities/configuration-package.entity';
import { ConfigurationPackageController } from './configuration-package.controller';
import { ConfigurationPackageService } from './configuration-package.service';
import { Rol } from 'src/roles/entities/rol.entity';
import { Package } from 'src/package/entities/package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigurationPackage, Rol, Package])],
  controllers: [ConfigurationPackageController],
  providers: [ConfigurationPackageService],
})
export class ConfigurationPackageModule {}