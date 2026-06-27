import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export enum LogAction {
  CONTRACT_ACTIVATED = 'CONTRACT_ACTIVATED',
  CONTRACT_DEACTIVATED = 'CONTRACT_DEACTIVATED',
  CONTRACT_UPGRADED = 'CONTRACT_UPGRADED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PDF_GENERATED = 'PDF_GENERATED'
}

@Entity('system_logs')
export class SystemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LogLevel })
  level: LogLevel;

  @Column({ type: 'enum', enum: LogAction })
  action: LogAction;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  contractId: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}