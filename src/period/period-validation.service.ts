import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Period } from './entities/period.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PeriodValidationService {
  private readonly logger = new Logger(PeriodValidationService.name);

  constructor(
    @InjectRepository(Period)
    private readonly periodRepository: Repository<Period>,
  ) {}

  /**
   * Valida la vigencia del periodo activo y lo desactiva si ha expirado
   * Se ejecuta cada hora para verificar automáticamente
   */
  @Cron(CronExpression.EVERY_HOUR)
  async validateActivePeriodExpiry(): Promise<void> {
    try {
      const currentDate = new Date();
      
      // Buscar periodos activos que hayan expirado
      const expiredActivePeriods = await this.periodRepository.find({
        where: {
          status: 'ACTIVE',
        },
      });

      for (const period of expiredActivePeriods) {
        const endDate = new Date(period.endDate);
        
        if (endDate < currentDate) {
          await this.periodRepository.update(period.id, { status: 'INACTIVE' });
          this.logger.warn(`Periodo ${period.name} (${period.code}) ha sido desactivado automáticamente por expiración`);
        }
      }
    } catch (error) {
      this.logger.error('Error validando vigencia de periodos:', error);
    }
  }

  /**
   * Valida manualmente la vigencia de un periodo específico
   */
  async validatePeriodExpiry(periodId: string): Promise<boolean> {
    try {
      const period = await this.periodRepository.findOne({
        where: { id: periodId }
      });

      if (!period) {
        return false;
      }

      const currentDate = new Date();
      const endDate = new Date(period.endDate);

      if (period.status === 'ACTIVE' && endDate < currentDate) {
        await this.periodRepository.update(periodId, { status: 'INACTIVE' });
        this.logger.warn(`Periodo ${period.name} (${period.code}) desactivado por expiración`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error validando periodo ${periodId}:`, error);
      return false;
    }
  }

  /**
   * Obtiene el periodo activo actual, validando su vigencia
   */
  async getActivePeriod(): Promise<Period | null> {
    try {
      // Primero validar vigencia de todos los periodos activos
      await this.validateActivePeriodExpiry();

      // Buscar periodo activo válido
      const activePeriod = await this.periodRepository.findOne({
        where: { status: 'ACTIVE' }
      });

      return activePeriod;
    } catch (error) {
      this.logger.error('Error obteniendo periodo activo:', error);
      return null;
    }
  }

  /**
   * Verifica si existe un periodo activo válido
   */
  async hasValidActivePeriod(): Promise<boolean> {
    const activePeriod = await this.getActivePeriod();
    return activePeriod !== null;
  }
}