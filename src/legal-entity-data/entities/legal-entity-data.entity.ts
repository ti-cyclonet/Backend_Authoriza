import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BasicData } from '../../basic-data/entities/basic-data.entity';

@Entity()
export class LegalEntityData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessName: string;

  @Column({ nullable: true })
  webSite?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName: string;

  @Column()
  contactEmail: string;

  @Column()
  contactPhone: string;

  @OneToOne(() => BasicData, (basicData) => basicData.legalEntityData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  basicData: BasicData;
}
