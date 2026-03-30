import { Controller, Get, Post, Body, Delete } from '@nestjs/common';
import { GlobalParametersForInvoicesService } from './global-parameters-for-invoices.service';

@Controller('global-parameters-for-invoices')
export class GlobalParametersForInvoicesController {
  constructor(
    private readonly globalParametersForInvoicesService: GlobalParametersForInvoicesService,
  ) {}

  @Get()
  findAll() {
    return this.globalParametersForInvoicesService.findAll();
  }

  @Post('bulk')
  createBulk(@Body() parametros: { globalParameterPeriodId: string }[]) {
    return this.globalParametersForInvoicesService.createBulk(parametros);
  }

  @Delete('all')
  removeAll() {
    return this.globalParametersForInvoicesService.removeAll();
  }
}