import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ConfigurationPackageService } from './configuration-package.service';
import { CreateConfigurationPackageDto } from './dto/create-configuration-package.dto';
import { UpdateConfigurationPackageDto } from './dto/update-configuration-package.dto';

@Controller('configuration-packages')
export class ConfigurationPackageController {
  constructor(private readonly service: ConfigurationPackageService) {}

  @Post()
  create(@Body() dto: CreateConfigurationPackageDto) {
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

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConfigurationPackageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
