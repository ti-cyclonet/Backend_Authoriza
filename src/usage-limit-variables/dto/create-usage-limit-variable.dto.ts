import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

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
}
