import { Body, Controller, Get, Headers, HttpCode, Module, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { jwtConstants } from '../auth/constants';
import { Public } from '../auth/decorators/public.decorator';
import { InternalOrAdminGuard } from '../notifications/guards/internal-or-admin.guard';
import { ContractModule } from '../contract/contract.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EinvoiceIssuer } from './entities/einvoice-issuer.entity';
import { EinvoiceResolution } from './entities/einvoice-resolution.entity';
import { EinvoiceDocument } from './entities/einvoice-document.entity';
import { ContractAddon } from './entities/contract-addon.entity';
import { CreditNoteInput, EinvoicingService, IssueInput } from './einvoicing.service';
import { einvoicingCatalog } from './addon-plans';

/**
 * Facturación electrónica. Lo usan otros servicios del ecosistema (InOut, y
 * FactoNet para las facturas de CycloNet) con la clave interna, o un
 * administrador de Authoriza. El negocio llega siempre a través de su app,
 * que ya filtró su tenant.
 */
@Controller('einvoicing')
@UseGuards(InternalOrAdminGuard)
export class EinvoicingController {
  constructor(
    private readonly service: EinvoicingService,
    @InjectRepository(ContractAddon) private readonly addons: Repository<ContractAddon>,
  ) {}

  @Get('catalog')
  catalog() {
    return einvoicingCatalog();
  }

  @Get('tenants/:tenantId/status')
  status(@Param('tenantId') tenantId: string) {
    return this.service.status(tenantId);
  }

  @Post('tenants/:tenantId/addon')
  requestAddon(@Param('tenantId') tenantId: string, @Body() body: { tier: string; acceptTerms: boolean; requestedBy: string; ip?: string }) {
    return this.service.requestAddon(tenantId, body);
  }

  @Post('tenants/:tenantId/addon/cancel')
  cancelAddon(@Param('tenantId') tenantId: string) {
    return this.service.cancelAddon(tenantId);
  }

  @Put('tenants/:tenantId/issuer')
  saveIssuer(@Param('tenantId') tenantId: string, @Body() body: any) {
    return this.service.saveIssuer(tenantId, body);
  }

  @Post('tenants/:tenantId/resolutions')
  addResolution(@Param('tenantId') tenantId: string, @Body() body: any) {
    return this.service.addResolution(tenantId, body);
  }

  @Get('tenants/:tenantId/documents')
  documents(@Param('tenantId') tenantId: string, @Query('sourceApp') sourceApp: string, @Query('sourceId') sourceId: string) {
    return this.service.documentsFor(tenantId, sourceApp, sourceId);
  }

  @Post('documents')
  async issue(@Body() body: IssueInput) {
    return this.service.publicDocument(await this.service.issue(body));
  }

  @Post('credit-notes')
  async creditNote(@Body() body: CreditNoteInput) {
    const doc = await this.service.creditNote(body);
    return doc ? this.service.publicDocument(doc) : null;
  }

  /** CycloNet: negocios que pidieron o tienen el complemento (para gestionarlos y avisarles). */
  @Get('addons')
  listAddons(@Query('status') status?: string) {
    const statuses = status ? status.split(',') : ['SOLICITADO', 'ACTIVO'];
    return this.addons.find({ where: { code: 'EINVOICING', status: In(statuses as any) }, order: { requestedAt: 'DESC' } });
  }
}

/** Notificaciones del proveedor tecnológico (las valida el adaptador del proveedor). */
@Controller('einvoicing')
export class EinvoicingWebhookController {
  constructor(private readonly service: EinvoicingService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Headers() headers: Record<string, string | undefined>, @Body() body: unknown) {
    return this.service.handleWebhook(headers, body);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([EinvoiceIssuer, EinvoiceResolution, EinvoiceDocument, ContractAddon]),
    ContractModule,
    NotificationsModule,
    JwtModule.register({ secret: jwtConstants.secret }),
  ],
  controllers: [EinvoicingController, EinvoicingWebhookController],
  providers: [EinvoicingService, InternalOrAdminGuard],
  exports: [EinvoicingService, TypeOrmModule],
})
export class EinvoicingModule {}
