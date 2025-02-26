import { Application } from 'src/applications/entities';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolMenuoption } from './rol-menuoption.entity';

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

  @ManyToOne(
    () => Application,
    (application) => application.strRoles,
    { onDelete: 'CASCADE' }
  )
  strApplication: Application;

  @OneToMany(() => RolMenuoption, (rolMenuoption) => rolMenuoption.rol, { cascade: true })
  rolMenuoptions: RolMenuoption[];
}
