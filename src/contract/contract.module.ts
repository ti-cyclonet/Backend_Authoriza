import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';
import { EntityCodesModule } from '../entity-codes/entity-codes.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, User, Package]),
    EntityCodesModule,
    CloudinaryModule,
    LogsModule
  ],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [TypeOrmModule, ContractService],
})
export class ContractModule {}
