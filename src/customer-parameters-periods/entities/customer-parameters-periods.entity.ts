import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { Period } from '../../period/entities/period.entity';
import { CustomerParameter } from '../../customer-parameters/entities/customer-parameter.entity';

@Entity('customer_parameters_periods')
export class CustomerParametersPeriods {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_parameter_id' })
  customerParameterId: string;

  @ManyToOne(() => CustomerParameter, (cp) => cp.periods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_parameter_id' })
  customerParameter: CustomerParameter;

  @Column({ name: 'period_id' })
  periodId: string;

  @ManyToOne(() => Period, (p) => p.customerParameters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: Period;

  @Column({ name: 'parameter_id' })
  parameterId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column()
  value: string;

  @Column({ default: 'INACTIVE' })
  status: string;

  @Column()
  name: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'operation_type', default: 'add' })
  operationType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
