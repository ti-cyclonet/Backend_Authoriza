import { GlobalParametersPeriods } from '../../global-parameters-periods/entities/global-parameters-periods.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';


@Entity('global_parameters')
export class GlobalParameter {
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
    () => GlobalParametersPeriods,
    (gpPeriod) => gpPeriod.globalParameter,
  )
  periods: GlobalParametersPeriods[];
}
