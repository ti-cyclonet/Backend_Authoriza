import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { MailModule } from '../mail/mail.module';
import { Testimonial } from './testimonial.entity';
import { TestimonialsService } from './testimonials.service';
import { TestimonialsController } from './testimonials.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Testimonial]), JwtModule.register({ secret: jwtConstants.secret }), MailModule],
  controllers: [TestimonialsController],
  providers: [TestimonialsService, AdminAuthorizaGuard, InternalOrAdminGuard],
})
export class TestimonialsModule {}
