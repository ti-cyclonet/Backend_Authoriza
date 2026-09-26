import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InternalOrAdminGuard } from './guards/internal-or-admin.guard';
import { ContactRateLimitGuard } from '../common/guards/contact-rate-limit.guard';
import { NotificationsService } from './notifications.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  SendEmailDto,
  ContactFormDto,
} from './dto/notification.dto';

/**
 * Envío de correos y plantillas: solo otros servicios del ecosistema (con
 * x-internal-key) o administradores de Authoriza. Antes era público: sin
 * sesión se podían enviar correos con las plantillas de CycloNet a
 * cualquier dirección y crear/borrar plantillas.
 * El formulario de contacto de las landings sigue público, con límite por IP.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Plantillas ──

  @Post('templates')
  @UseGuards(InternalOrAdminGuard)
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Get('templates')
  @UseGuards(InternalOrAdminGuard)
  findAllTemplates() {
    return this.notificationsService.findAllTemplates();
  }

  @Get('templates/:code')
  @UseGuards(InternalOrAdminGuard)
  findTemplateByCode(@Param('code') code: string) {
    return this.notificationsService.findTemplateByCode(code);
  }

  @Patch('templates/:id')
  @UseGuards(InternalOrAdminGuard)
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(InternalOrAdminGuard)
  deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  // ── Envío ──

  @Post('send')
  @UseGuards(InternalOrAdminGuard)
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('contact')
  @UseGuards(ContactRateLimitGuard)
  sendContactForm(@Body() dto: ContactFormDto) {
    return this.notificationsService.sendContactForm(dto.name, dto.email, dto.subject, dto.message);
  }

  // ── Seed ──

  @Post('seed')
  @UseGuards(InternalOrAdminGuard)
  async seedTemplates() {
    await this.notificationsService.seedDefaultTemplates();
    await this.notificationsService.seedContactConfirmationTemplate();
    return { message: 'Templates seeded successfully' };
  }
}
