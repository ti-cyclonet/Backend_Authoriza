import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateSubmenuDto } from './create-submenu.dto';

export class CreateMenuoptionDto {
  @IsString()
  @MinLength(1)
  strName: string;

  @IsString()
  strDescription: string;

  @IsString()
  @IsOptional()
  strUrl?: string;

  @IsString()
  @IsOptional()
  strIcon?: string;

  @IsIn(['main_menu', 'submenu_n1', 'submenu_n2'])
  strType: string;

  @IsNumber()
  @IsOptional()
  ingOrder: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubmenuDto)
  strSubmenus?: CreateSubmenuDto[];
}