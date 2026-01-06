import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Period } from './entities/period.entity';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PeriodValidationService } from './period-validation.service';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PeriodService {
  private readonly factonetUrl: string;

  constructor(
    @InjectRepository(Period)
    private readonly periodRepository: Repository<Period>,
    private entityCodeService: EntityCodeService,
    private configService: ConfigService,
    private periodValidationService: PeriodValidationService,
  ) {
    this.factonetUrl = this.configService.get<string>('FACTONET_API_URL') || 'http://localhost:3001';
  }

  async createSubperiod(dto: any) {
    // Generar código automático para subperíodo
    const code = await this.generateSubperiodCode(dto.parentPeriodId);
    
    const subperiod = this.periodRepository.create({
      name: dto.name,
      code,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: 'INACTIVE',
      parentPeriodId: dto.parentPeriodId
    });
    return this.periodRepository.save(subperiod);
  }

  private async generateSubperiodCode(parentPeriodId: string): Promise<string> {
    const parentPeriod = await this.findOne(parentPeriodId);
    let nextNumber = 1;
    let codeExists = true;
    
    while (codeExists) {
      const code = `${parentPeriod.code}-SP${nextNumber.toString().padStart(2, '0')}`;
      const existingPeriod = await this.periodRepository.findOne({
        where: { code }
      });
      
      if (!existingPeriod) {
        return code;
      }
      
      nextNumber++;
    }
    
    return `${parentPeriod.code}-SP${nextNumber.toString().padStart(2, '0')}`;
  }

  async create(dto: CreatePeriodDto) {
    // Generar código usando EntityCodeService
    const code = await this.entityCodeService.generateCode('Period');
    
    const period = this.periodRepository.create({
      ...dto,
      code,
      status: 'INACTIVE'
    });
    return this.periodRepository.save(period);
  }

  private async generatePeriodCode(): Promise<string> {
    return await this.entityCodeService.generateCode('Period');
  }

  findAll() {
    // Validar vigencia antes de retornar los periodos
    this.periodValidationService.validateActivePeriodExpiry();
    return this.periodRepository.find();
  }

  async findOne(id: string) {
    const period = await this.periodRepository.findOne({ where: { id } });
    if (!period) throw new NotFoundException(`Period ${id} not found`);
    return period;
  }

  async update(id: string, dto: UpdatePeriodDto) {
    await this.findOne(id);
    await this.periodRepository.update(id, dto);
    return this.findOne(id);
  }

  private async checkInvoicesInPeriod(startDate: Date, endDate: Date): Promise<boolean> {
    try {
      const response = await fetch(`${this.factonetUrl}/api/invoices/check-period?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Si no se puede conectar o hay error, asumir que hay facturas por seguridad
        return true;
      }

      const result = await response.json();
      return result.hasInvoices || false;
    } catch (error) {
      // En caso de error de conexión, asumir que hay facturas por seguridad
      return true;
    }
  }

  async remove(id: string) {
    const period = await this.findOne(id);
    
    // Validar si el período está activo
    if (period.status === 'ACTIVE') {
      throw new BadRequestException('No se puede eliminar un período activo');
    }
    
    const fechaActual = new Date();
    const fechaInicio = new Date(period.startDate);
    const fechaFin = new Date(period.endDate);
    
    // Si es período principal
    if (!period.parentPeriodId) {
      const subperiods = await this.periodRepository.find({
        where: { parentPeriodId: id }
      });
      
      if (subperiods.length > 0) {
        throw new BadRequestException('No se puede eliminar un período que tiene subperíodos');
      }
      
      // No permitir eliminar períodos pasados
      if (fechaFin < fechaActual) {
        throw new BadRequestException('No se puede eliminar períodos pasados');
      }
    } else {
      // Para subperíodos: validaciones más flexibles
      
      // Solo verificar si hay facturas si el subperíodo ya comenzó
      if (fechaInicio <= fechaActual) {
        const hasInvoices = await this.checkInvoicesInPeriod(fechaInicio, fechaFin);
        if (hasInvoices) {
          throw new BadRequestException('No se puede eliminar el subperíodo porque tiene facturas asociadas');
        }
      }
      // Los subperíodos futuros se pueden eliminar sin restricciones adicionales
    }
    
    return this.periodRepository.remove(period);
  }

  async deactivate(id: string) {
    const period = await this.findOne(id);
    await this.periodRepository.update(id, { status: 'INACTIVE' });
    return this.findOne(id);
  }

  async forceRemove(id: string) {
    const period = await this.findOne(id);
    
    // Validar si el período está activo
    if (period.status === 'ACTIVE') {
      throw new BadRequestException('No se puede eliminar un período activo');
    }
    
    // Si es período principal, validar si tiene subperíodos
    if (!period.parentPeriodId) {
      const subperiods = await this.periodRepository.find({
        where: { parentPeriodId: id }
      });
      
      if (subperiods.length > 0) {
        throw new BadRequestException('No se puede eliminar un período que tiene subperíodos');
      }
    }
    
    // Eliminación forzada sin validaciones de fecha o facturas
    return this.periodRepository.remove(period);
  }

  async activate(id: string) {
    const period = await this.findOne(id);
    
    // Validar vigencia de todos los periodos antes de activar
    await this.periodValidationService.validateActivePeriodExpiry();
    
    // Validar fechas solo para períodos principales (no subperíodos)
    if (!period.parentPeriodId) {
      const fechaActual = new Date();
      const fechaInicio = new Date(period.startDate);
      const fechaFin = new Date(period.endDate);
      
      if (fechaInicio > fechaActual) {
        throw new BadRequestException('No se puede activar un período futuro');
      }
      
      if (fechaFin < fechaActual) {
        throw new BadRequestException('No se puede activar un período expirado');
      }
    } else {
      // Para subperíodos, solo validar si ya expiró
      const fechaActual = new Date();
      const fechaFin = new Date(period.endDate);
      
      if (fechaFin < fechaActual) {
        throw new BadRequestException('No se puede activar un subperíodo expirado');
      }
    }
    
    // Desactivar todos los períodos activos del mismo nivel
    if (!period.parentPeriodId) {
      await this.periodRepository.update({}, { status: 'INACTIVE' });
    } else {
      // Para subperíodos, desactivar solo otros subperíodos del mismo período padre
      await this.periodRepository.update(
        { parentPeriodId: period.parentPeriodId }, 
        { status: 'INACTIVE' }
      );
    }
    
    // Activar el período seleccionado
    await this.periodRepository.update(id, { status: 'ACTIVE' });
    
    return this.findOne(id);
  }

  /**
   * Obtiene el periodo activo actual validando su vigencia
   */
  async getActivePeriod(): Promise<Period | null> {
    return this.periodValidationService.getActivePeriod();
  }

  /**
   * Verifica si existe un periodo activo válido
   */
  async hasValidActivePeriod(): Promise<boolean> {
    return this.periodValidationService.hasValidActivePeriod();
  }
}
