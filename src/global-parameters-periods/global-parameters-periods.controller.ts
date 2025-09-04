import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { GlobalParametersPeriodsService } from './global-parameters-periods.service';
import { CreateGlobalParametersPeriodDto } from './dto/create-global-parameters-period.dto';
import { UpdateGlobalParametersPeriodDto } from './dto/update-global-parameters-period.dto';

@Controller('global-parameters-periods')
export class GlobalParametersPeriodsController {
  constructor(private readonly service: GlobalParametersPeriodsService) {}

  @Post()
  create(@Body() dto: CreateGlobalParametersPeriodDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateGlobalParametersPeriodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
