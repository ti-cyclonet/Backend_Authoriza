import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PotentialUsersController } from './potential-users.controller';
import { PotentialUsersService } from './potential-users.service';
import { PotentialUser } from './potential-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PotentialUser])],
  controllers: [PotentialUsersController],
  providers: [PotentialUsersService],
  exports: [PotentialUsersService],
})
export class PotentialUsersModule {}