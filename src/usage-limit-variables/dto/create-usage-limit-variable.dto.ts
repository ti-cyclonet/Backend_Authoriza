import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsIn } from 'class-validator';

export class CreateUsageLimitVariableDto {
  @IsString()
  @IsNotEmpty()
  variableName: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsInt()
  @Min(0)
  maxValue: number;

  @IsString()
  @IsNotEmpty()
  targetApplication: string;

  @IsOptional()
  @IsString()
  @IsIn(['quantity', 'feature'])
  limitType?: string;
}
