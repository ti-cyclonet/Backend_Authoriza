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
import { Public } from '../auth/decorators/public.decorator';

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
      price: body.price ? parseFloat(body.price) : 0,
      isBillable: body.isBillable === 'true' || body.isBillable === true,
      showInLanding: body.showInLanding === 'true' || body.showInLanding === true,
      displayName: body.displayName || null,
      displayOrder: body.displayOrder ? parseInt(body.displayOrder) : 0,
      isHighlighted: body.isHighlighted === 'true' || body.isHighlighted === true,
      ctaLabel: body.ctaLabel || 'Elegir Plan',
      ctaType: body.ctaType || 'register',
      configurations,
      usageLimitVariables: body.usageLimitVariables,
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

  @Public()
  @Get('landing')
  findForLanding(@Query('application') application?: string) {
    return this.packageService.findForLanding(application);
  }

  @Get('contracted/:userId')
  findContractedByUser(@Param('userId') userId: string) {
    return this.packageService.findContractedByUser(userId);
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
