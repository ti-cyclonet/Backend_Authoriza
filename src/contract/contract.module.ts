
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, User, Package])],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [TypeOrmModule, ContractService],
})
export class ContractModule {}
