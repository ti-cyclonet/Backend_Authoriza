import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageLimit } from '../entities/usage-limit.entity';
import { Reflector } from '@nestjs/core';

export const RESOURCE_TYPE_KEY = 'resourceType';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    @InjectRepository(UsageLimit)
    private usageLimitRepo: Repository<UsageLimit>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.get<string>(RESOURCE_TYPE_KEY, context.getHandler());
    if (!resourceType) return true;

    const request = context.switchToHttp().getRequest();
    const contractId = request.headers['x-contract-id'];

    if (!contractId) {
      throw new ForbiddenException('Contract ID is required');
    }

    const usageLimit = await this.usageLimitRepo.findOne({
      where: { contract: { id: contractId } },
    });

    if (!usageLimit) {
      throw new ForbiddenException('Usage limit not found for this contract');
    }

    const now = new Date();
    if (now < usageLimit.periodStart || now > usageLimit.periodEnd) {
      throw new ForbiddenException('Contract period is not active');
    }

    switch (resourceType) {
      case 'product':
        if (usageLimit.currentProducts >= usageLimit.maxProducts) {
          throw new ForbiddenException(`Product limit reached (${usageLimit.maxProducts})`);
        }
        break;
      case 'user':
        if (usageLimit.currentUsers >= usageLimit.maxUsers) {
          throw new ForbiddenException(`User limit reached (${usageLimit.maxUsers})`);
        }
        break;
      case 'invoice':
        if (usageLimit.currentInvoices >= usageLimit.maxInvoices) {
          throw new ForbiddenException(`Invoice limit reached (${usageLimit.maxInvoices})`);
        }
        break;
    }

    return true;
  }
}
