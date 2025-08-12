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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { Rol } from 'src/roles/entities/rol.entity';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @ApiOperation({ summary: 'Check if an application name is available' })
  @Post('check-name')
  async checkApplicationName(
    @Body('strName') strName: string,
  ): Promise<{ available: boolean }> {
    const available = await this.applicationsService.checkApplicationName(
      strName,
    );
    return { available };
  }

  @ApiOperation({ summary: 'Create a new application' })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createApplication(
    @Body() createApplicationDto: CreateApplicationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.applicationsService.create(createApplicationDto, file);
  }

  @ApiOperation({ summary: 'Get all applications' })
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.applicationsService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Get application by ID' })
  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.applicationsService.findOnePlain(term);
  }

  @ApiOperation({ summary: 'Get application by name' })
  @Get(':appName/rol/:rolName')
  async findByApplicationAndRol(
    @Param('appName') appName: string,
    @Param('rolName') rolName: string,
  ) {
    if (rolName) {
      return this.applicationsService.findByApplicationAndRol(appName, rolName);
    }
    return this.applicationsService.findRolesByApplicationName(appName);
  }

  @ApiOperation({ summary: 'Get all roles of an application' })
  @Get(':appName/rol')
  async getRolesByApplicationName(@Param('appName') appName: string) {
    return this.applicationsService.findRolesByApplicationName(appName);
  }

  @Get(':appName/full-roles')
  async getFullRolesByApplication(@Param('appName') appName: string): Promise<Rol[]> {
    return this.applicationsService.fullRolesByApplicationName(appName);
  }

  @ApiOperation({ summary: 'Update an application by ID' })
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateApp(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.applicationsService.updateApplication(id, body, file);
  }

  @ApiOperation({ summary: 'Delete an application by ID' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.remove(id);
  }
}
