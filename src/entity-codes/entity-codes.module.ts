import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityCode } from './entities/entity-code.entity';
import { EntityCodeService } from './services/entity-code.service';
import { EntityCodeInitService } from './services/entity-code-init.service';

@Module({
  imports: [TypeOrmModule.forFeature([EntityCode])],
  providers: [EntityCodeService, EntityCodeInitService],
  exports: [EntityCodeService]
})
export class EntityCodesModule {}