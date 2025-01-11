import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Application, ApplicationImage } from './entities';
@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationImage]),
  ]
})
export class ApplicationsModule {}
