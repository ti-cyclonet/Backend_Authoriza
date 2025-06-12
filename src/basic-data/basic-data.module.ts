import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasicData } from './entities/basic-data.entity';

import { User } from '../users/entities/user.entity';
import { BasicDataService } from './basic-data.service';
import { BasicDataController } from './basic-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BasicData, User])],
  providers: [BasicDataService],
  controllers: [BasicDataController],
  exports: [BasicDataService],
})
export class BasicDataModule {}
