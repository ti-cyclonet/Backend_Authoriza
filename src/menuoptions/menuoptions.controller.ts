import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { MenuoptionsService } from './menuoptions.service';
import { CreateMenuoptionDto } from './dto/create-menuoption.dto';
import { UpdateMenuoptionDto } from './dto/update-menuoption.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Menu Options')
@Controller('menuoptions')
export class MenuoptionsController {
  constructor(private readonly menuoptionsService: MenuoptionsService) {}

  @ApiOperation({ summary: 'Create a menu option' })
  @Post()
  create(@Body() createMenuoptionDto: CreateMenuoptionDto) {
    return this.menuoptionsService.create(createMenuoptionDto);
  }

  @ApiOperation({ summary: 'Get all menu options' })
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.menuoptionsService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Check if a menu option name is available' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuoptionsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a menu option by ID' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateMenuoptionDto: UpdateMenuoptionDto) {
    return this.menuoptionsService.update(id, updateMenuoptionDto);
  }

  @ApiOperation({ summary: 'Delete a menu option by ID' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuoptionsService.remove(id);
  }
}
