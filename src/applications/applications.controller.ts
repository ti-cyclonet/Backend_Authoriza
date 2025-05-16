import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';

import { UpdateApplicationDto } from './dto/update-application.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateApplicationDto } from './dto/create-application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('check-name')
  async checkApplicationName(
    @Body('strName') strName: string,
  ): Promise<{ available: boolean }> {
    const available = await this.applicationsService.checkApplicationName(
      strName,
    );
    return { available };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createApplication(
    @Body() createApplicationDto: CreateApplicationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // console.log('🎯 DTO recibido en el controlador:', createApplicationDto);
    // console.log('🎯 Archivo recibido en el controlador:', file);
    return this.applicationsService.create(createApplicationDto, file);
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
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, updateApplicationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.remove(id);
  }
}
