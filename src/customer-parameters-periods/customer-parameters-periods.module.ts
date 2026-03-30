import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerParametersPeriodsController } from './customer-parameters-periods.controller';
import { CustomerParametersPeriodsService } from './customer-parameters-periods.service';
import { CustomerParametersPeriods } from './entities/customer-parameters-periods.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerParametersPeriods])],
  controllers: [CustomerParametersPeriodsController],
  providers: [CustomerParametersPeriodsService],
  exports: [CustomerParametersPeriodsService],
})
export class CustomerParametersPeriodsModule {}
