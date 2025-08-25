import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Package } from 'src/package/entities/package.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { PaymentMode } from '../enums/payment-mode.enum';

export enum ContractMode {
  MONTHLY = 'MONTHLY',
  SEMIANNUAL = 'SEMIANNUAL',
  ANNUAL = 'ANNUAL',
}

@Entity()
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.contracts, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Package, (pkg) => pkg.contracts, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'packageId' })
  package: Package;

  @Column('decimal', { precision: 12, scale: 2 })
  value: number;

  @Column({
    type: 'enum',
    enum: PaymentMode,
  })
  mode: PaymentMode;

  // Día de pago para modo mensual (1-31). Opcional para otros modos
  @Column({ type: 'int', nullable: true })
  payday?: number | null;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date | null;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
