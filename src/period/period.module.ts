import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Period } from './entities/period.entity';
import { PeriodService } from './period.service';
import { PeriodController } from './period.controller';
import { GlobalParametersPeriodsModule } from '../global-parameters-periods/global-parameters-periods.module';

@Module({
  imports: [TypeOrmModule.forFeature([Period]), GlobalParametersPeriodsModule],
  controllers: [PeriodController],
  providers: [PeriodService],
})
export class PeriodModule {}
