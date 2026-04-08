import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  SendEmailDto,
  ContactFormDto,
} from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Plantillas ──

  @Post('templates')
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Get('templates')
  findAllTemplates() {
    return this.notificationsService.findAllTemplates();
  }

  @Get('templates/:code')
  findTemplateByCode(@Param('code') code: string) {
    return this.notificationsService.findTemplateByCode(code);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  // ── Envío ──

  @Post('send')
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('contact')
  sendContactForm(@Body() dto: ContactFormDto) {
    return this.notificationsService.sendContactForm(dto.name, dto.email, dto.subject, dto.message);
  }

  // ── Seed ──

  @Post('seed')
  async seedTemplates() {
    await this.notificationsService.seedDefaultTemplates();
    await this.notificationsService.seedContactConfirmationTemplate();
    return { message: 'Templates seeded successfully' };
  }
}
