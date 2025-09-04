import { CustomerParametersPeriods } from '../../customer-parameters-periods/entities/customer-parameters-periods.entity';
import { GlobalParametersPeriods } from '../../global-parameters-periods/entities/global-parameters-periods.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('periods')
export class Period {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => GlobalParametersPeriods, (gpPeriod) => gpPeriod.period)
  globalParameters: GlobalParametersPeriods[];

  @OneToMany(() => CustomerParametersPeriods, (cpPeriod) => cpPeriod.period)
  customerParameters: CustomerParametersPeriods[];
}
