import { IsString, IsOptional, IsBoolean, MaxLength, IsEmail } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  code: string;

  @IsString()
  subject: string;

  @IsString()
  htmlBody: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendEmailDto {
  @IsString()
  to: string;

  @IsString()
  templateCode: string;

  @IsOptional()
  variables?: Record<string, string>;
}

export class ContactFormDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(5000)
  message: string;
}
