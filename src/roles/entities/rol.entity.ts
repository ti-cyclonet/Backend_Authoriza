import { Application } from 'src/applications/entities';
import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolMenuoption } from './rol-menuoption.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Rol {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({
    type: 'text',
    unique: true,
  })
  strName: string;

  @Expose()
  @Column({
    type: 'text',
    nullable: false,
  })
  strDescription1: string;

  @Expose()
  @Column({
    type: 'text',
    nullable: true,
  })
  strDescription2: string;

  @Expose()
  @ManyToOne(
    () => Application,
    (application) => application.strRoles,
    { onDelete: 'CASCADE' }
  )
  strApplication: Application;

  @OneToMany(() => RolMenuoption, (rolMenuoption) => rolMenuoption.rol, { cascade: true })
  rolMenuoptions: RolMenuoption[];
}
