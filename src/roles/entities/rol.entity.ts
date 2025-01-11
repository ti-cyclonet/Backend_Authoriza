import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    unique: true,
  })
  strName: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  strDescription1: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  strDescription2: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  strIdApplication: string;
}
