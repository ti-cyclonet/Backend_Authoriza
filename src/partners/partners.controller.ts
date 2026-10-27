import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { CATEGORIES, PLACEMENTS, PartnerOfferInput, PartnersService } from './partners.service';
import { EARNING_SOURCES, PartnerEarningInput, PartnerEarningsService } from './partner-earnings.service';

/**
 * Servicios recomendados (aliados).
 * - Las apps leen el catálogo (público, sin los enlaces de destino).
 * - Cada clic pasa por go/:id, que lo cuenta y redirige al aliado.
 * - El administrador de Authoriza arma el catálogo, ve los clics y registra
 *   los ingresos que pagan los aliados (bloque del dashboard).
 */
@Controller('partners')
export class PartnersController {
  constructor(
    private readonly service: PartnersService,
    private readonly earnings: PartnerEarningsService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Get('public')
  publicList(@Query('app') app?: string, @Query('placement') placement?: string) {
    return this.service.publicList(app, placement);
  }

  @Public()
  @Get('go/:id')
  async go(
    @Param('id') id: string,
    @Query('app') app: string,
    @Query('t') tenant: string,
    @Query('placement') placement: string,
    @Res() res: Response,
  ) {
    const url = await this.service.click(id, { app, tenant, placement });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.redirect(302, url);
  }

  @Get('options')
  @UseGuards(AdminAuthorizaGuard)
  options() {
    return { categories: CATEGORIES, placements: PLACEMENTS, earningSources: EARNING_SOURCES };
  }

  @Get()
  @UseGuards(AdminAuthorizaGuard)
  list() {
    return this.service.list();
  }

  // ── Ingresos por aliados ──
  @Get('earnings/summary')
  @UseGuards(AdminAuthorizaGuard)
  earningsSummary(@Query('month') month?: string) {
    return this.earnings.summary(month);
  }

  @Get('earnings')
  @UseGuards(AdminAuthorizaGuard)
  earningsList(@Query('month') month?: string) {
    return this.earnings.list(month);
  }

  @Post('earnings')
  @UseGuards(AdminAuthorizaGuard)
  earningsCreate(@Body() body: PartnerEarningInput, @Req() req: any) {
    const token = String(req.headers?.authorization || '').replace(/^Bearer /, '');
    let who: string | undefined;
    try { who = (this.jwt.decode(token) as any)?.email; } catch { who = undefined; }
    return this.earnings.create(body || {}, who);
  }

  @Delete('earnings/:id')
  @UseGuards(AdminAuthorizaGuard)
  earningsRemove(@Param('id') id: string) {
    return this.earnings.remove(id);
  }

  @Get(':id/clicks')
  @UseGuards(AdminAuthorizaGuard)
  clicks(@Param('id') id: string) {
    return this.service.clicksOf(id);
  }

  @Post()
  @UseGuards(AdminAuthorizaGuard)
  create(@Body() body: PartnerOfferInput) {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminAuthorizaGuard)
  update(@Param('id') id: string, @Body() body: PartnerOfferInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminAuthorizaGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
