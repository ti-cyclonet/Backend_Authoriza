import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Rol } from 'src/roles/entities/rol.entity';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  strUserName: string;

  @Column()
  strPassword: string;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastPasswordChange: Date;

  @Column({
    type: 'enum',
    enum: [
      'ACTIVE',
      'INACTIVE',
      'UNCONFIRMED',
      'EXPIRING',
      'SUSPENDED',
      'DELINQUENT',
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

  @ManyToOne(() => Rol, { nullable: true })
  rol: Rol;

  @OneToOne(() => BasicData, (basicData) => basicData.user, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'basicDataId' })
  basicData: BasicData;

  @ManyToOne(() => User, (user) => user.dependents, { nullable: true })
  @JoinColumn({ name: 'dependentOnId' })
  dependentOn: User;

  @OneToMany(() => User, (user) => user.dependentOn)
  dependents: User[];
}
