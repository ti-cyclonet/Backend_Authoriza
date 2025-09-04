import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalParameter } from './entities/global-parameter.entity';
import { GlobalParametersService } from './global-parameters.service';
import { GlobalParametersController } from './global-parameters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalParameter])],
  controllers: [GlobalParametersController],
  providers: [GlobalParametersService],
  exports: [GlobalParametersService],
})
export class GlobalParametersModule {}
