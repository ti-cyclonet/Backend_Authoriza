import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PotentialUserStatus {
  POTENTIAL = 'POTENTIAL',
  CONVERTED = 'CONVERTED'
}

@Entity('potential_users')
export class PotentialUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'source_application' })
  sourceApplication: string;

  @Column({ name: 'document_type', nullable: true })
  documentType: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'document_number', nullable: true })
  documentNumber: string;

  @Column({
    type: 'enum',
    enum: PotentialUserStatus,
    default: PotentialUserStatus.POTENTIAL
  })
  status: PotentialUserStatus;

  @Column({ name: 'converted_to_user_id', nullable: true })
  convertedToUserId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}