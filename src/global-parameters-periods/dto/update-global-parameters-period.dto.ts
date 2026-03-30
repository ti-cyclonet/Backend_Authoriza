import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';

export class UpdateGlobalParametersPeriodDto {
  @IsOptional()
  @IsString()
  value?: string;
  
  @IsOptional()
  @IsString()
  status?: string;
  
  @IsOptional()
  @IsBoolean()
  showInDocs?: boolean;
  
  @IsOptional()
  @IsString()
  @IsIn(['add', 'subtract'])
  operationType?: 'add' | 'subtract';
}
