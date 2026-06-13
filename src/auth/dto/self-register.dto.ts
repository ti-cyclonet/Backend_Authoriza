import { IsString, IsNotEmpty, IsOptional, IsEmail, IsIn } from 'class-validator';

export class SelfRegisterPrincipalDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsIn(['N', 'J'])
  personType: string;

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Persona Natural
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() secondName?: string;
  @IsString() @IsOptional() firstSurname?: string;
  @IsString() @IsOptional() secondSurname?: string;
  @IsString() @IsOptional() birthdate?: string;
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() civilStatus?: string;

  // Persona Jurídica
  @IsString() @IsOptional() businessName?: string;
  @IsString() @IsOptional() website?: string;
  @IsString() @IsOptional() contactName?: string;
  @IsString() @IsOptional() contactEmail?: string;
}

export class SelfRegisterDependentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsOptional() secondName?: string;
  @IsString() @IsNotEmpty() firstSurname: string;
  @IsString() @IsOptional() secondSurname?: string;
  @IsString() @IsOptional() documentType?: string;
  @IsString() @IsOptional() documentNumber?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() birthdate?: string;
}

export class SelfRegisterDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsOptional()
  businessSector?: string;

  @IsNotEmpty()
  principal: SelfRegisterPrincipalDto;

  @IsNotEmpty()
  dependent: SelfRegisterDependentDto;
}

export class VerifyRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
