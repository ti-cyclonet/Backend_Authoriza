import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('packages')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @Post()
  async create(@Body() createPackageDto: CreatePackageDto) {
    return this.packageService.createPackageWithConfigurations(
      createPackageDto,
    );
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.packageService.findAll(paginationDto);
  }

  @Get('check-name')
  async checkName(@Query('name') name: string) {
    const exists = await this.packageService.checkNameExists(name);
    return { exists };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packageService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packageService.update(id, updatePackageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.packageService.remove(id);
  }
}
