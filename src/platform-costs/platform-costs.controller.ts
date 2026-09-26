import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { AdminAuthorizaGuard } from './admin-authoriza.guard';
import { PlatformCostsService, UsageEventInput } from './platform-costs.service';
import { PlatformCostSettings } from './entities/platform-cost.entities';

@Controller('platform-costs')
export class PlatformCostsController {
  constructor(private readonly service: PlatformCostsService) {}

  /** Las apps del ecosistema reportan su consumo (x-internal-key). Acepta un evento o una lista. */
  @Post('usage')
  @UseGuards(InternalOrAdminGuard)
  recordUsage(@Body() body: UsageEventInput | { events: UsageEventInput[] }) {
    const events = Array.isArray((body as any)?.events) ? (body as any).events : [body];
    return this.service.recordUsage(events.slice(0, 500));
  }

  @Get('dashboard')
  @UseGuards(AdminAuthorizaGuard)
  dashboard(@Query('month') month?: string) {
    return this.service.dashboard(month);
  }

  @Get('settings')
  @UseGuards(AdminAuthorizaGuard)
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @UseGuards(AdminAuthorizaGuard)
  updateSettings(@Body() dto: Partial<PlatformCostSettings>) {
    return this.service.updateSettings(dto);
  }

  @Post('sync')
  @UseGuards(AdminAuthorizaGuard)
  sync() {
    return this.service.sync();
  }
}
