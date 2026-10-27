import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { CATEGORIES, PLACEMENTS, PartnerOfferInput, PartnersService } from './partners.service';

/**
 * Servicios recomendados (aliados).
 * - Las apps leen el catálogo (público, sin los enlaces de destino).
 * - Cada clic pasa por go/:id, que lo cuenta y redirige al aliado.
 * - El administrador de Authoriza arma el catálogo y ve los clics.
 */
@Controller('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

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
    return { categories: CATEGORIES, placements: PLACEMENTS };
  }

  @Get()
  @UseGuards(AdminAuthorizaGuard)
  list() {
    return this.service.list();
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
