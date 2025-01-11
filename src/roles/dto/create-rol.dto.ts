import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRolDto {
  @IsString()
  @MinLength(1)
  strName: string;

  @IsString()
  strDescription1: string;

  @IsString()
  @IsOptional()
  strDescription2?: string;

  @IsString()
  strIdApplication: string;
}
