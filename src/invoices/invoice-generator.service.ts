import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractStatus } from '../contract/enums/contract-status.enum';
import { PaymentMode } from '../contract/enums/payment-mode.enum';
import { GlobalParametersPeriods } from '../global-parameters-periods/entities/global-parameters-periods.entity';
import { GlobalParametersForInvoices } from '../global-parameters-invoices/entities/global-parameters-for-invoices.entity';
import { EntityCodeService } from '../entity-codes/services/entity-code.service';

@Injectable()
export class InvoiceGeneratorService {
  private readonly logger = new Logger(InvoiceGeneratorService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(GlobalParametersPeriods)
    private globalParametersPeriodsRepository: Repository<GlobalParametersPeriods>,
    @InjectRepository(GlobalParametersForInvoices)
    private globalParametersForInvoicesRepository: Repository<GlobalParametersForInvoices>,
    private entityCodeService: EntityCodeService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateInvoices(): Promise<void> {
    this.logger.log('Starting invoice generation process...');
    
    const activeContracts = await this.contractRepository.find({
      where: { status: ContractStatus.ACTIVE },
      relations: ['user', 'package']
    });

    for (const contract of activeContracts) {
      await this.processContract(contract);
    }

    this.logger.log('Invoice generation process completed');
  }

  private async processContract(contract: Contract): Promise<void> {
    const today = new Date();
    const shouldGenerate = await this.shouldGenerateInvoice(contract, today);

    if (shouldGenerate) {
      await this.createInvoiceForContract(contract, today);
    }
  }

  private async shouldGenerateInvoice(contract: Contract, currentDate: Date): Promise<boolean> {
    const { periodStart, periodEnd } = this.calculatePeriod(contract, currentDate);
    
    // Verificar si ya existe una factura para este período
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        contractId: contract.id,
        periodStart,
        periodEnd
      }
    });

    return !existingInvoice && this.isGenerationDay(contract, currentDate);
  }

  private isGenerationDay(contract: Contract, currentDate: Date): boolean {
    switch (contract.mode) {
      case PaymentMode.MONTHLY:
        return contract.payday ? currentDate.getDate() === contract.payday : currentDate.getDate() === 1;
      
      case PaymentMode.SEMIANNUAL:
        const startMonth = contract.startDate.getMonth();
        const currentMonth = currentDate.getMonth();
        return (currentMonth - startMonth) % 6 === 0 && currentDate.getDate() === contract.startDate.getDate();
      
      case PaymentMode.ANNUAL:
        return currentDate.getMonth() === contract.startDate.getMonth() && 
               currentDate.getDate() === contract.startDate.getDate();
      
      default:
        return false;
    }
  }

  private calculatePeriod(contract: Contract, currentDate: Date): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(currentDate);
    const periodEnd = new Date(currentDate);

    switch (contract.mode) {
      case PaymentMode.MONTHLY:
        periodStart.setDate(1);
        periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
        break;
      
      case PaymentMode.SEMIANNUAL:
        const startMonth = Math.floor(currentDate.getMonth() / 6) * 6;
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

  private async createInvoiceForContract(contract: Contract, currentDate: Date): Promise<Invoice> {
    const { periodStart, periodEnd } = this.calculatePeriod(contract, currentDate);
    const issueDate = this.calculateIssueDate(contract, currentDate);
    const expirationDate = new Date(issueDate);
    expirationDate.setDate(expirationDate.getDate() + 30); // 30 días para pagar

    const { calculatedValue, globalParams } = await this.calculateInvoiceValueWithParams(contract, periodStart, periodEnd);

    // Generar código usando EntityCodeService
    const code = await this.entityCodeService.generateCode('Invoice');

    // Agregar parámetros globales como objeto JSON con valores calculados
    const globalParametersData: Record<string, any> = {};
    const operationTypesData: Record<string, string> = {};
    const percentagesData: Record<string, number> = {};
    for (const param of globalParams) {
      const columnName = param.globalParameterPeriod.globalParameter.code;
      const percentage = parseFloat(param.globalParameterPeriod.value);
      const operationType = param.globalParameterPeriod.operationType || 'add';
      
      // Calcular el valor del parámetro sobre el valor base de la factura
      const calculatedParamValue = Math.round((calculatedValue * percentage / 100) * 100) / 100;
      globalParametersData[columnName] = calculatedParamValue;
      operationTypesData[columnName] = operationType;
      percentagesData[columnName] = percentage;
    }

    const invoice = this.invoiceRepository.create({
      code,
      value: calculatedValue,
      issueDate,
      expirationDate,
      status: InvoiceStatus.UNCONFIRMED,
      userId: contract.user.id,
      contractId: contract.id,
      periodStart,
      periodEnd,
      isAutoGenerated: true,
      globalParameters: Object.keys(globalParametersData).length > 0 ? globalParametersData : null,
      operationTypes: Object.keys(operationTypesData).length > 0 ? operationTypesData : null,
      percentages: Object.keys(percentagesData).length > 0 ? percentagesData : null
    });
    const savedInvoice = await this.invoiceRepository.save(invoice) as unknown as Invoice;
    
    this.logger.log(`Generated invoice ${savedInvoice.code} for contract ${contract.id} with value ${calculatedValue}`);
    
    return savedInvoice;
  }

  private async calculateInvoiceValueWithParams(contract: Contract, periodStart: Date, periodEnd: Date): Promise<{ calculatedValue: number; globalParams: GlobalParametersForInvoices[] }> {
    this.logger.log(`Calculando valor para contrato ${contract.id}, período: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);
    
    let baseValue = Number(contract.value);

    // Si es mensual, dividir entre 12
    if (contract.mode === PaymentMode.MONTHLY) {
      baseValue = baseValue / 12;
    }

    this.logger.log(`Valor base calculado: ${baseValue}`);

    // Obtener parámetros globales configurados para facturas que estén vigentes
    const globalParams = await this.getGlobalParametersForInvoices(new Date()); // Usar fecha actual
    
    // El valor base es el valor calculado (value)
    // Los parámetros globales se calculan sobre este valor base pero no se suman
    const finalValue = baseValue;

    this.logger.log(`Valor final: ${finalValue}, Parámetros aplicados: ${globalParams.length}`);

    return { 
      calculatedValue: Math.round(finalValue * 100) / 100,
      globalParams: globalParams.filter(p => p.showInDocs)
    };
  }

  private async getGlobalParametersForInvoices(invoiceDate: Date): Promise<GlobalParametersForInvoices[]> {
    this.logger.log(`Buscando parámetros para fecha: ${invoiceDate.toISOString()}`);
    
    const result = await this.globalParametersForInvoicesRepository
      .createQueryBuilder('gpfi')
      .leftJoinAndSelect('gpfi.globalParameterPeriod', 'gpp')
      .leftJoinAndSelect('gpp.globalParameter', 'gp')
      .leftJoinAndSelect('gpp.period', 'p')
      .where('gpp.status = :status', { status: 'ACTIVE' })
      .andWhere('p.startDate <= :invoiceDate', { invoiceDate })
      .andWhere('p.endDate >= :invoiceDate', { invoiceDate })
      .getMany();
    
    this.logger.log(`Parámetros encontrados: ${result.length}`);
    result.forEach(param => {
      this.logger.log(`- ${param.globalParameterPeriod.globalParameter.code}: ${param.globalParameterPeriod.value}% (Período: ${param.globalParameterPeriod.period?.startDate} - ${param.globalParameterPeriod.period?.endDate})`);
    });
    
    return result;
  }

  private calculateIssueDate(contract: Contract, currentDate: Date): Date {
    const issueDate = new Date(currentDate);
    
    if (contract.mode === PaymentMode.MONTHLY && contract.payday) {
      issueDate.setDate(contract.payday);
    }
    
    return issueDate;
  }

  async generateInvoiceForContract(contractId: string): Promise<Invoice> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['user', 'package']
    });

    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new Error(`Contract ${contractId} is not active`);
    }

    // Verificar si ya existe factura para el período actual
    const currentDate = new Date();
    const { periodStart, periodEnd } = this.calculatePeriod(contract, currentDate);
    
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        contractId: contract.id,
        periodStart,
        periodEnd
      }
    });

    if (existingInvoice) {
      throw new Error(`Invoice already exists for current period`);
    }

    return await this.createInvoiceForContract(contract, currentDate);
  }
}