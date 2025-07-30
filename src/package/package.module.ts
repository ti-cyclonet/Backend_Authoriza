import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './entities/package.entity';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Package, ConfigurationPackage])],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}