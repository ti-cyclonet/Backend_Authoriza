import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolMenuoption } from 'src/roles/entities/rol-menuoption.entity';

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

  @ManyToOne(
    () => Menuoption,
    (menuOption) => menuOption.strSubmenus,
    { onDelete: 'CASCADE' }
  )
  strMPatern: Menuoption;

  @Column({
    type: 'numeric',
    default: 0,
  })
  ingOrder: number;

  @OneToMany(
    () => Menuoption,
    (menuOption) => menuOption.strMPatern,
    { cascade: true, eager: false },
  )
  strSubmenus?: Menuoption[];

  @OneToMany(() => RolMenuoption, (rolMenuoption) => rolMenuoption.menuoption, { cascade: true })
  rolMenuoptions: RolMenuoption[];

}
