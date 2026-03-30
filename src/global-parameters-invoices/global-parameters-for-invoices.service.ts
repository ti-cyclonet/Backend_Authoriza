import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalParametersForInvoices } from './entities/global-parameters-for-invoices.entity';

@Injectable()
export class GlobalParametersForInvoicesService {
  constructor(
    @InjectRepository(GlobalParametersForInvoices)
    private globalParametersForInvoicesRepository: Repository<GlobalParametersForInvoices>,
  ) {}

  async findAll(): Promise<GlobalParametersForInvoices[]> {
    return this.globalParametersForInvoicesRepository.find({
      relations: ['globalParameterPeriod', 'globalParameterPeriod.globalParameter'],
    });
  }

  async createBulk(parametros: { globalParameterPeriodId: string; showInDocs?: boolean }[]): Promise<any> {
    // Primero eliminar configuración existente
    await this.globalParametersForInvoicesRepository.clear();

    // Crear nuevos registros para los parámetros seleccionados
    const entities = parametros.map(param => 
      this.globalParametersForInvoicesRepository.create({
        globalParameterPeriodId: param.globalParameterPeriodId,
        showInDocs: param.showInDocs !== undefined ? param.showInDocs : true,
      })
    );

    const result = await this.globalParametersForInvoicesRepository.save(entities);
    return { success: true, count: result.length, data: result };
  }

  async removeAll(): Promise<void> {
    await this.globalParametersForInvoicesRepository.clear();
  }
}