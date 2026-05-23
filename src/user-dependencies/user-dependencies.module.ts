import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDependenciesController } from './user-dependencies.controller';
import { UserDependenciesService } from './user-dependencies.service';
import { UserDependency } from './entities/user-dependency.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Contract } from '../contract/entities/contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserDependency, UserRole, Contract])],
  controllers: [UserDependenciesController],
  providers: [UserDependenciesService],
  exports: [UserDependenciesService],
})
export class UserDependenciesModule {}