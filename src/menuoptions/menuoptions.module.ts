import { Module } from '@nestjs/common';
import { MenuoptionsService } from './menuoptions.service';
import { MenuoptionsController } from './menuoptions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menuoption } from './entities/menuoption.entity';

@Module({
  controllers: [MenuoptionsController],
  providers: [MenuoptionsService],
  imports: [
    TypeOrmModule.forFeature([Menuoption])
  ],
  exports: [MenuoptionsService, TypeOrmModule],
})
export class MenuoptionsModule {}
