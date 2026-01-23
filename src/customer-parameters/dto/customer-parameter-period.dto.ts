import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateCustomerParameterPeriodDto {
  @IsString()
  customerId: string;

  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  parameterId: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  operationType?: string;
}

export class UpdateCustomerParameterPeriodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  operationType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}