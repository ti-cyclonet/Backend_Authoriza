import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Expose, Type } from 'class-transformer';
import { NaturalPersonData } from '../../natural-person-data/entities/natural-person-data.entity';
import { LegalEntityData } from '../../legal-entity-data/entities/legal-entity-data.entity';

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
  @OneToOne(() => User, (user) => user.basicData, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @OneToOne(() => NaturalPersonData, (natural) => natural.basicData)
  @Expose()
  @Type(() => NaturalPersonData)
  naturalPersonData: NaturalPersonData;

  @OneToOne(() => LegalEntityData, (legal) => legal.basicData)
  @Expose()
  @Type(() => LegalEntityData)
  legalEntityData: LegalEntityData;
}
