import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { PaymentMode } from '../contract/enums/payment-mode.enum';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { Invoice } from './entities/invoice.entity';

@Injectable()
export class InvoiceSweepService {
  private readonly logger = new Logger(InvoiceSweepService.name);

  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private invoiceGeneratorService: InvoiceGeneratorService,
  ) {}

  async sweepAndGenerateInvoices(): Promise<{ generated: number; contracts: string[] }> {
    this.logger.log('Starting invoice sweep...');
    
    const activeContracts = await this.contractRepository.find({
      where: { status: ContractStatus.ACTIVE },
      relations: ['user']
    });

    const generated: string[] = [];
    
    for (const contract of activeContracts) {
      if (await this.shouldGenerateInvoice(contract)) {
        try {
          await this.invoiceGeneratorService.generateInvoiceForContract(contract.id);
          generated.push(contract.id);
          this.logger.log(`Generated invoice for contract ${contract.id}`);
        } catch (error) {
          this.logger.error(`Failed to generate invoice for contract ${contract.id}:`, error.message);
        }
      }
    }

    this.logger.log(`Sweep completed. Generated ${generated.length} invoices`);
    return { generated: generated.length, contracts: generated };
  }

  private async shouldGenerateInvoice(contract: Contract): Promise<boolean> {
    const today = new Date();
    const nextPaymentDate = this.calculateNextPaymentDate(contract, today);
    
    // Verificar si faltan 30 días o menos (ampliado para testing)
    const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    this.logger.log(`Contract ${contract.id}: Next payment ${nextPaymentDate.toISOString()}, Days until: ${daysUntilPayment}`);
    
    if (daysUntilPayment > 30) {
      this.logger.log(`Contract ${contract.id}: Too far in future (${daysUntilPayment} days)`);
      return false;
    }

    // Verificar si ya existe factura para el período
    const { periodStart, periodEnd } = this.calculatePeriod(contract, nextPaymentDate);
    
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        contractId: contract.id,
        periodStart,
        periodEnd
      }
    });

    if (existingInvoice) {
      this.logger.log(`Contract ${contract.id}: Invoice already exists for period`);
      return false;
    }

    this.logger.log(`Contract ${contract.id}: Should generate invoice`);
    return true;
  }

  private calculateNextPaymentDate(contract: Contract, currentDate: Date): Date {
    const nextDate = new Date(currentDate);
    
    switch (contract.mode) {
      case PaymentMode.MONTHLY:
        const payDay = contract.payday || 1;
        
        // Si el contrato inicia en el futuro, usar la fecha de inicio
        if (contract.startDate > currentDate) {
          return new Date(contract.startDate);
        }
        
        // Calcular próxima fecha de pago mensual
        nextDate.setDate(payDay);
        
        // Si hoy es el día de pago o ya pasó este mes, considerar este mes
        if (currentDate.getDate() <= payDay) {
          // Estamos en el mes correcto, usar este mes
          return nextDate;
        } else {
          // Ya pasó el día de pago este mes, ir al siguiente
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
        
      case PaymentMode.SEMIANNUAL:
        if (contract.startDate > currentDate) {
          return new Date(contract.startDate);
        }
        
        const startMonth = contract.startDate.getMonth();
        const targetMonth = Math.ceil((currentDate.getMonth() - startMonth + 1) / 6) * 6 + startMonth;
        nextDate.setMonth(targetMonth);
        nextDate.setDate(contract.startDate.getDate());
        break;
        
      case PaymentMode.ANNUAL:
        if (contract.startDate > currentDate) {
          return new Date(contract.startDate);
        }
        
        nextDate.setMonth(contract.startDate.getMonth());
        nextDate.setDate(contract.startDate.getDate());
        if (nextDate <= currentDate) {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        break;
    }
    
    return nextDate;
  }

  private calculatePeriod(contract: Contract, paymentDate: Date): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(paymentDate);
    const periodEnd = new Date(paymentDate);

    switch (contract.mode) {
      case PaymentMode.MONTHLY:
        periodStart.setDate(1);
        periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
        break;
      
      case PaymentMode.SEMIANNUAL:
        const startMonth = Math.floor(paymentDate.getMonth() / 6) * 6;
        periodStart.setMonth(startMonth, 1);
        periodEnd.setMonth(startMonth + 6, 0);
        break;
      
      case PaymentMode.ANNUAL:
        periodStart.setMonth(0, 1);
        periodEnd.setMonth(12, 0);
        break;
    }

    return { periodStart, periodEnd };
  }
}