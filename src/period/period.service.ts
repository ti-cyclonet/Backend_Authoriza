import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Period } from './entities/period.entity';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';

@Injectable()
export class PeriodService {
  constructor(
    @InjectRepository(Period)
    private readonly periodRepository: Repository<Period>,
  ) {}

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
    // Generar código automático
    const code = await this.generatePeriodCode();
    
    const period = this.periodRepository.create({
      ...dto,
      code,
      status: 'INACTIVE'
    });
    return this.periodRepository.save(period);
  }

  private async generatePeriodCode(): Promise<string> {
    let nextNumber = 1;
    let codeExists = true;
    
    // Buscar el siguiente código disponible
    while (codeExists) {
      const code = `PE${nextNumber.toString().padStart(5, '0')}`;
      const existingPeriod = await this.periodRepository.findOne({
        where: { code }
      });
      
      if (!existingPeriod) {
        return code;
      }
      
      nextNumber++;
    }
    
    return `PE${nextNumber.toString().padStart(5, '0')}`;
  }

  findAll() {
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

  async remove(id: string) {
    const period = await this.findOne(id);
    
    // Validar si el período está activo
    if (period.status === 'ACTIVE') {
      throw new BadRequestException('No se puede eliminar un período activo');
    }
    
    // No permitir eliminar períodos pasados
    const fechaActual = new Date();
    const fechaFin = new Date(period.endDate);
    
    if (fechaFin < fechaActual) {
      throw new BadRequestException('No se puede eliminar períodos pasados');
    }
    
    return this.periodRepository.remove(period);
  }

  async deactivate(id: string) {
    const period = await this.findOne(id);
    await this.periodRepository.update(id, { status: 'INACTIVE' });
    return this.findOne(id);
  }

  async activate(id: string) {
    const period = await this.findOne(id);
    
    // Validar fechas solo para períodos principales (no subperíodos)
    if (!period.parentPeriodId) {
      const fechaActual = new Date();
      const fechaInicio = new Date(period.startDate);
      const fechaFin = new Date(period.endDate);
      
      if (fechaInicio > fechaActual) {
        throw new BadRequestException('No se puede activar un período futuro');
      }
      
      if (fechaFin < fechaActual) {
        throw new BadRequestException('No se puede activar un período pasado');
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
}
