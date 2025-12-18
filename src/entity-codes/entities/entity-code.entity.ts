import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('entity_codes')
@Index(['entityType'], { unique: true })
export class EntityCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  entityType: string;

  @Column()
  prefix: string;

  @Column({ default: 0 })
  currentNumber: number;

  @Column({ default: 5 })
  digitLength: number;
}