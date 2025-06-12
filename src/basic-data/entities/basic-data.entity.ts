import { Column, Entity, OneToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Expose } from 'class-transformer';

@Entity()
export class BasicData {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ type: 'enum', enum: ['J', 'N'] })
  strPersonType: 'J' | 'N';

  @Expose()
  @Column()
  strStatus: string;

  @Expose()
  @OneToOne(() => User, user => user.basicData, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
