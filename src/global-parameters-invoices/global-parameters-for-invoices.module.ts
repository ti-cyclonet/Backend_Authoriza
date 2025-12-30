import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalParametersForInvoices } from './entities/global-parameters-for-invoices.entity';
import { GlobalParametersForInvoicesController } from './global-parameters-for-invoices.controller';
import { GlobalParametersForInvoicesService } from './global-parameters-for-invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalParametersForInvoices])],
  controllers: [GlobalParametersForInvoicesController],
  providers: [GlobalParametersForInvoicesService],
  exports: [GlobalParametersForInvoicesService],
})
export class GlobalParametersForInvoicesModule {}