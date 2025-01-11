import { IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  strName: string;

  @IsString()
  strDescription: string;

  @IsString()
  @IsOptional()
  strUrlImage?: string;

  @IsString()
  @IsOptional()
  strSlug?: string;
}
