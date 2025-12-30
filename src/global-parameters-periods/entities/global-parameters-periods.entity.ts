import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { Period } from '../../period/entities/period.entity';
import { GlobalParameter } from '../../global-parameters/entities/global-parameter.entity';

@Entity('global_parameters_periods')
export class GlobalParametersPeriods {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GlobalParameter, (gp) => gp.periods, { onDelete: 'CASCADE' })
  globalParameter: GlobalParameter;

  @ManyToOne(() => Period, (p) => p.globalParameters, { onDelete: 'CASCADE' })
  period: Period;

  @Column()
  value: string;

  @Column({ default: 'active' })
  status: string;
}
