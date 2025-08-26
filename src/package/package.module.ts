import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './entities/package.entity';
import { Image } from 'src/images/entities/image.entity';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';
import { ImageModule } from 'src/images/image.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, ConfigurationPackage, Image]),
    ImageModule
  ],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}
