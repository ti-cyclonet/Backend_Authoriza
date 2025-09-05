import { CustomerParametersPeriods } from '../../customer-parameters-periods/entities/customer-parameters-periods.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('customer_parameters')
export class CustomerParameter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'data_type' })
  dataType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => CustomerParametersPeriods,
    (cpPeriod) => cpPeriod.customerParameter,
  )
  periods: CustomerParametersPeriods[];
}
