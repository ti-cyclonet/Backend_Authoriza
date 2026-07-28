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
      // Solo generar facturas para paquetes facturables
      if (contract.package && contract.package.isBillable === false) {
        this.logger.log(`Skipping contract ${contract.id}: package "${contract.package.name}" is not billable`);
        continue;
      }

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
    const DAYS_BEFORE = 5; // Generate invoice 5 days before payday

    switch (contract.mode) {
      case PaymentMode.MONTHLY:
        const payday = contract.payday || 1;
        // Calculate the target generation day (5 days before payday)
        let generationDay = payday - DAYS_BEFORE;
        if (generationDay <= 0) {
          // Wraps to previous month (e.g., payday=3, generation day = 28/29 of prev month)
          const lastDayPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
          generationDay = lastDayPrevMonth + generationDay;
        }
        return currentDate.getDate() === generationDay;
      
      case PaymentMode.SEMIANNUAL:
        const startMonthSemi = contract.startDate.getMonth();
        const currentMonthSemi = currentDate.getMonth();
        const payDaySemi = contract.startDate.getDate();
        // Check if we're in the right month and 5 days before
        if ((currentMonthSemi - startMonthSemi + 12) % 6 === 0) {
          let genDaySemi = payDaySemi - DAYS_BEFORE;
          if (genDaySemi <= 0) {
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
            genDaySemi = lastDay + genDaySemi;
            // Would need to check previous month — for simplicity, check same month
            return false;
          }
          return currentDate.getDate() === genDaySemi;
        }
        return false;
      
      case PaymentMode.ANNUAL:
        const payMonthAnnual = contract.startDate.getMonth();
        const payDayAnnual = contract.startDate.getDate();
        // Calculate the date 5 days before annual payday
        const annualPayDate = new Date(currentDate.getFullYear(), payMonthAnnual, payDayAnnual);
        const annualGenDate = new Date(annualPayDate);
        annualGenDate.setDate(annualGenDate.getDate() - DAYS_BEFORE);
        return currentDate.getMonth() === annualGenDate.getMonth() && 
               currentDate.getDate() === annualGenDate.getDate();
      
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

    // Normalize to midnight to avoid timezone/time comparison issues with date columns
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(0, 0, 0, 0);

    return { periodStart, periodEnd };
  }

  private async createInvoiceForContract(contract: Contract, currentDate: Date): Promise<Invoice> {
    let { periodStart, periodEnd } = this.calculatePeriod(contract, currentDate);
    const issueDate = this.calculateIssueDate(contract, currentDate);
    
    // Due date = PayDay + 7 days (grace period)
    const payday = contract.payday || 1;
    const expirationDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), payday);
    // If payday already passed this month, use next month's payday
    if (expirationDate < currentDate) {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }
    expirationDate.setDate(expirationDate.getDate() + 7);

    let { calculatedValue, globalParams } = await this.calculateInvoiceValueWithParams(contract, periodStart, periodEnd);

    // Pro-rata: If this is the first invoice and contract started mid-period,
    // adjust the value proportionally and set periodStart to contract startDate
    const contractStart = new Date(contract.startDate);
    contractStart.setHours(0, 0, 0, 0);
    const periodStartNorm = new Date(periodStart);
    periodStartNorm.setHours(0, 0, 0, 0);
    const periodEndNorm = new Date(periodEnd);
    periodEndNorm.setHours(0, 0, 0, 0);

    if (contractStart > periodStartNorm && contractStart <= periodEndNorm) {
      // Adjust periodStart to contract start date
      periodStart = contractStart;

      const totalDaysInPeriod = Math.ceil((periodEndNorm.getTime() - periodStartNorm.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const coveredDays = Math.ceil((periodEndNorm.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const proRataFactor = coveredDays / totalDaysInPeriod;
      const originalValue = calculatedValue;
      calculatedValue = Math.round(calculatedValue * proRataFactor * 100) / 100;
      this.logger.log(`Pro-rata applied: ${coveredDays}/${totalDaysInPeriod} days = factor ${proRataFactor.toFixed(4)}. Value: ${originalValue} → ${calculatedValue}. Period: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);
    }

    // Generar código usando EntityCodeService
    const code = await this.entityCodeService.generateCode('Invoice');

    // Agregar parámetros globales como objeto JSON con valores calculados
    // Excluir late_fee_penalty — se calcula dinámicamente al consultar
    const globalParametersData: Record<string, any> = {};
    const operationTypesData: Record<string, string> = {};
    const percentagesData: Record<string, number> = {};
    for (const param of globalParams) {
      const columnName = param.globalParameterPeriod.globalParameter.code;
      
      // Skip late_fee_penalty — it's calculated dynamically based on overdue days
      if (columnName === 'late_fee_penalty') {
        continue;
      }

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
    
    // contract.value stores the TOTAL annual contract value (e.g., 75000/month * 12 = 900000)
    // For monthly invoices: value / 12
    // For semiannual invoices: value / 2
    // For annual invoices: value (full amount)
    let baseValue = Number(contract.value);

    switch (contract.mode) {
      case PaymentMode.MONTHLY:
        baseValue = baseValue / 12;
        break;
      case PaymentMode.SEMIANNUAL:
        baseValue = baseValue / 2;
        break;
      case PaymentMode.ANNUAL:
        // Full annual value, no adjustment
        break;
        break;
    }

    this.logger.log(`Valor base calculado: ${baseValue} (mode: ${contract.mode}, contract.value: ${contract.value})`);

    // Obtener parámetros globales configurados para facturas que estén vigentes
    const globalParams = await this.getGlobalParametersForInvoices(new Date());
    
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
    // Issue date is the actual generation date
    return new Date(currentDate);
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

    // No generar facturas para paquetes no facturables
    if (contract.package && contract.package.isBillable === false) {
      throw new Error(`Contract ${contractId} has a non-billable package ("${contract.package.name}"). No invoice will be generated.`);
    }

    // Verificar si ya existe factura para el período actual
    const currentDate = new Date();
    const { periodStart, periodEnd } = this.calculatePeriod(contract, currentDate);
    
    // Search by contractId and the current month/year of periodStart to avoid date comparison issues
    const year = periodStart.getFullYear();
    const month = periodStart.getMonth(); // 0-indexed
    // First and last day of the month
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

    this.logger.log(`Checking duplicates for contract ${contract.id}: month range ${monthStart} to ${monthEnd}`);

    const existingInvoice = await this.invoiceRepository
      .createQueryBuilder('inv')
      .where('inv.contractId = :contractId', { contractId: contract.id })
      .andWhere('inv.periodStart >= :monthStart', { monthStart })
      .andWhere('inv.periodStart <= :monthEnd', { monthEnd })
      .getOne();

    if (existingInvoice) {
      this.logger.log(`Duplicate found: invoice ${existingInvoice.id} (${existingInvoice.code}) already exists for this month`);
      throw new Error(`Invoice already exists for current period`);
    }

    return await this.createInvoiceForContract(contract, currentDate);
  }
}