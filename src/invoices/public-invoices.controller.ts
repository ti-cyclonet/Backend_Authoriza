import { Controller, Post } from '@nestjs/common';
import { InvoiceSweepService } from './invoice-sweep.service';

@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoiceSweepService: InvoiceSweepService) {}

  @Post('sweep')
  async sweepInvoices() {
    console.log('Public sweep endpoint called');
    return await this.invoiceSweepService.sweepAndGenerateInvoices();
  }
}