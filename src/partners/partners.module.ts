import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { PartnerClick, PartnerEarning, PartnerOffer } from './partner-offer.entity';
import { PartnersService } from './partners.service';
import { PartnerEarningsService } from './partner-earnings.service';
import { PartnersController } from './partners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerOffer, PartnerClick, PartnerEarning]), JwtModule.register({ secret: jwtConstants.secret })],
  controllers: [PartnersController],
  providers: [PartnersService, PartnerEarningsService, AdminAuthorizaGuard],
})
export class PartnersModule {}
