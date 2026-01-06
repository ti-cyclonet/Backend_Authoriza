import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { PeriodValidationService } from '../../period/period-validation.service';

@Injectable()
export class ActivePeriodGuard implements CanActivate {
  constructor(private readonly periodValidationService: PeriodValidationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Validar que existe un periodo activo válido
    const hasValidActivePeriod = await this.periodValidationService.hasValidActivePeriod();
    
    if (!hasValidActivePeriod) {
      throw new BadRequestException(
        'No active period exists. You must create and activate a period to continue.'
      );
    }

    return true;
  }
}