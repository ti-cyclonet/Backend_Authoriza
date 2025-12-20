import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('assistant_sessions')
export class AssistantSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  userId: string;

  @Column()
  currentModule: string;

  @Column('json', { nullable: true })
  context: any;

  @Column('json', { nullable: true })
  chatHistory: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}