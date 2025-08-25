import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contractService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractService.remove(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.contractService.findByUser(userId);
  }

  @Get('package/:packageId')
  findByPackage(@Param('packageId') packageId: string) {
    return this.contractService.findByPackage(packageId);
  }

  @Get('active')
  findActive() {
    return this.contractService.findActive();
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.contractService.findAll(paginationDto);
  }
}
