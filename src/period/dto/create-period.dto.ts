import { IsString, IsDateString } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;
}
