import { Controller, Post } from '@nestjs/common';
import { InvoiceSweepService } from '../invoices/invoice-sweep.service';

@Controller('sweep')
export class SweepController {
  constructor(private readonly invoiceSweepService: InvoiceSweepService) {}

  @Post('invoices')
  async sweepInvoices() {
    console.log('Sweep controller called');
    return await this.invoiceSweepService.sweepAndGenerateInvoices();
  }
}