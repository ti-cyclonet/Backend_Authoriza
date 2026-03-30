import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalParameter } from './entities/global-parameter.entity';
import { GlobalParametersPeriods } from '../global-parameters-periods/entities/global-parameters-periods.entity';
import { GlobalParametersService } from './global-parameters.service';
import { GlobalParametersController } from './global-parameters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalParameter, GlobalParametersPeriods])],
  controllers: [GlobalParametersController],
  providers: [GlobalParametersService],
  exports: [GlobalParametersService],
})
export class GlobalParametersModule {}
