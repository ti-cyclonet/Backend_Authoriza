import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.periodRepository.remove(period);
  }
}
