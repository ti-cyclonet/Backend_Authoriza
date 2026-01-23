import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CustomerParametersService } from './customer-parameters.service';
import { CreateCustomerParameterDto, UpdateCustomerParameterDto } from './dto/customer-parameter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('customer-parameters')
export class CustomerParametersController {
  constructor(private readonly customerParametersService: CustomerParametersService) {}

  @Post()
  createParameter(@Body() createDto: CreateCustomerParameterDto) {
    return this.customerParametersService.createParameter(createDto, null);
  }

  @Get()
  findAll() {
    return this.customerParametersService.findAll(null);
  }

  @Patch(':id')
  updateParameter(@Param('id') id: string, @Body() updateDto: UpdateCustomerParameterDto) {
    return this.customerParametersService.updateParameter(id, updateDto);
  }

  @Delete(':id')
  deleteParameter(@Param('id') id: string) {
    return this.customerParametersService.deleteParameter(id);
  }
}