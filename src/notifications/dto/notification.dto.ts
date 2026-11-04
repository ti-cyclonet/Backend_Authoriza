import { IsString, IsOptional, IsBoolean, MaxLength, IsEmail, Matches } from 'class-validator';

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

  /** Cliente (tenant) al que corresponde el envío, para medir consumo. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenantId?: string;
}

/** Solicitud del cotizador de la landing: el resumen va al cliente y a CycloNet. */
export class QuoteRequestDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  /** Referencia de la cotización, p. ej. CN-261023-AB12. */
  @Matches(/^CN-[A-Z0-9-]{4,30}$/)
  ref: string;

  @IsString()
  @MaxLength(200)
  title: string;

  /** Inversión aproximada en texto, p. ej. "$41 M – $47 M". */
  @IsString()
  @MaxLength(60)
  range: string;

  /** Resumen en texto plano (estimado, equipo, detalle y respuestas). */
  @IsString()
  @MaxLength(12000)
  summary: string;

  /** Enlace a la cotización; solo se incluye si es de cyclonet.com.co. */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  link?: string;
}

/** Postulación de «Trabaja con nosotros» (multipart: estos campos + el PDF «cv»). */
export class JobApplicationDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsEmail()
  @MaxLength(255)
  correo: string;

  @IsString()
  @MaxLength(30)
  celular: string;

  @IsString()
  @MaxLength(80)
  area: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  experiencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ciudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  enlace?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  sobre?: string;
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
