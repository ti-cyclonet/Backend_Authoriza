import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PotentialUsersService } from './potential-users.service';
import { CreatePotentialUserDto } from './dto/create-potential-user.dto';

@Controller('potential-users')
export class PotentialUsersController {
  constructor(private readonly potentialUsersService: PotentialUsersService) {}

  @Post()
  async create(@Body() createPotentialUserDto: CreatePotentialUserDto) {
    return await this.potentialUsersService.create(createPotentialUserDto);
  }

  @Get('by-source/:source')
  async findBySource(@Param('source') source: string) {
    return await this.potentialUsersService.findBySource(source);
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    return await this.potentialUsersService.findByEmail(email);
  }

  @Get(':id')
  async findById(@Param('id') id: number) {
    return await this.potentialUsersService.findById(id);
  }
}