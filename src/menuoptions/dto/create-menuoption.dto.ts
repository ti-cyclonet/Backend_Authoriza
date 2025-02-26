import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @IsArray()
  @IsOptional()
  strSubmenus?: {
    strName: string;
    strDescription?: string;
    strUrl?: string;
    strIcon?: string;
    strType?: string;
    ingOrder?: number;
  }[];
}
