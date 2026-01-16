import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { UserRole } from './entities/user-role.entity';
import { Contract } from '../contract/entities/contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Contract])],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}