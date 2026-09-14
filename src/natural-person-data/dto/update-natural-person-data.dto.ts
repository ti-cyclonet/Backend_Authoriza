import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  sex?: string;
}