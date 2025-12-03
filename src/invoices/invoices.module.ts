import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PublicInvoicesController } from './public-invoices.controller';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { InvoiceSweepService } from './invoice-sweep.service';
import { Invoice } from './entities/invoice.entity';
import { Contract } from '../contract/entities/contract.entity';
import { GlobalParametersPeriods } from '../global-parameters-periods/entities/global-parameters-periods.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Contract, GlobalParametersPeriods])],
  controllers: [InvoicesController, PublicInvoicesController],
  providers: [InvoicesService, InvoiceGeneratorService, InvoiceSweepService],
  exports: [InvoicesService, InvoiceGeneratorService, InvoiceSweepService]
})
export class InvoicesModule {}