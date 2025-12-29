import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PeriodService } from './period.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { GlobalParametersPeriodsService } from '../global-parameters-periods/global-parameters-periods.service';
import { CreateGlobalParametersPeriodDto } from '../global-parameters-periods/dto/create-global-parameters-period.dto';

@Controller('periods')
export class PeriodController {
  constructor(
    private readonly periodService: PeriodService,
    private readonly globalParametersPeriodsService: GlobalParametersPeriodsService
  ) {}

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

  @Post(':id/parameters')
  async addParameter(@Param('id') periodId: string, @Body() body: any) {
    try {
      console.log('Received body:', JSON.stringify(body, null, 2));
      
      // Extraer el primer parámetro del array si viene en formato { parametros: [...] }
      const parameterData = body.parametros ? body.parametros[0] : body;
      console.log('Parameter data:', JSON.stringify(parameterData, null, 2));
      
      const dto: CreateGlobalParametersPeriodDto = {
        globalParameterId: parameterData.globalParameterId || parameterData.parametroId,
        periodId: periodId,
        value: parameterData.value || parameterData.valor,
        status: parameterData.status || 'ACTIVE'
      };
      
      console.log('Final DTO:', JSON.stringify(dto, null, 2));
      
      return await this.globalParametersPeriodsService.create(dto);
    } catch (error) {
      console.error('Error adding parameter to period:', error);
      throw error;
    }
  }

  @Get(':id/parameters')
  async getParametersByPeriod(@Param('id') periodId: string) {
    return this.globalParametersPeriodsService.findByPeriod(periodId);
  }
}
