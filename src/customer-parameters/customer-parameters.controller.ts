import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CustomerParametersService } from './customer-parameters.service';
import { CreateCustomerParametersDto } from './dto/create-customer-parameters.dto';
import { UpdateCustomerParametersDto } from './dto/update-customer-parameters.dto';

@Controller('customer-parameters')
export class CustomerParametersController {
  constructor(private readonly service: CustomerParametersService) {}

  @Post()
  create(@Body() dto: CreateCustomerParametersDto) {
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerParametersDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
