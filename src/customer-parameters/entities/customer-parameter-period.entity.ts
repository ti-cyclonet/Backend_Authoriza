import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CustomerParameter } from './customer-parameter.entity';

@Entity('customer_parameters_periods')
export class CustomerParameterPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column()
  name: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ default: 'INACTIVE' })
  status: string;

  @Column({ name: 'parameter_id' })
  parameterId: string;

  @Column()
  value: string;

  @Column({ name: 'operation_type', default: 'add' })
  operationType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CustomerParameter)
  @JoinColumn({ name: 'parameter_id' })
  parameter: CustomerParameter;
}