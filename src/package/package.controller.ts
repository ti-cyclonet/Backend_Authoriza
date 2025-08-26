import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('packages')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      // máximo 3 imágenes
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB por archivo
      },
    }),
  )
  async createPackage(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    let configurations;
    try {
      configurations =
        typeof body.configurations === 'string'
          ? JSON.parse(body.configurations)
          : body.configurations;
    } catch {
      throw new BadRequestException('Invalid configurations JSON');
    }

    const createPackageDto: CreatePackageDto = {
      name: body.name,
      description: body.description,
      configurations,
    };

    return this.packageService.create(createPackageDto, files);
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
