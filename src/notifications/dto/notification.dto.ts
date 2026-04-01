import { IsString, IsOptional, IsBoolean } from 'class-validator';

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
  name: string;

  @IsString()
  email: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;
}
