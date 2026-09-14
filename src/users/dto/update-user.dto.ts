
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateBasicDataDto } from '../../basic-data/dto/update-basic-data.dto';
import { UpdateNaturalPersonDataDto } from '../../natural-person-data/dto/update-natural-person-data.dto';
import { UpdateLegalEntityDataDto } from '../../legal-entity-data/dto/update-legal-entity-data.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  strUserName?: string;

  @IsOptional()
  @IsString()
  strStatus?: string;

  @IsOptional()
  @IsUUID()
  rolId?: string;

  @IsOptional()
  @IsUUID()
  basicDataId?: string;

  @IsOptional()
  @IsUUID()
  dependentOnId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBasicDataDto)
  basicData?: UpdateBasicDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNaturalPersonDataDto)
  naturalPersonData?: UpdateNaturalPersonDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLegalEntityDataDto)
  legalEntityData?: UpdateLegalEntityDataDto;
}

