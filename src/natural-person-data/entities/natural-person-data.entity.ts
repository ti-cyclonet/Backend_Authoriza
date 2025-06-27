import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BasicData } from 'src/basic-data/entities/basic-data.entity';

@Entity()
export class NaturalPersonData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  secondName?: string;

  @Column()
  firstSurname: string;

  @Column({ nullable: true })
  secondSurname?: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column()
  maritalStatus: string;

  @Column()
  sex: string;

  @OneToOne(() => BasicData, (basicData) => basicData.naturalPersonData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  basicData: BasicData;
}
