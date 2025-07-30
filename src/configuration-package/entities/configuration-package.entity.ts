import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';

import { Package } from 'src/package/entities/package.entity';
import { Rol } from 'src/roles/entities/rol.entity';

@Entity()
export class ConfigurationPackage {
  @PrimaryGeneratedColumn('uuid')
id: string;

  @Column('decimal')
  price: number;

  @Column('int')
  totalAccount: number;

  @ManyToOne(() => Rol, (rol) => rol.configurations, { eager: true })
  rol: Rol;

  @ManyToOne(() => Package, (pkg) => pkg.configurations, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  package: Package;
}
