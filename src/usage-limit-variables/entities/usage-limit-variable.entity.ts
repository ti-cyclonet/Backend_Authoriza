import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Package } from '../../package/entities/package.entity';

@Entity('usage_limit_variables')
@Unique(['packageId', 'variableName'])
export class UsageLimitVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  variableName: string;

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'int' })
  maxValue: number;

  @Column({ type: 'varchar', length: 50 })
  targetApplication: string;

  @ManyToOne(() => Package, (pkg) => pkg.usageLimitVariables, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'packageId' })
  package: Package;

  @Column()
  packageId: string;
}
