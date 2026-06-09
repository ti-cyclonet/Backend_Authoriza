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

  @IsNumber()
  @IsOptional()
  price?: number = 0;

  @IsOptional()
  isBillable?: boolean = true;

  // Landing page fields
  @IsOptional()
  showInLanding?: boolean = false;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number = 0;

  @IsOptional()
  isHighlighted?: boolean = false;

  @IsString()
  @IsOptional()
  ctaLabel?: string = 'Elegir Plan';

  @IsString()
  @IsOptional()
  ctaType?: string = 'register';

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
