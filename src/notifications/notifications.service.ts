import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { MailService } from '../mail/mail.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  SendEmailDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly mailService: MailService,
  ) {}

  // ── Plantillas CRUD ──

  async createTemplate(dto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    return this.templateRepo.save(this.templateRepo.create(dto));
  }

  async findAllTemplates(): Promise<EmailTemplate[]> {
    return this.templateRepo.find({ order: { code: 'ASC' } });
  }

  async findTemplateByCode(code: string): Promise<EmailTemplate> {
    const tpl = await this.templateRepo.findOne({ where: { code, isActive: true } });
    if (!tpl) throw new NotFoundException(`Template "${code}" not found`);
    return tpl;
  }

  async updateTemplate(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const tpl = await this.templateRepo.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    Object.assign(tpl, dto);
    return this.templateRepo.save(tpl);
  }

  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Template not found');
  }

  // ── Envío de correo ──

  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; message: string }> {
    const template = await this.findTemplateByCode(dto.templateCode);
    const html = this.replaceVariables(template.htmlBody, dto.variables || {});
    const subject = this.replaceVariables(template.subject, dto.variables || {});

    const success = await this.mailService.send(dto.to, subject, html);
    return {
      success,
      message: success ? 'Email sent successfully' : 'Failed to send email',
    };
  }

  async sendByTemplate(
    templateCode: string,
    to: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const result = await this.sendEmail({ to, templateCode, variables });
    if (!result.success) {
      this.logger.warn(`Notification "${templateCode}" to ${to} failed`);
    }
  }

  // ── Seed de plantillas iniciales ──

  async seedDefaultTemplates(): Promise<void> {
    const contractTpl = await this.templateRepo.findOne({ where: { code: 'CONTRACT_ACTIVATED' } });
    if (!contractTpl) {
      await this.templateRepo.save(
        this.templateRepo.create({
          code: 'CONTRACT_ACTIVATED',
          subject: '¡Tu contrato {{contractCode}} ha sido activado! - CycloNet S.A.S.',
          htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:30px;text-align:center;">
        <img src="https://res.cloudinary.com/dn8ki4idz/image/upload/v1774391294/branding/cyclonet_logo.png" alt="CycloNet" style="max-width:180px;margin-bottom:10px;" />
        <p style="color:#bbdefb;margin:5px 0 0;font-size:14px;">Soluciones tecnológicas a tu medida</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <h2 style="color:#1a237e;margin:0 0 15px;">¡Contrato Activado!</h2>
        <p style="color:#333;line-height:1.6;">Estimado(a) <strong>{{customerName}}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Nos complace informarle que su contrato <strong>{{contractCode}}</strong> ha sido <span style="color:#2e7d32;font-weight:bold;">activado exitosamente</span>.</p>
        <table width="100%" style="margin:20px 0;border-collapse:collapse;">
          <tr><td style="padding:8px 12px;background:#e3f2fd;font-weight:bold;color:#1a237e;">Paquete</td><td style="padding:8px 12px;background:#e3f2fd;">{{packageName}}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#1a237e;">Fecha de inicio</td><td style="padding:8px 12px;">{{startDate}}</td></tr>
          <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;color:#1a237e;">Fecha de fin</td><td style="padding:8px 12px;background:#f5f5f5;">{{endDate}}</td></tr>
        </table>
        <p style="color:#333;line-height:1.6;">Ya puede hacer uso de todos los servicios contratados con <strong>CycloNet S.A.S.</strong></p>
      </td>
    </tr>
    <tr>
      <td style="background:#1a237e;padding:20px;text-align:center;">
        <p style="color:#bbdefb;margin:0;font-size:12px;">&copy; {{year}} CycloNet S.A.S. — Todos los derechos reservados</p>
        <p style="color:#bbdefb;margin:5px 0 0;font-size:12px;">www.cyclonet.com.co</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        }),
      );
      this.logger.log('CONTRACT_ACTIVATED template seeded');
    }

    const contractReadyTpl = await this.templateRepo.findOne({ where: { code: 'CONTRACT_READY' } });
    if (!contractReadyTpl) {
      await this.templateRepo.save(
        this.templateRepo.create({
          code: 'CONTRACT_READY',
          subject: 'Tu contrato {{contractCode}} está listo para revisión - CycloNet S.A.S.',
          htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:30px;text-align:center;">
        <img src="https://res.cloudinary.com/dn8ki4idz/image/upload/v1774391294/branding/cyclonet_logo.png" alt="CycloNet" style="max-width:180px;margin-bottom:10px;" />
        <p style="color:#bbdefb;margin:5px 0 0;font-size:14px;">Soluciones tecnológicas a tu medida</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <h2 style="color:#1a237e;margin:0 0 15px;">Tu contrato está listo</h2>
        <p style="color:#333;line-height:1.6;">Estimado(a) <strong>{{customerName}}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Tu contrato <strong>{{contractCode}}</strong> ha sido preparado y está disponible para tu revisión.</p>
        <table width="100%" style="margin:20px 0;border-collapse:collapse;">
          <tr><td style="padding:8px 12px;background:#e3f2fd;font-weight:bold;color:#1a237e;">Paquete</td><td style="padding:8px 12px;background:#e3f2fd;">{{packageName}}</td></tr>
        </table>
        <div style="text-align:center;margin:28px 0;">
          <a href="{{pdfUrl}}" style="display:inline-block;background:linear-gradient(135deg,#1565c0,#1e88e5);color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-size:16px;font-weight:700;">Ver contrato</a>
        </div>
        <p style="color:#888;font-size:12px;text-align:center;margin:0;">Por favor revisa el contrato. Tu cuenta será activada una vez el administrador complete el proceso.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#1a237e;padding:20px;text-align:center;">
        <p style="color:#bbdefb;margin:0;font-size:12px;">&copy; {{year}} CycloNet S.A.S. — Todos los derechos reservados</p>
        <p style="color:#bbdefb;margin:5px 0 0;font-size:12px;">www.cyclonet.com.co</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        }),
      );
      this.logger.log('CONTRACT_READY template seeded');
    }

    const verifyTpl = await this.templateRepo.findOne({ where: { code: 'USER_VERIFICATION' } });
    if (!verifyTpl) {
      await this.templateRepo.save(
        this.templateRepo.create({
          code: 'USER_VERIFICATION',
          subject: 'Confirma tu correo electrónico - InOut by CycloNet',
          htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#0d47a1,#e65100);padding:30px;text-align:center;">
        <img src="https://res.cloudinary.com/dn8ki4idz/image/upload/v1774391294/branding/cyclonet_logo.png" alt="CycloNet" style="max-width:160px;margin-bottom:10px;" />
        <h1 style="margin:8px 0 4px;font-size:32px;font-weight:800;letter-spacing:2px;"><span style="color:#64b5f6;">In</span><span style="color:#ffb74d;">Out</span></h1>
        <p style="color:rgba(255,255,255,0.85);margin:0;font-size:13px;">Sistema de gestión de inventario y ventas</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <h2 style="color:#0d47a1;margin:0 0 16px;font-size:20px;">Confirma tu correo electrónico</h2>
        <p style="color:#333;line-height:1.7;margin:0 0 12px;">Hola <strong>{{customerName}}</strong>,</p>
        <p style="color:#333;line-height:1.7;margin:0 0 24px;">Tu correo electrónico ha sido registrado en <strong>CycloNet S.A.S.</strong> para acceder a la aplicación <strong><span style="color:#1565c0;">In</span><span style="color:#e65100;">Out</span></strong>. Para activar tu cuenta y comenzar a gestionar tu inventario, haz clic en el botón:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="{{verificationUrl}}" style="display:inline-block;background:linear-gradient(135deg,#1565c0,#e65100);color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-size:16px;font-weight:700;">Verificar mi correo</a>
        </div>
        <p style="color:#888;font-size:12px;text-align:center;margin:0 0 8px;">Este enlace es válido por <strong>24 horas</strong>.</p>
        <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Si no solicitaste este registro, puedes ignorar este mensaje.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#0d47a1;padding:20px 32px;">
        <p style="color:#bbdefb;margin:0;font-size:12px;text-align:center;">&copy; {{year}} CycloNet S.A.S. — Todos los derechos reservados</p>
        <p style="color:#bbdefb;margin:6px 0 0;font-size:12px;text-align:center;">www.cyclonet.com.co</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        }),
      );
      this.logger.log('USER_VERIFICATION template seeded');
    }
  }

  async seedContactConfirmationTemplate(): Promise<void> {
    const exists = await this.templateRepo.findOne({ where: { code: 'CONTACT_CONFIRMATION' } });
    if (exists) return;

    await this.templateRepo.save(
      this.templateRepo.create({
        code: 'CONTACT_CONFIRMATION',
        subject: '¡Gracias por contactarnos! - CycloNet S.A.S.',
        htmlBody: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:30px;text-align:center;">
        <img src="https://res.cloudinary.com/dn8ki4idz/image/upload/v1774391294/branding/cyclonet_logo.png" alt="CycloNet" style="max-width:180px;margin-bottom:10px;" />
        <p style="color:#bbdefb;margin:5px 0 0;font-size:14px;">Soluciones tecnológicas a tu medida</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <h2 style="color:#1a237e;margin:0 0 15px;">¡Gracias por preferirnos!</h2>
        <p style="color:#333;line-height:1.6;">Hola <strong>{{name}}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Hemos recibido tu mensaje y queremos agradecerte por ponerte en contacto con nosotros. Tu interés en <strong>CycloNet S.A.S.</strong> es muy importante para nuestro equipo.</p>
        <table width="100%" style="margin:20px 0;border-collapse:collapse;">
          <tr><td style="padding:10px 12px;background:#e3f2fd;border-radius:4px 4px 0 0;font-weight:bold;color:#1a237e;">Asunto</td><td style="padding:10px 12px;background:#e3f2fd;border-radius:4px 4px 0 0;">{{subject}}</td></tr>
          <tr><td style="padding:10px 12px;font-weight:bold;color:#1a237e;">Tu mensaje</td><td style="padding:10px 12px;color:#555;">{{message}}</td></tr>
        </table>
        <p style="color:#333;line-height:1.6;">Nuestro equipo revisará tu solicitud y te responderá a la brevedad posible. El tiempo estimado de respuesta es de <strong>24 a 48 horas hábiles</strong>.</p>
        <p style="color:#333;line-height:1.6;">Mientras tanto, te invitamos a conocer más sobre nuestras soluciones visitando <a href="https://www.cyclonet.com.co" style="color:#0d47a1;text-decoration:none;font-weight:bold;">www.cyclonet.com.co</a></p>
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
        <p style="color:#666;font-size:13px;line-height:1.5;">Si necesitas comunicarte con nosotros de forma inmediata, puedes escribirnos a <a href="mailto:ti.cyclonet@hotmail.com" style="color:#0d47a1;">ti.cyclonet@hotmail.com</a> o llamarnos al <strong>+57 314 414 4986</strong>.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#1a237e;padding:20px;text-align:center;">
        <p style="color:#bbdefb;margin:0;font-size:12px;">&copy; {{year}} CycloNet S.A.S. — Todos los derechos reservados</p>
        <p style="color:#bbdefb;margin:5px 0 0;font-size:12px;">Turbaco, Bolívar — Colombia</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
      }),
    );

    this.logger.log('Contact confirmation template seeded');
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce(
      (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value),
      text,
    );
  }

  async sendContactForm(name: string, email: string, subject: string, message: string): Promise<{ success: boolean; message: string }> {
    const to = 'ti.cyclonet@hotmail.com';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:20px;text-align:center;">
          <h2 style="color:#fff;margin:0;">Nuevo mensaje de contacto</h2>
          <p style="color:#bbdefb;margin:5px 0 0;font-size:13px;">CycloNet Landing Page</p>
        </div>
        <div style="padding:24px;">
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;">
          <p><strong>Mensaje:</strong></p>
          <p style="background:#f5f5f5;padding:12px;border-radius:6px;">${message}</p>
        </div>
        <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#888;">
          Enviado desde el formulario de contacto de cyclonet.com.co
        </div>
      </div>`;

    const success = await this.mailService.send(to, `[Contacto Web] ${subject}`, html);
    if (success) this.logger.log(`Contact form email sent from ${email}`);
    return { success, message: success ? 'Email sent successfully' : 'Failed to send email' };
  }

  private async sendContactConfirmation(name: string, email: string, subject: string, message: string): Promise<void> {
    const year = new Date().getFullYear().toString();
    try {
      await this.sendEmail({
        to: email,
        templateCode: 'CONTACT_CONFIRMATION',
        variables: { name, subject, message, year },
      });
    } catch {
      // Si la plantilla no existe aún, enviar un correo simple de confirmación
      const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
      await this.transporter.sendMail({
        from,
        to: email,
        subject: '¡Gracias por contactarnos! - CycloNet S.A.S.',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;">
          <h2 style="color:#1a237e;">¡Gracias por preferirnos, ${name}!</h2>
          <p>Hemos recibido tu mensaje y nuestro equipo te responderá en las próximas 24 a 48 horas hábiles.</p>
          <p>Atentamente,<br><strong>CycloNet S.A.S.</strong></p>
        </div>`,
      });
    }
  }
}
