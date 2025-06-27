import { Injectable, NotFoundException } from '@nestjs/common';
import { NaturalPersonData } from './entities/natural-person-data.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';
import { CreateNaturalPersonDataDto } from './dto/create-natural-person-data.dto';

@Injectable()
export class NaturalPersonDataService {
  constructor(
    @InjectRepository(NaturalPersonData)
    private repo: Repository<NaturalPersonData>,

    @InjectRepository(BasicData)
    private readonly basicDataRepository: Repository<BasicData>,
  ) {}

  async create(dto: CreateNaturalPersonDataDto): Promise<NaturalPersonData> {
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

  findOne(id: string): Promise<NaturalPersonData> {
    return this.repo.findOne({
      where: { id },
      relations: ['basicData'],
    });
  }

  async update(
    id: string,
    dto: Partial<CreateNaturalPersonDataDto>,
  ): Promise<NaturalPersonData> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  remove(id: string): Promise<any> {
    return this.repo.delete(id);
  }
}
