import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerParametersService } from './customer-parameters.service';
import { CustomerParametersController } from './customer-parameters.controller';
import { CustomerParameter } from './entities/customer-parameter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerParameter])
  ],
  controllers: [CustomerParametersController],
  providers: [CustomerParametersService],
  exports: [CustomerParametersService]
})
export class CustomerParametersModule {}