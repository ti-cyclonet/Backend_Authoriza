import { Controller, Get } from '@nestjs/common';
import { DocumentTypesService } from './document-types.service';

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get()
  findAll() {
    return this.documentTypesService.findAll();
  }
}