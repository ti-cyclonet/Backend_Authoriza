import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CreateNaturalPersonDataDto } from "./dto/create-natural-person-data.dto";
import { NaturalPersonDataService } from "./natural-person-data.service";

@Controller('natural-person-data')
export class NaturalPersonDataController {
  constructor(private readonly service: NaturalPersonDataService) {}

  @Post()
  create(@Body() dto: CreateNaturalPersonDataDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateNaturalPersonDataDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}