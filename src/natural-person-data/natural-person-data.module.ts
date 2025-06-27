import { TypeOrmModule } from "@nestjs/typeorm";
import { NaturalPersonDataController } from "./natural-person-data.controller";
import { NaturalPersonDataService } from "./natural-person-data.service";
import { Module } from '@nestjs/common';
import { BasicData } from "src/basic-data/entities/basic-data.entity";
import { NaturalPersonData } from "./entities/natural-person-data.entity";

@Module({
  imports: [TypeOrmModule.forFeature([NaturalPersonData, BasicData])],
  providers: [NaturalPersonDataService],
  controllers: [NaturalPersonDataController],
  exports: [NaturalPersonDataService],
})
export class NaturalPersonDataModule {}
