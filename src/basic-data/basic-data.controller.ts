import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { BasicDataService } from './basic-data.service';
import { CreateBasicDataDto } from './dto/create-basic-data.dto';

@Controller('basic-data')
export class BasicDataController {
  constructor(private readonly basicDataService: BasicDataService) {}

  @Post(':userId')
  async create(@Param('userId') userId: string, @Body() dto: CreateBasicDataDto) {
    return this.basicDataService.create(userId, dto);
  }

  @Get(':userId')
  async findByUser(@Param('userId') userId: string) {
    const data = await this.basicDataService.findByUser(userId);
    if (!data) throw new NotFoundException('Basic data not found for user');
    return data;
  }
}