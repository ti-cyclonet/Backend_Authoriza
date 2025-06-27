import { BasicData } from 'src/basic-data/entities/basic-data.entity';
import { CreateLegalEntityDataDto } from './dto/create-legal-entity-data.dto';
import { LegalEntityData } from './entities/legal-entity-data.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class LegalEntityDataService {
  constructor(
    @InjectRepository(LegalEntityData)
    private repo: Repository<LegalEntityData>,

    @InjectRepository(BasicData)
    private readonly basicDataRepository: Repository<BasicData>,
  ) {}

  async create(dto: CreateLegalEntityDataDto): Promise<LegalEntityData> {
    const basicData = await this.basicDataRepository.findOneBy({
      id: dto.basicDataId,
    });

    if (!basicData) {
      throw new NotFoundException(
        `BasicData with ID ${dto.basicDataId} not found`,
      );
    }

    const entity = this.repo.create({
      ...dto,
      basicData,
    });

    return this.repo.save(entity);
  }

  findOne(id: string): Promise<LegalEntityData> {
    return this.repo.findOne({
      where: { id },
      relations: ['basicData'],
    });
  }

  async update(
    id: string,
    dto: Partial<CreateLegalEntityDataDto>,
  ): Promise<LegalEntityData> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  remove(id: string): Promise<any> {
    return this.repo.delete(id);
  }
}
