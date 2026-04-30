import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageLimitVariable } from './entities/usage-limit-variable.entity';
import { UsageLimitVariablesService } from './usage-limit-variables.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageLimitVariable])],
  providers: [UsageLimitVariablesService],
  exports: [UsageLimitVariablesService],
})
export class UsageLimitVariablesModule {}
