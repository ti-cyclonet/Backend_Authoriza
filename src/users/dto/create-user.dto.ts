
import { IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  strUserName: string;

  @IsString()
  @MinLength(6)
  strPassword: string;
}
