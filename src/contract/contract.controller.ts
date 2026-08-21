import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  Patch,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractService.create(dto);
  }

  @Post(':id/pdf')
  async uploadPDF(
    @Param('id') contractId: string,
    @Body() body: { pdfBuffer: string }
  ) {
    const pdfBuffer = Buffer.from(body.pdfBuffer, 'base64');
    const pdfUrl = await this.contractService.uploadContractPDF(contractId, pdfBuffer);
    return { pdfUrl };
  }

  @Public()
  @Get(':id/pdf/download')
  async downloadPDF(
    @Param('id') contractId: string,
    @Res() res: Response,
  ) {
    const contract = await this.contractService.findOne(contractId);
    if (!contract.pdfUrl) {
      res.status(404).json({ message: 'PDF not found for this contract' });
      return;
    }

    // Fetch PDF from Cloudinary and stream it
    const response = await fetch(contract.pdfUrl);
    if (!response.ok) {
      res.status(502).json({ message: 'Could not fetch PDF from storage' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `Contrato_${contract.code || contractId}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Patch(':id/sign')
  async signContract(@Param('id') contractId: string) {
    return this.contractService.signContract(contractId);
  }

  @Post(':id/sign-client')
  async signAsClient(
    @Param('id') contractId: string,
    @Body() body: { signedBy: string; userId?: string },
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || 'unknown';
    const userId = body.userId || req.user?.id || null;
    return this.contractService.signAsClient(contractId, body.signedBy, ip, userId);
  }

  @Post(':id/sign-admin')
  async signAsAdmin(
    @Param('id') contractId: string,
    @Body() body: { signedBy: string; userId?: string },
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || 'unknown';
    const userId = body.userId || req.user?.id || null;
    return this.contractService.signAsAdmin(contractId, body.signedBy, ip, userId);
  }

  @Get(':id/signatures')
  async getSignatures(@Param('id') contractId: string) {
    return this.contractService.getSignatures(contractId);
  }

  @Patch(':id/issue')
  async issueContract(@Param('id') contractId: string) {
    return this.contractService.issueContract(contractId);
  }

  @Get('active')
  findActive() {
    return this.contractService.findActive();
  }

  @Get('validate-prefix/:codePrefix')
  async validateCodePrefix(@Param('codePrefix') codePrefix: string) {
    try {
      await this.contractService.validateCodePrefixPublic(codePrefix);
      return { isAvailable: true };
    } catch (error) {
      return { isAvailable: false, message: error.message };
    }
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.contractService.findByUser(userId);
  }

  @Public()
  @Get('tenant/:tenantId/limits')
  findTenantLimits(
    @Param('tenantId') tenantId: string,
    @Query('application') application?: string,
  ) {
    return this.contractService.findTenantLimits(tenantId, application);
  }

  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.contractService.findByTenant(tenantId);
  }

  @Get('package/:packageId')
  findByPackage(@Param('packageId') packageId: string) {
    return this.contractService.findByPackage(packageId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.contractService.findAll(paginationDto);
  }

  @Patch(':id/activate')
  activateContract(@Param('id') id: string) {
    return this.contractService.activateContract(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.contractService.updateStatus(id, body.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contractService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractService.remove(id);
  }
}
