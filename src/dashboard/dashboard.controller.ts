import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { DateRangeDto } from './dto/date-range.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats();
  }

  @Get('invoices/stats')
  async getInvoiceStatsByDateRange(@Query() dateRange: DateRangeDto) {
    return this.dashboardService.getInvoiceStatsByDateRange(dateRange);
  }

  @Get('recent-activity')
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Get('entity-codes')
  async getEntityCodes() {
    return this.dashboardService.getEntityCodes();
  }
}