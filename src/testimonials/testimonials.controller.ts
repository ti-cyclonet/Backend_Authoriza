import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { TestimonialInput, TestimonialsService } from './testimonials.service';

/**
 * Opiniones de los usuarios del ecosistema.
 * - Las apps (InOut) las envían por la vía interna (x-internal-key) con los
 *   datos del negocio.
 * - El administrador de Authoriza las aprueba y elige dónde salen.
 * - Las landings leen las aprobadas (público).
 */
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly service: TestimonialsService, private readonly jwt: JwtService) {}

  @Public()
  @Get('public')
  publicList(@Query('site') site = 'inout') {
    return this.service.publicList(site);
  }

  @Post()
  @UseGuards(InternalOrAdminGuard)
  create(@Body() body: TestimonialInput) {
    return this.service.create(body);
  }

  /** ¿Puede el usuario dejar otra opinión? (invitación en la app) */
  @Get('user/:userId')
  @UseGuards(InternalOrAdminGuard)
  lastFor(@Param('userId') userId: string, @Query('application') application?: string) {
    return this.service.lastFor(userId, application || 'InOut');
  }

  @Get()
  @UseGuards(AdminAuthorizaGuard)
  list(@Query('status') status?: string, @Query('application') application?: string) {
    return this.service.list({ status, application });
  }

  @Get('stats')
  @UseGuards(AdminAuthorizaGuard)
  stats(@Query('application') application?: string) {
    return this.service.stats(application);
  }

  @Patch(':id')
  @UseGuards(AdminAuthorizaGuard)
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const token = String(req.headers?.authorization || '').replace(/^Bearer /, '');
    let who: string | undefined;
    try { who = (this.jwt.decode(token) as any)?.email; } catch { who = undefined; }
    return this.service.update(id, body || {}, who);
  }
}
