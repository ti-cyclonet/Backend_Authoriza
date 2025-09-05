import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Period } from './entities/period.entity';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';

@Injectable()
export class PeriodService {
  constructor(
    @InjectRepository(Period)
    private readonly periodRepository: Repository<Period>,
  ) {}

  create(dto: CreatePeriodDto) {
    const period = this.periodRepository.create(dto);
    return this.periodRepository.save(period);
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
