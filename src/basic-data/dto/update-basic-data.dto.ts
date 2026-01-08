import { PartialType } from '@nestjs/mapped-types';
import { CreateBasicDataDto } from './create-basic-data.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateBasicDataDto extends PartialType(CreateBasicDataDto) {
  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;
}