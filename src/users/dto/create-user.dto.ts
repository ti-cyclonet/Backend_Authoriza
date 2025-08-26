import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  strUserName: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  strPassword?: string;
}
