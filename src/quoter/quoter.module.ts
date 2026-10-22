import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { QuoterSettings } from './quoter-settings.entity';
import { QuoterService } from './quoter.service';
import { QuoterController } from './quoter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuoterSettings]), JwtModule.register({ secret: jwtConstants.secret })],
  controllers: [QuoterController],
  providers: [QuoterService, AdminAuthorizaGuard],
})
export class QuoterModule {}
