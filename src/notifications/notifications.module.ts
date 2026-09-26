import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { InternalOrAdminGuard } from './guards/internal-or-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate]), MailModule, JwtModule.register({ secret: jwtConstants.secret })],
  controllers: [NotificationsController],
  providers: [NotificationsService, InternalOrAdminGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
