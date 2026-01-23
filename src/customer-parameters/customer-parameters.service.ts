import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerParameter } from './entities/customer-parameter.entity';
import { CreateCustomerParameterDto, UpdateCustomerParameterDto } from './dto/customer-parameter.dto';

@Injectable()
export class CustomerParametersService {
  constructor(
    @InjectRepository(CustomerParameter)
    private customerParameterRepository: Repository<CustomerParameter>,
  ) {}

  async createParameter(createDto: CreateCustomerParameterDto, tenantId: string): Promise<CustomerParameter> {
    const parameter = this.customerParameterRepository.create({ ...createDto, tenantId });
    return await this.customerParameterRepository.save(parameter);
  }

  async findAll(tenantId: string | null): Promise<CustomerParameter[]> {
    const where = tenantId ? { tenantId } : {};
    return await this.customerParameterRepository.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async updateParameter(id: string, updateDto: UpdateCustomerParameterDto): Promise<CustomerParameter> {
    await this.customerParameterRepository.update(id, updateDto);
    const parameter = await this.customerParameterRepository.findOne({ where: { id } });
    if (!parameter) {
      throw new NotFoundException(`Parameter with ID ${id} not found`);
    }
    return parameter;
  }

  async deleteParameter(id: string): Promise<void> {
    const result = await this.customerParameterRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Parameter with ID ${id} not found`);
    }
  }
}