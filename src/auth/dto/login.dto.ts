import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'The application name is required.' })
  applicationName: string;

  @IsEmail({}, { message: 'The email is not valid.' })
  @IsNotEmpty({ message: 'The email is required.' })
  email: string;

  @IsNotEmpty({ message: 'The password is required' })
  @MinLength(6, { message: 'The password must be at least 6 characters long.' })
  password: string;
}
