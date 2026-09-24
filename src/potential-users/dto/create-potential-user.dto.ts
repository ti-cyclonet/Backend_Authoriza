import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreatePotentialUserDto {
  /** Opcional si viene teléfono (checkout de invitado sin correo). */
  @IsOptional()
  @IsEmail()
  email?: string;

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

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  sourceTenantId?: string;

  @IsOptional()
  @IsString()
  address?: string;
}