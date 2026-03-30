import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GlobalParametersPeriods } from '../../global-parameters-periods/entities/global-parameters-periods.entity';

@Entity('global_parameters_for_invoices')
export class GlobalParametersForInvoices {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'global_parameter_period_id' })
  globalParameterPeriodId: string;

  @Column({ name: 'show_in_docs', default: true })
  showInDocs: boolean;

  @ManyToOne(() => GlobalParametersPeriods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'global_parameter_period_id' })
  globalParameterPeriod: GlobalParametersPeriods;
}