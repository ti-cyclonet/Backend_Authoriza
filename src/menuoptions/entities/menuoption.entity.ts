import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Menuoption {
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
  strDescription: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  strUrl: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  strIcon: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  strType: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  strIdMPather: string;

  @Column({
    type: 'numeric',
    default: 0,
  })
  ingOrder: number;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  strIdApplication: string;
}
