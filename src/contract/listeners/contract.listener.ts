import { Injectable, Logger } from '@nestjs/common';
import { EventSubscriber, EntitySubscriberInterface, UpdateEvent } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { InvoiceGeneratorService } from '../../invoices/invoice-generator.service';

@Injectable()
@EventSubscriber()
export class ContractListener implements EntitySubscriberInterface<Contract> {
  private readonly logger = new Logger(ContractListener.name);

  constructor(private readonly invoiceGeneratorService: InvoiceGeneratorService) {}

  listenTo() {
    return Contract;
  }

  async afterUpdate(event: UpdateEvent<Contract>): Promise<void> {
    const contract = event.entity as Contract;
    const previousStatus = event.databaseEntity?.status;
    const currentStatus = contract.status;

    // Si el contrato cambió a ACTIVE desde cualquier otro estado
    if (currentStatus === ContractStatus.ACTIVE && previousStatus !== ContractStatus.ACTIVE) {
      this.logger.log(`Contract ${contract.id} activated. Checking if first invoice is due (payday - 5)...`);

      try {
        // Only generates if it's already generation day (payday - 5); otherwise the daily cron handles it
        const invoice = await this.invoiceGeneratorService.generateFirstInvoiceIfDue(contract.id);
        if (invoice) {
          this.logger.log(`First invoice generated for contract ${contract.id}`);
        } else {
          this.logger.log(`First invoice for contract ${contract.id} deferred until generation day.`);
        }
      } catch (error) {
        this.logger.error(`Failed to generate invoice for contract ${contract.id}:`, error);
      }
    }
  }
}