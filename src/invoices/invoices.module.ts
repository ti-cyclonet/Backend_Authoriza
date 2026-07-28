import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PublicInvoicesController } from './public-invoices.controller';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { InvoiceSweepService } from './invoice-sweep.service';
import { InvoiceLifecycleCron } from './invoice-lifecycle.cron';
import { Invoice } from './entities/invoice.entity';
import { Contract } from '../contract/entities/contract.entity';
import { GlobalParametersPeriods } from '../global-parameters-periods/entities/global-parameters-periods.entity';
import { GlobalParametersForInvoices } from '../global-parameters-invoices/entities/global-parameters-for-invoices.entity';
import { EntityCodesModule } from '../entity-codes/entity-codes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserDependency } from '../user-dependencies/entities/user-dependency.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Contract, GlobalParametersPeriods, GlobalParametersForInvoices, UserDependency, User]),
    EntityCodesModule,
    NotificationsModule,
    CloudinaryModule,
  ],
  controllers: [InvoicesController, PublicInvoicesController],
  providers: [InvoicesService, InvoiceGeneratorService, InvoiceSweepService, InvoiceLifecycleCron],
  exports: [InvoicesService, InvoiceGeneratorService, InvoiceSweepService]
})
export class InvoicesModule {}