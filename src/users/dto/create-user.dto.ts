import { IsString, IsOptional, MinLength, IsBoolean, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  strUserName: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  strPassword?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  strCompanyCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrincipal?: boolean;
}
