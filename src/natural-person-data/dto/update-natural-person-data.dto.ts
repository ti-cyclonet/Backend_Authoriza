import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateNaturalPersonDataDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  secondName?: string;

  @IsOptional()
  @IsString()
  firstSurname?: string;

  @IsOptional()
  @IsString()
  secondSurname?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  sex?: string;
}