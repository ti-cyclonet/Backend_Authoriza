import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerParameter } from './entities/customer-parameter.entity';
import { CustomerParametersService } from './customer-parameters.service';
import { CustomerParametersController } from './customer-parameters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerParameter])],
  controllers: [CustomerParametersController],
  providers: [CustomerParametersService],
})
export class CustomerParametersModule {}
