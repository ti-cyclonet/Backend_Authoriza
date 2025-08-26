import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
  IsInt,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoleConfigDto {
  @IsUUID()
  rolId: string;

  @IsNumber()
  totalAccount: number;

  @IsNumber()
  price: number;
}

class CreateConfigurationDto {
  @IsUUID()
  rolId: string;

  @IsInt()
  totalAccount: number;

  @IsInt()
  price: number;
}

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  configurations?: RoleConfigDto[];

  @IsOptional()
  @IsArray()
  images?: string[];
}
