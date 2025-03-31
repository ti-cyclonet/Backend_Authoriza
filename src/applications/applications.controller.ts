import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('check-name')
  async checkApplicationName(@Body('strName') strName: string): Promise<{ available: boolean }> {
    const available = await this.applicationsService.checkApplicationName(strName);
    return { available };
  }

  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.applicationsService.findAll(paginationDto);
  }

  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.applicationsService.findOnePlain(term);
  }

  @Get(':appName/rol/:rolName')
  async findByApplicationAndRol(
    @Param('appName') appName: string,
    @Param('rolName') rolName: string,
  ) {
    return this.applicationsService.findByApplicationAndRol(appName, rolName);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateApplicationDto: UpdateApplicationDto
  ) {
    return this.applicationsService.update(id, updateApplicationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.remove(id);
  }
}
