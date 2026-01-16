import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Rol } from '../../roles/entities/rol.entity';
import { Contract } from '../../contract/entities/contract.entity';

@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Rol, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Rol;

  @Column('uuid')
  roleId: string;

  // Contrato del cual se asigna este rol
  @ManyToOne(() => Contract, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'contractId' })
  contract: Contract;

  @Column('uuid', { nullable: true })
  contractId: string;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}