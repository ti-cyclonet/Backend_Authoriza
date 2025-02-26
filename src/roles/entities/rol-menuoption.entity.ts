import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Menuoption } from '../../menuoptions/entities/menuoption.entity';
import { Rol } from './rol.entity';

@Entity()
export class RolMenuoption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Rol, (rol) => rol.rolMenuoptions, { onDelete: 'CASCADE' })
  rol: Rol;

  @ManyToOne(() => Menuoption, (menuoption) => menuoption.rolMenuoptions, { onDelete: 'CASCADE' })
  menuoption: Menuoption;
}
