import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageLimitVariable } from './entities/usage-limit-variable.entity';
import { CreateUsageLimitVariableDto } from './dto/create-usage-limit-variable.dto';

@Injectable()
export class UsageLimitVariablesService {
  constructor(
    @InjectRepository(UsageLimitVariable)
    private readonly usageLimitVariableRepo: Repository<UsageLimitVariable>,
  ) {}

  async createForPackage(
    packageId: string,
    dtos: CreateUsageLimitVariableDto[],
  ): Promise<UsageLimitVariable[]> {
    const entities = dtos.map((dto) =>
      this.usageLimitVariableRepo.create({
        ...dto,
        packageId,
      }),
    );
    return this.usageLimitVariableRepo.save(entities);
  }

  async findByPackageId(packageId: string): Promise<UsageLimitVariable[]> {
    return this.usageLimitVariableRepo.find({
      where: { packageId },
    });
  }

  async replaceForPackage(
    packageId: string,
    dtos: CreateUsageLimitVariableDto[],
  ): Promise<UsageLimitVariable[]> {
    await this.usageLimitVariableRepo.delete({ packageId });
    return this.createForPackage(packageId, dtos);
  }

  async removeByPackageId(packageId: string): Promise<void> {
    await this.usageLimitVariableRepo.delete({ packageId });
  }
}
