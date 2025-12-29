
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { ContractListener } from './listeners/contract.listener';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { EntityCodesModule } from '../entity-codes/entity-codes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, User, Package]),
    forwardRef(() => InvoicesModule),
    EntityCodesModule
  ],
  controllers: [ContractController],
  providers: [ContractService, ContractListener],
  exports: [TypeOrmModule, ContractService],
})
export class ContractModule {}
