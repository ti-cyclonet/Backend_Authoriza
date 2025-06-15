import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'Create a role' })
  @Post()
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolesService.create(createRolDto);
  }

  @ApiOperation({ summary: 'Get all roles' })
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.rolesService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Check if a role name is available' })
  @Get('check-name')
  async checkRoleName(@Query('strName') strName: string) {
    if (!strName) {
      throw new BadRequestException('The query parameter "strName" is required');
    }
    const isAvailable = await this.rolesService.checkRoleName(strName);
    return { available: isAvailable };
  }

  @ApiOperation({ summary: 'Get role by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a role by ID' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateRolDto: UpdateRolDto) {
    return this.rolesService.update(id, updateRolDto);
  }

  @ApiOperation({ summary: 'Delete a role by ID' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.remove(id);
  }
}
