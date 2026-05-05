import { PartialType } from '@nestjs/mapped-types';
import { CreateUsageLimitVariableDto } from './create-usage-limit-variable.dto';

export class UpdateUsageLimitVariableDto extends PartialType(
  CreateUsageLimitVariableDto,
) {}
