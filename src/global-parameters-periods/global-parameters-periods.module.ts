import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalParametersPeriods } from './entities/global-parameters-periods.entity';
import { GlobalParametersPeriodsService } from './global-parameters-periods.service';
import { GlobalParametersPeriodsController } from './global-parameters-periods.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalParametersPeriods])],
  controllers: [GlobalParametersPeriodsController],
  providers: [GlobalParametersPeriodsService],
  exports: [GlobalParametersPeriodsService],
})
export class GlobalParametersPeriodsModule {}