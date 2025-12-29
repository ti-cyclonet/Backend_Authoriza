import { IsOptional, IsString, IsBoolean } from 'class-validator';

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
}
