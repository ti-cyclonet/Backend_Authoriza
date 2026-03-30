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
      this.logger.log(`Contract ${contract.id} activated, generating first invoice...`);
      
      try {
        await this.invoiceGeneratorService.generateInvoiceForContract(contract.id);
        this.logger.log(`First invoice generated for contract ${contract.id}`);
      } catch (error) {
        this.logger.error(`Failed to generate invoice for contract ${contract.id}:`, error);
      }
    }
  }
}