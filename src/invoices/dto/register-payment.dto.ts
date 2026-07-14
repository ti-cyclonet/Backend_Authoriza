import { IsNotEmpty, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class RegisterPaymentDto {
  @IsNotEmpty()
  @IsDateString()
  paymentDate: string;

  @IsNotEmpty()
  @IsNumber()
  paidAmount: number;

  @IsOptional()
  notes?: string;
}
