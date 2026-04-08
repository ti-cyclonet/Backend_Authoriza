import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async send(to: string, subject: string, html: string): Promise<boolean> {
    try {
      await this.mailer.sendMail({ to, subject, html });
      this.logger.log(`Email sent to ${to} — "${subject}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }
}
