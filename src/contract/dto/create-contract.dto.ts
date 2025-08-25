import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ContractMode } from '../entities/contract.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { PaymentMode } from '../enums/payment-mode.enum';

export class CreateContractDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  packageId: string;

  @IsNumber()
  value: number;

  @IsEnum(PaymentMode, {
    message:
      'mode must be one of the following values: MONTHLY, SEMIANNUAL, ANNUAL',
  })
  mode: PaymentMode;

  @IsOptional()
  @IsNumber()
  payday?: number;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
