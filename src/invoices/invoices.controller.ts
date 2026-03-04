import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { InvoiceSweepService } from './invoice-sweep.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoiceGeneratorService: InvoiceGeneratorService,
    private readonly invoiceSweepService: InvoiceSweepService
  ) {}

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get()
  @Public()
  findAll(@Query('tenantId') tenantId?: string) {
    return this.invoicesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.invoicesService.findByUser(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.update(+id, updateInvoiceDto);
  }

  @Patch(':id/status')
  @Public()
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.invoicesService.updateStatus(+id, body.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(+id);
  }

  @Post('generate/:contractId')
  generateForContract(@Param('contractId') contractId: string) {
    return this.invoiceGeneratorService.generateInvoiceForContract(contractId.trim());
  }

  @Get('contract/:contractId')
  findByContract(@Param('contractId') contractId: string) {
    return this.invoicesService.findByContract(contractId.trim());
  }

  @Post('test-generate/:contractId')
  async testGenerate(@Param('contractId') contractId: string) {
    try {
      const cleanId = contractId.trim();
      const invoice = await this.invoiceGeneratorService.generateInvoiceForContract(cleanId);
      return { success: true, invoice, message: 'Invoice generated successfully' };
    } catch (error) {
      return { success: false, error: error.message, message: 'Generation failed' };
    }
  }

  @Post('sweep')
  @Public()
  async sweepInvoices() {
    console.log('Sweep endpoint called');
    return await this.invoiceSweepService.sweepAndGenerateInvoices();
  }

  @Get('check-period')
  @Public()
  checkInvoicesInPeriod(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.invoicesService.checkInvoicesInPeriod(startDate, endDate);
  }

  @Get('profit-report')
  @Public()
  getProfitReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('contractId') contractId?: string
  ) {
    return this.invoicesService.getProfitReport(startDate, endDate, contractId);
  }

  @Get('test')
  @Public()
  testEndpoint() {
    return { message: 'Authoriza backend is running', timestamp: new Date() };
  }
}