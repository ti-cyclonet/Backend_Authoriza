import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalParameter } from './entities/global-parameter.entity';
import { CreateGlobalParameterDto } from './dto/create-global-parameter.dto';
import { UpdateGlobalParameterDto } from './dto/update-global-parameter.dto';

@Injectable()
export class GlobalParametersService {
  constructor(
    @InjectRepository(GlobalParameter)
    private readonly repo: Repository<GlobalParameter>,
  ) {}

  async create(dto: CreateGlobalParameterDto): Promise<GlobalParameter> {
    const parameter = this.repo.create(dto);
    return this.repo.save(parameter);
  }

  async findAll(): Promise<GlobalParameter[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<GlobalParameter> {
    const parameter = await this.repo.findOne({ where: { id } });
    if (!parameter) {
      throw new NotFoundException(`GlobalParameter with ID ${id} not found`);
    }
    return parameter;
  }

  async update(id: string, dto: UpdateGlobalParameterDto): Promise<GlobalParameter> {
    const parameter = await this.findOne(id);
    Object.assign(parameter, dto);
    return this.repo.save(parameter);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`GlobalParameter with ID ${id} not found`);
    }
  }
}
