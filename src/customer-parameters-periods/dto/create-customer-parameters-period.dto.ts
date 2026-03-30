import { IsString, IsOptional } from 'class-validator';

export class CreateCustomerParametersPeriodDto {
  @IsString()
  customerParameterId: string;
  
  @IsString()
  periodId: string;
  
  @IsString()
  value: string;
  
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}
