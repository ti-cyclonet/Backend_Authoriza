import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateCustomerParametersPeriodDto } from './dto/create-customer-parameters-period.dto';
import { UpdateCustomerParametersPeriodDto } from './dto/update-customer-parameters-period.dto';
import { CustomerParametersPeriodsService } from './customer-parameters-periods.service';


@Controller('customer-parameters-periods')
export class CustomerParametersPeriodsController {
  constructor(private readonly service: CustomerParametersPeriodsService) {}

  @Post()
  create(@Body() dto: CreateCustomerParametersPeriodDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('parameter/:paramId')
  findByParameter(@Param('paramId') paramId: string) {
    return this.service.findByParameter(paramId);
  }

  @Get('period/:periodId')
  findByPeriod(@Param('periodId') periodId: string) {
    return this.service.findByPeriod(periodId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerParametersPeriodDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/value')
  updateValue(@Param('id') id: string, @Body() body: { value: string }) {
    return this.service.update(id, { value: body.value });
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.update(id, { status: body.status });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
