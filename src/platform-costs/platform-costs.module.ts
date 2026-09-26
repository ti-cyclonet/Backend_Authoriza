import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { AdminAuthorizaGuard } from './admin-authoriza.guard';
import { PlatformCostsController } from './platform-costs.controller';
import { PlatformCostsService } from './platform-costs.service';
import {
  PlatformCostDaily, PlatformCostSettings, PlatformSnapshot, PlatformUsageDaily,
} from './entities/platform-cost.entities';

/** Global para que cualquier módulo de Authoriza pueda registrar consumo (p. ej. correos). */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformUsageDaily, PlatformCostDaily, PlatformSnapshot, PlatformCostSettings]),
    JwtModule.register({ secret: jwtConstants.secret }),
  ],
  controllers: [PlatformCostsController],
  providers: [PlatformCostsService, InternalOrAdminGuard, AdminAuthorizaGuard],
  exports: [PlatformCostsService],
})
export class PlatformCostsModule {}
