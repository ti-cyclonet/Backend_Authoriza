import { IsString, IsOptional } from 'class-validator';

export class CreateCustomerParameterDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  dataType: string;
}

export class UpdateCustomerParameterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}