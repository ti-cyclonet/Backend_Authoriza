import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { InvoiceSweepService } from './invoice-sweep.service';
import { InvoiceLifecycleCron } from './invoice-lifecycle.cron';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoiceGeneratorService: InvoiceGeneratorService,
    private readonly invoiceSweepService: InvoiceSweepService,
    private readonly invoiceLifecycleCron: InvoiceLifecycleCron,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get()
  @Public()
  async findAll(@Query('tenantId') tenantId?: string) {
    const result = await this.invoicesService.findAll(tenantId);
    console.log(`[InvoicesController] findAll returning ${result.length} invoices for tenantId: ${tenantId}`);
    return result;
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Get(':id/voucher-url')
  @Public()
  async getVoucherSignedUrl(@Param('id') id: string) {
    return this.invoicesService.getVoucherSignedUrl(+id);
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

  @Post(':id/register-payment')
  @Public()
  @UseInterceptors(FileInterceptor('voucher'))
  async registerPayment(
    @Param('id') id: string,
    @Body() dto: RegisterPaymentDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    let voucherUrl: string | undefined = dto.paymentVoucherUrl;

    // If a file was uploaded, upload to Cloudinary
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'payment-vouchers');
      voucherUrl = uploadResult.secure_url;
    }

    return this.invoicesService.registerPayment(+id, dto.paymentDate, dto.paidAmount, voucherUrl);
  }

  @Post(':id/confirm-payment')
  @Public()
  confirmPayment(@Param('id') id: string) {
    return this.invoicesService.confirmPayment(+id);
  }

  @Post(':id/reject-payment')
  @Public()
  rejectPayment(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.invoicesService.rejectPayment(+id, body.reason);
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

  @Post('lifecycle-check')
  @Public()
  async lifecycleCheck() {
    console.log('Lifecycle check endpoint called');
    await this.invoiceLifecycleCron.handleInvoiceLifecycle();
    return { message: 'Invoice lifecycle check completed' };
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