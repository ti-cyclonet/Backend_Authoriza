import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageLimit } from './entities/usage-limit.entity';
import { Contract } from '../contract/entities/contract.entity';

@Injectable()
export class UsageLimitsService {
  constructor(
    @InjectRepository(UsageLimit)
    private usageLimitRepo: Repository<UsageLimit>,
  ) {}

  async createFromContract(contract: Contract): Promise<UsageLimit> {
    const usageLimit = this.usageLimitRepo.create({
      contract,
      maxProducts: contract.package.maxProducts,
      maxUsers: contract.package.maxUsers,
      maxInvoices: contract.package.maxInvoices,
      currentProducts: 0,
      currentUsers: 0,
      currentInvoices: 0,
      periodStart: contract.startDate,
      periodEnd: contract.endDate || new Date(new Date(contract.startDate).setFullYear(new Date(contract.startDate).getFullYear() + 1)),
    });

    return await this.usageLimitRepo.save(usageLimit);
  }

  async incrementUsage(contractId: string, resourceType: 'product' | 'user' | 'invoice'): Promise<void> {
    const usageLimit = await this.usageLimitRepo.findOne({
      where: { contract: { id: contractId } },
    });

    if (!usageLimit) return;

    switch (resourceType) {
      case 'product':
        usageLimit.currentProducts++;
        break;
      case 'user':
        usageLimit.currentUsers++;
        break;
      case 'invoice':
        usageLimit.currentInvoices++;
        break;
    }

    await this.usageLimitRepo.save(usageLimit);
  }
}
