import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreatePotentialUserDto {
  @IsEmail()
  email: string;

  @IsString()
  sourceApplication: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  name?: string;
}