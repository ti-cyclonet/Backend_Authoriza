import { Body, Controller, Delete, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthorizaGuard } from '../platform-costs/admin-authoriza.guard';
import { QuoterService } from './quoter.service';

/**
 * Cotizador de la landing de CycloNet. La landing lee los parámetros
 * (público, por /api/auth/quoter/config en nginx) y el administrador de
 * Authoriza los edita.
 */
@Controller('quoter')
export class QuoterController {
  constructor(private readonly service: QuoterService, private readonly jwt: JwtService) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  @Put('config')
  @UseGuards(AdminAuthorizaGuard)
  saveConfig(@Body() body: any, @Req() req: any) {
    const token = String(req.headers?.authorization || '').replace(/^Bearer /, '');
    let who: string | undefined;
    try { who = (this.jwt.decode(token) as any)?.email; } catch { who = undefined; }
    return this.service.saveConfig(body, who);
  }

  @Delete('config')
  @UseGuards(AdminAuthorizaGuard)
  resetConfig() {
    return this.service.resetConfig();
  }

  /** Costo por hora y tarifa de venta de cada especialidad. */
  @Get('costs')
  @UseGuards(AdminAuthorizaGuard)
  costs() {
    return this.service.costs();
  }
}
