
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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
}

