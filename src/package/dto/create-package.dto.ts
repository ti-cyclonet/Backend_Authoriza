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
import { CreateUsageLimitVariableDto } from '../../usage-limit-variables/dto/create-usage-limit-variable.dto';

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

  @IsInt()
  @IsOptional()
  maxProducts?: number = 50;

  @IsInt()
  @IsOptional()
  maxUsers?: number = 1;

  @IsInt()
  @IsOptional()
  maxInvoices?: number = 100;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConfigDto)
  configurations?: RoleConfigDto[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUsageLimitVariableDto)
  usageLimitVariables?: CreateUsageLimitVariableDto[];
}
