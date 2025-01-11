import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { MenuoptionsService } from './menuoptions.service';
import { CreateMenuoptionDto } from './dto/create-menuoption.dto';
import { UpdateMenuoptionDto } from './dto/update-menuoption.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('menuoptions')
export class MenuoptionsController {
  constructor(private readonly menuoptionsService: MenuoptionsService) {}

  @Post()
  create(@Body() createMenuoptionDto: CreateMenuoptionDto) {
    return this.menuoptionsService.create(createMenuoptionDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.menuoptionsService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuoptionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateMenuoptionDto: UpdateMenuoptionDto) {
    return this.menuoptionsService.update(id, updateMenuoptionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuoptionsService.remove(id);
  }
}
