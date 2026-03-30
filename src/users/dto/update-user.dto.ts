
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';
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
  basicData?: UpdateBasicDataDto;

  @IsOptional()
  naturalPersonData?: UpdateNaturalPersonDataDto;

  @IsOptional()
  legalEntityData?: UpdateLegalEntityDataDto;
}

