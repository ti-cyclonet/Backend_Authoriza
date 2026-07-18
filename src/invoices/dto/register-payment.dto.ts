import { IsNotEmpty, IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

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

  @IsOptional()
  notes?: string;
}
