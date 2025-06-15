import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { BasicDataService } from './basic-data.service';
import { CreateBasicDataDto } from './dto/create-basic-data.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Basic Data')
@Controller('basic-data')
export class BasicDataController {
  constructor(private readonly basicDataService: BasicDataService) {}

  @ApiOperation({ summary: 'Create basic data for a user' })
  @Post(':userId')
  async create(@Param('userId') userId: string, @Body() dto: CreateBasicDataDto) {
    return this.basicDataService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Get basic data by user ID' })
  @Get(':userId')
  async findByUser(@Param('userId') userId: string) {
    const data = await this.basicDataService.findByUser(userId);
    if (!data) throw new NotFoundException('Basic data not found for user');
    return data;
  }
}