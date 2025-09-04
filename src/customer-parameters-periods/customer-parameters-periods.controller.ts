import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerParametersPeriodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
