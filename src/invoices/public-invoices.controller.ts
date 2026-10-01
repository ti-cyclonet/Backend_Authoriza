import { Controller, Post, UseGuards } from '@nestjs/common';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { InvoiceSweepService } from './invoice-sweep.service';

// Genera facturas: solo otro servicio (x-internal-key) o un admin de Authoriza
@UseGuards(InternalOrAdminGuard)
@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoiceSweepService: InvoiceSweepService) {}

  @Post('sweep')
  async sweepInvoices() {
    console.log('Public sweep endpoint called');
    return await this.invoiceSweepService.sweepAndGenerateInvoices();
  }
}