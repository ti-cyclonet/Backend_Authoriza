import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
