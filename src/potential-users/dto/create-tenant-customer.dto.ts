import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Cliente rápido que registra el propio negocio desde InOut (venta directa o
 * pedido): basta el nombre; teléfono, correo, documento y dirección son
 * opcionales. Queda como cliente potencial del tenant de la sesión.
 */
export class CreateTenantCustomerDto {
  @IsString()
  @MinLength(2, { message: 'Escribe el nombre del cliente.' })
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido.' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
