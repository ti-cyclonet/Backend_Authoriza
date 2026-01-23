import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CustomerParametersPeriods } from '../../customer-parameters-periods/entities/customer-parameters-periods.entity';

@Entity('customer_parameters')
export class CustomerParameter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'data_type' })
  dataType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CustomerParametersPeriods, (cpp) => cpp.customerParameter)
  periods: CustomerParametersPeriods[];
}