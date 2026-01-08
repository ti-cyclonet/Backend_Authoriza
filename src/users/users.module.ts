import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { DocumentType } from 'src/document-types/entities/document-type.entity';
import { BasicDataModule } from 'src/basic-data/basic-data.module';
import { NaturalPersonDataModule } from 'src/natural-person-data/natural-person-data.module';
import { LegalEntityDataModule } from 'src/legal-entity-data/legal-entity-data.module';
import { EntityCodesModule } from 'src/entity-codes/entity-codes.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Rol, DocumentType]), BasicDataModule, NaturalPersonDataModule, LegalEntityDataModule, EntityCodesModule, LogsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
