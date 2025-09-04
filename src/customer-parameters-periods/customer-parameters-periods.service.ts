import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerParametersPeriods } from './entities/customer-parameters-periods.entity';
import { CreateCustomerParametersPeriodDto } from './dto/create-customer-parameters-period.dto';
import { UpdateCustomerParametersPeriodDto } from './dto/update-customer-parameters-period.dto';

@Injectable()
export class CustomerParametersPeriodsService {
  constructor(
    @InjectRepository(CustomerParametersPeriods)
    private repo: Repository<CustomerParametersPeriods>,
  ) {}

  async create(dto: CreateCustomerParametersPeriodDto) {
    const entity = this.repo.create({
      customerParameter: { id: dto.customerParameterId },
      period: { id: dto.periodId },
      value: dto.value,
      status: dto.status || 'active',
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ relations: ['customerParameter', 'period'] });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['customerParameter', 'period'] });
  }

  findByParameter(paramId: string) {
    return this.repo.find({
      where: { customerParameter: { id: paramId } },
      relations: ['period'],
    });
  }

  async update(id: string, dto: UpdateCustomerParametersPeriodDto) {
    const entity = await this.repo.preload({ id, ...dto });
    if (!entity) throw new Error('CustomerParametersPeriod not found');
    return this.repo.save(entity);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
