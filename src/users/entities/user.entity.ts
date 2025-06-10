
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Rol } from 'src/roles/entities/rol.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  strUserName: string;

  @Column()
  strPassword: string;

  @Column({ default: 'ACTIVE' })
  strStatus: string;

  @CreateDateColumn()
  dtmCreateDate: Date;

  @ManyToOne(() => Rol, { eager: true, nullable: true })
  rol: Rol;
}
