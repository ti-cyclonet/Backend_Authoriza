import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { Period } from '../../period/entities/period.entity';
import { CustomerParameter } from '../../customer-parameters/entities/customer-parameter.entity';

@Entity('customer_parameters_periods')
export class CustomerParametersPeriods {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CustomerParameter, (cp) => cp.periods, { onDelete: 'CASCADE' })
  customerParameter: CustomerParameter;

  @ManyToOne(() => Period, (p) => p.customerParameters, { onDelete: 'CASCADE' })
  period: Period;

  @Column()
  value: string;

  @Column({ default: 'active' })
  status: string;
}
