import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalParameterDto } from './create-global-parameter.dto';

export class UpdateGlobalParameterDto extends PartialType(CreateGlobalParameterDto) {}
