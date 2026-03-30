import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDependenciesController } from './user-dependencies.controller';
import { UserDependenciesService } from './user-dependencies.service';
import { UserDependency } from './entities/user-dependency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserDependency])],
  controllers: [UserDependenciesController],
  providers: [UserDependenciesService],
  exports: [UserDependenciesService],
})
export class UserDependenciesModule {}