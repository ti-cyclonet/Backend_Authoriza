import { Injectable, Logger, Optional } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PlatformCostsService } from '../platform-costs/platform-costs.service';

export interface MailUsageMeta {
  /** App del ecosistema que origina el correo (para repartir el costo de SES). */
  application?: string;
  tenantId?: string | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
    @Optional() private readonly platformCosts?: PlatformCostsService,
  ) {}

  async send(to: string, subject: string, html: string, meta?: MailUsageMeta): Promise<boolean> {
    try {
      await this.mailer.sendMail({ to, subject, html });
      this.logger.log(`Email sent to ${to} — "${subject}"`);
      this.platformCosts?.track({
        application: meta?.application || 'Authoriza',
        tenantId: meta?.tenantId || null,
        platform: 'SES',
        metric: 'emails',
        quantity: 1,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }
}
