import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CreateLegalEntityDataDto } from "./dto/create-legal-entity-data.dto";
import { LegalEntityDataService } from "./legal-entity-data.service";

@Controller('legal-entity-data')
export class LegalEntityDataController {
  constructor(private readonly service: LegalEntityDataService) {}

  @Post()
  create(@Body() dto: CreateLegalEntityDataDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateLegalEntityDataDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}