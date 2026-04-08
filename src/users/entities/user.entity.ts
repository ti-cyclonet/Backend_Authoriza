import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { BasicData } from '../../basic-data/entities/basic-data.entity';
import { Contract } from '../../contract/entities/contract.entity';
import { UserDependency } from '../../user-dependencies/entities/user-dependency.entity';
import { UserRole } from '../../user-roles/entities/user-role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  strUserName: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column()
  strPassword: string;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastPasswordChange: Date;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verificationExpires: Date;

  @Column({ type: 'enum',
    enum: [
      'ACTIVE',
      'INACTIVE',
      'UNCONFIRMED',
      'CONFIRMED',
      'EXPIRING',
      'SUSPENDED',
      'DELINQUENT',
      'TEMPORARY',
      'DELETED',
    ],
    default: 'UNCONFIRMED',
  })
  strStatus: string;

  @CreateDateColumn({ type: 'timestamp' })
  dtmCreateDate: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'dtmLatestUpdateDate' })
  dtmLatestUpdateDate: Date;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToOne(() => BasicData, (basicData) => basicData.user, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'basicDataId' })
  basicData: BasicData;

  @OneToMany(() => Contract, (contract) => contract.user)
  contracts: Contract[];

  // Relaciones de dependencias
  @OneToMany(() => UserDependency, (dependency) => dependency.principalUser)
  dependents: UserDependency[];

  @OneToMany(() => UserDependency, (dependency) => dependency.dependentUser)
  principals: UserDependency[];

  // Relaciones de roles
  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}
