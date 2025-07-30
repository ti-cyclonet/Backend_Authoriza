import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
  IsInt,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConfigurationDto)
  configurations: CreateConfigurationDto[];
}
