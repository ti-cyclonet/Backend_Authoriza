import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PeriodService } from './period.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PeriodValidationService } from './period-validation.service';
import { GlobalParametersPeriodsService } from '../global-parameters-periods/global-parameters-periods.service';
import { GlobalParametersService } from '../global-parameters/global-parameters.service';
import { CreateGlobalParametersPeriodDto } from '../global-parameters-periods/dto/create-global-parameters-period.dto';

@Controller('periods')
export class PeriodController {
  constructor(
    private readonly periodService: PeriodService,
    private readonly periodValidationService: PeriodValidationService,
    private readonly globalParametersPeriodsService: GlobalParametersPeriodsService,
    private readonly globalParametersService: GlobalParametersService
  ) {}

  @Post('subperiods')
  createSubperiod(@Body() dto: any) {
    return this.periodService.createSubperiod(dto);
  }

  @Post()
  create(@Body() dto: CreatePeriodDto) {
    return this.periodService.create(dto);
  }

  @Get()
  findAll() {
    return this.periodService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.periodService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.periodService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.periodService.remove(id);
  }

  @Delete(':id/force')
  forceRemove(@Param('id') id: string) {
    return this.periodService.forceRemove(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.periodService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.periodService.activate(id);
  }

  @Post(':id/parameters')
  async addParameter(@Param('id') periodId: string, @Body() body: any) {
    try {
      const parametersArray = body.parametros || [body];
      const results = [];
      
      for (const parameterData of parametersArray) {
        const dto: CreateGlobalParametersPeriodDto = {
          globalParameterId: parameterData.globalParameterId || parameterData.parametroId,
          periodId: periodId,
          value: parameterData.value || parameterData.valor,
          status: parameterData.status || 'ACTIVE'
        };
        
        const result = await this.globalParametersPeriodsService.create(dto);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/parameters')
  async getParametersByPeriod(@Param('id') periodId: string) {
    return this.globalParametersPeriodsService.findByPeriod(periodId);
  }

  @Get('active/current')
  async getActivePeriod() {
    return this.periodService.getActivePeriod();
  }

  @Get('active/tenant/:tenantId')
  async getActivePeriodByTenant(@Param('tenantId') tenantId: string) {
    const actualTenantId = tenantId === 'null' ? null : tenantId;
    return this.periodService.getActivePeriodByTenant(actualTenantId);
  }

  @Get('validation/check-active')
  async checkActivePeriodValidity() {
    const hasValid = await this.periodService.hasValidActivePeriod();
    return { hasValidActivePeriod: hasValid };
  }

  @Get('global-parameters')
  async getGlobalParameters() {
    return this.globalParametersService.findAll();
  }

  @Post('validation/validate-expiry')
  async validateExpiry() {
    await this.periodValidationService.validateActivePeriodExpiry();
    return { message: 'Validación de vigencia completada' };
  }
}
