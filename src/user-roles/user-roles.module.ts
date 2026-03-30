import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { UserRole } from './entities/user-role.entity';
import { Contract } from '../contract/entities/contract.entity';
import { User } from '../users/entities/user.entity';
import { Rol } from '../roles/entities/rol.entity';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Contract, User, Rol, UserDependency])],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}