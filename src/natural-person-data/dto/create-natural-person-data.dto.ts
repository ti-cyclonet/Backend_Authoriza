import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateNaturalPersonDataDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  secondName?: string;

  @IsString()
  firstSurname: string;

  @IsOptional()
  @IsString()
  secondSurname?: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  maritalStatus: string;

  @IsString()
  sex: string;

  @IsString()
  basicDataId: string;
}