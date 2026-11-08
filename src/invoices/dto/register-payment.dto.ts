import { IsNotEmpty, IsNumber, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPaymentDto {
  @IsNotEmpty()
  @IsDateString()
  paymentDate: string;

  @IsNotEmpty()
  @IsNumber()
  paidAmount: number;

  @IsOptional()
  @IsString()
  paymentVoucherUrl?: string;

  /** Referencia del soporte (la lee el OCR de FactoNet o la escribe quien paga). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @IsOptional()
  notes?: string;
}
