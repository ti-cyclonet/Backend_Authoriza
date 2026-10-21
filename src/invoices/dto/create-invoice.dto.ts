import { IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsNumber()
  value: number;

  @IsNotEmpty()
  @IsDateString()
  issueDate: string;

  @IsNotEmpty()
  @IsDateString()
  expirationDate: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsNotEmpty()
  userId: string;

  /** Cargos que no son el plan (adicionales de otras apps): qué se cobra. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  concept?: string;

  /** Periodo del servicio que se cobra (FactoNet lo muestra en la factura). */
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}