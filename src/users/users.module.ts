
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { BasicDataModule } from 'src/basic-data/basic-data.module';
import { NaturalPersonDataModule } from 'src/natural-person-data/natural-person-data.module';
import { LegalEntityDataModule } from 'src/legal-entity-data/legal-entity-data.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Rol]), BasicDataModule, NaturalPersonDataModule, LegalEntityDataModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
