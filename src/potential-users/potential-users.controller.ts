import { Controller, Post, Get, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { PotentialUsersService } from './potential-users.service';
import { CreatePotentialUserDto } from './dto/create-potential-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Clientes potenciales (leads): invitados que compraron en el MarketPlace de
 * un negocio sin crear cuenta. El POST lo llama el backend de InOut al
 * recibir un pedido de invitado (sin sesión de usuario). Las consultas
 * exponen datos personales, así que exigen sesión y se limitan al negocio
 * (tenant) del token: antes eran públicas y listaban los de todos.
 */
@Controller('potential-users')
export class PotentialUsersController {
  constructor(private readonly potentialUsersService: PotentialUsersService) {}

  /** Un cliente (clienteInout) no debe ver los leads del negocio. */
  private tenantOf(req: any): string {
    const user = req.user;
    if (!user?.tenantId || user?.rol === 'clienteInout') {
      throw new ForbiddenException('No tienes acceso a los clientes potenciales.');
    }
    return user.tenantId;
  }

  @Post()
  async create(@Body() createPotentialUserDto: CreatePotentialUserDto) {
    return await this.potentialUsersService.create(createPotentialUserDto);
  }

  /** Clientes potenciales del negocio en sesión (módulo Usuarios de InOut). */
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@Request() req) {
    return await this.potentialUsersService.findBySourceTenant(this.tenantOf(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-source/:source')
  async findBySource(@Param('source') source: string, @Request() req) {
    return await this.potentialUsersService.findBySource(source, this.tenantOf(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    return await this.potentialUsersService.findByEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: number, @Request() req) {
    const lead = await this.potentialUsersService.findById(id);
    return lead && lead.sourceTenantId === this.tenantOf(req) ? lead : null;
  }
}
