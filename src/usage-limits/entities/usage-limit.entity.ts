import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';

@Entity()
export class UsageLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contract, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Column({ type: 'int', default: 0 })
  currentProducts: number;

  @Column({ type: 'int', default: 0 })
  maxProducts: number;

  @Column({ type: 'int', default: 0 })
  currentUsers: number;

  @Column({ type: 'int', default: 0 })
  maxUsers: number;

  @Column({ type: 'int', default: 0 })
  currentInvoices: number;

  @Column({ type: 'int', default: 0 })
  maxInvoices: number;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
