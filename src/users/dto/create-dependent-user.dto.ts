import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class LegalEntityDto {
  @IsString()
  businessName: string;

  @IsOptional()
  @IsString()
  webSite?: string;

  @IsString()
  contactName: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  contactPhone: string;
}

/**
 * Crea un usuario dependiente (equipo interno) del tenant en sesión: pasa por
 * el mismo proceso de Authoriza que un usuario "full" (User + BasicData +
 * datos de persona), pero además queda vinculado como UserDependency del
 * principal y con un rol asignado, validado contra el cupo del plan
 * contratado. principalUserId y contractId NO viajan en el body: se derivan
 * del JWT del admin autenticado, para que no se pueda forjar dependencias
 * sobre otro tenant.
 */
export class CreateDependentUserDto {
  @IsEmail()
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

  @ValidateNested()
  @Type(() => NaturalPersonDto)
  @IsOptional()
  naturalPersonData?: NaturalPersonDto;

  @ValidateNested()
  @Type(() => LegalEntityDto)
  @IsOptional()
  legalEntityData?: LegalEntityDto;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}
