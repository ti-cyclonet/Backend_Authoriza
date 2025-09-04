import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GlobalParametersService } from './global-parameters.service';
import { CreateGlobalParameterDto } from './dto/create-global-parameter.dto';
import { UpdateGlobalParameterDto } from './dto/update-global-parameter.dto';

@Controller('global-parameters')
export class GlobalParametersController {
  constructor(private readonly service: GlobalParametersService) {}

  @Post()
  create(@Body() dto: CreateGlobalParameterDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateGlobalParameterDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
