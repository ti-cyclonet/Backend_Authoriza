import { Module } from '@nestjs/common';
import { SweepController } from './sweep.controller';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [SweepController],
})
export class SweepModule {}