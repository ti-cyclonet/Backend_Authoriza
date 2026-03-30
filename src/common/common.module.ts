import { Module } from '@nestjs/common';
import { ActivePeriodGuard } from './guards/active-period.guard';
import { PeriodModule } from '../period/period.module';

@Module({
  imports: [PeriodModule],
  providers: [ActivePeriodGuard],
  exports: [ActivePeriodGuard],
})
export class CommonModule {}
