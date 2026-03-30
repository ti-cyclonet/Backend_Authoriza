import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Period } from './entities/period.entity';
import { PeriodService } from './period.service';
import { PeriodController } from './period.controller';
import { PeriodValidationService } from './period-validation.service';
import { PeriodInitializationService } from './period-initialization.service';
import { GlobalParametersPeriodsModule } from '../global-parameters-periods/global-parameters-periods.module';
import { GlobalParametersModule } from '../global-parameters/global-parameters.module';
import { EntityCodesModule } from '../entity-codes/entity-codes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Period]), GlobalParametersPeriodsModule, GlobalParametersModule, EntityCodesModule, ConfigModule],
  controllers: [PeriodController],
  providers: [PeriodService, PeriodValidationService, PeriodInitializationService],
  exports: [PeriodService, PeriodValidationService],
})
export class PeriodModule {}
