import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalParametersPeriods } from './entities/global-parameters-periods.entity';
import { CreateGlobalParametersPeriodDto } from './dto/create-global-parameters-period.dto';
import { UpdateGlobalParametersPeriodDto } from './dto/update-global-parameters-period.dto';

@Injectable()
export class GlobalParametersPeriodsService {
  constructor(
    @InjectRepository(GlobalParametersPeriods)
    private repo: Repository<GlobalParametersPeriods>,
  ) {}

  async create(dto: CreateGlobalParametersPeriodDto) {
    const entity = this.repo.create({
      globalParameter: { id: dto.globalParameterId },
      period: { id: dto.periodId },
      value: dto.value,
      status: dto.status || 'active',
      showInDocs: dto.showInDocs !== undefined ? dto.showInDocs : true,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ relations: ['globalParameter', 'period'] });
  }

  findOne(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['globalParameter', 'period'],
    });
  }

  findByParameter(paramId: string) {
    return this.repo.find({
      where: { globalParameter: { id: paramId } },
      relations: ['period'],
    });
  }

  findByPeriod(periodId: string) {
    return this.repo.find({
      where: { period: { id: periodId } },
      relations: ['globalParameter'],
    });
  }

  async update(id: string, dto: UpdateGlobalParametersPeriodDto) {
    console.log(`[AUTHORIZA SERVICE] Updating parameter ${id} with:`, dto);
    const entity = await this.repo.preload({ id, ...dto });
    if (!entity) {
      console.log(`[AUTHORIZA SERVICE] Parameter ${id} not found`);
      throw new Error('GlobalParametersPeriod not found');
    }
    const result = await this.repo.save(entity);
    console.log(`[AUTHORIZA SERVICE] Parameter updated successfully:`, result);
    return result;
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
