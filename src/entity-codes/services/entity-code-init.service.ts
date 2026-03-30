import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityCodeService } from './entity-code.service';

@Injectable()
export class EntityCodeInitService implements OnModuleInit {
  constructor(private entityCodeService: EntityCodeService) {}

  async onModuleInit() {
    await this.entityCodeService.initializeEntityCodes();
  }
}