import { Controller, Post, UseGuards } from '@nestjs/common';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { InvoiceSweepService } from '../invoices/invoice-sweep.service';

// Genera facturas: solo otro servicio (x-internal-key) o un admin de Authoriza
@UseGuards(InternalOrAdminGuard)
@Controller('sweep')
export class SweepController {
  constructor(private readonly invoiceSweepService: InvoiceSweepService) {}

  @Post('invoices')
  async sweepInvoices() {
    console.log('Sweep controller called');
    return await this.invoiceSweepService.sweepAndGenerateInvoices();
  }
}