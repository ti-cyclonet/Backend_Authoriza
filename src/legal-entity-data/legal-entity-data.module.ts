import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from '@nestjs/common';
import { BasicData } from "src/basic-data/entities/basic-data.entity";
import { LegalEntityData } from "./entities/legal-entity-data.entity";
import { LegalEntityDataService } from "./legal-entity-data.service";
import { LegalEntityDataController } from "./legal-entity-data.controller";


@Module({
  imports: [TypeOrmModule.forFeature([LegalEntityData, BasicData])],
  providers: [LegalEntityDataService],
  controllers: [LegalEntityDataController],
  exports: [LegalEntityDataService],
})
export class LegalEntityDataModule {}
