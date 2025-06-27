import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsIn,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBasicDataDto } from 'src/basic-data/dto/create-basic-data.dto';

class UserDto {
  @IsString()
  @IsNotEmpty()
  strUserName: string;

  @IsString()
  @IsNotEmpty()
  strPassword: string;

  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  strStatus: string;
}

class BasicDataDto {
  @IsString()
  @IsIn(['N', 'J'])
  strPersonType: string;

  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  strStatus: string;
}

class NaturalPersonDto {
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

  @IsString()
  birthDate: string;

  @IsString()
  maritalStatus: string;

  @IsString()
  sex: string;
}

class LegalEntityDto {
  @IsString()
  businessName: string;

  @IsOptional()
  @IsString()
  webSite?: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  contactPhone: string;
}

export class CreateFullUserDto {
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto;

  @ValidateNested()
  @Type(() => CreateBasicDataDto)
  basicData: CreateBasicDataDto;

  @ValidateNested()
  @Type(() => NaturalPersonDto)
  @IsOptional()
  naturalPersonData?: NaturalPersonDto;

  @ValidateNested()
  @Type(() => LegalEntityDto)
  @IsOptional()
  legalEntityData?: LegalEntityDto;
}
