import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PeriodValidationService } from './period-validation.service';

@Injectable()
export class PeriodInitializationService implements OnModuleInit {
  private readonly logger = new Logger(PeriodInitializationService.name);

  constructor(private readonly periodValidationService: PeriodValidationService) {}

  async onModuleInit() {
    try {
      this.logger.log('Iniciando validación de vigencia de periodos...');
      
      // Validar vigencia de periodos al iniciar la aplicación
      await this.periodValidationService.validateActivePeriodExpiry();
      
      // Verificar si existe un periodo activo válido
      const hasValidActivePeriod = await this.periodValidationService.hasValidActivePeriod();
      
      if (hasValidActivePeriod) {
        const activePeriod = await this.periodValidationService.getActivePeriod();
        this.logger.log(`Periodo activo válido encontrado: ${activePeriod.name} (${activePeriod.code})`);
      } else {
        this.logger.warn('ADVERTENCIA: No existe un periodo activo válido. La aplicación requiere un periodo activo para funcionar correctamente.');
      }
      
    } catch (error) {
      this.logger.error('Error durante la inicialización de validación de periodos:', error);
    }
  }
}