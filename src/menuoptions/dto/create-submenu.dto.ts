import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateSubmenuDto {
  @IsString()
  strName: string;

  @IsOptional()
  @IsString()
  strDescription?: string;

  @IsOptional()
  @IsString()
  strUrl?: string;

  @IsOptional()
  @IsString()
  strIcon?: string;

  @IsOptional()
  @IsString()
  strType?: string;

  @IsOptional()
  @IsNumber()
  ingOrder?: number;
}
console.log('✅ CreateSubmenuDto usado en validación');