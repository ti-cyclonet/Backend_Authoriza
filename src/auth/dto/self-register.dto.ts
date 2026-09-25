import { IsString, IsNotEmpty, IsOptional, IsEmail, IsIn, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() civilStatus?: string;
}

export class SelfRegisterDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsOptional()
  businessSector?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SelfRegisterPrincipalDto)
  principal: SelfRegisterPrincipalDto;

  // Opcional: si no se envia, se registra una sola cuenta (el principal) con
  // todos los roles operativos (accountOwner, adminInout, adminInvoices,
  // userShotra). El dependiente se puede crear despues desde el modulo
  // "Usuarios" de la aplicacion. Se mantiene por compatibilidad con el
  // flujo anterior de dos cuentas (principal + operador).
  @IsOptional()
  @ValidateNested()
  @Type(() => SelfRegisterDependentDto)
  dependent?: SelfRegisterDependentDto;

  // Aceptación de los Términos del Servicio y de la autorización de
  // tratamiento de datos de CycloNet (se valida true en el servicio).
  @IsBoolean()
  acceptTerms: boolean;

  @IsBoolean()
  acceptHabeasData: boolean;

  @IsString()
  @IsNotEmpty()
  termsVersion: string;

  @IsString()
  @IsNotEmpty()
  habeasDataVersion: string;
}

export class VerifyRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
