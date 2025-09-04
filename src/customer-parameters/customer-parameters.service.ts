import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerParameter } from './entities/customer-parameter.entity';
import { CreateCustomerParametersDto } from './dto/create-customer-parameters.dto';
import { UpdateCustomerParametersDto } from './dto/update-customer-parameters.dto';

@Injectable()
export class CustomerParametersService {
  constructor(
    @InjectRepository(CustomerParameter)
    private readonly repository: Repository<CustomerParameter>,
  ) {}

  create(dto: CreateCustomerParametersDto) {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity)
      throw new NotFoundException(`CustomerParameter ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateCustomerParametersDto) {
    const entity = await this.repository.preload({
      id,
      ...dto,
    });
    if (!entity) throw new NotFoundException('CustomerParameter not found');
    return this.repository.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    return this.repository.remove(entity);
  }
}
