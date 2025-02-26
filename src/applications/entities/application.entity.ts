import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from 'src/roles/entities/rol.entity';

@Entity()
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    unique: true,
  })
  strName: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  strDescription: string;

  @Column({
    type: 'text',
    default: '/assets/img/default.jpg',
  })
  strUrlImage: string;

  @Column('text', {
    unique: true,
  })
  strSlug: string;

  @Column('text', {
    array: true,
    default: [],
  })
  strTags: string[];  

  //Roles
  @OneToMany(
    () => Rol,
    (rol) => rol.strApplication,
    { cascade: true, eager: true },
  )
  strRoles?: Rol[];

  @BeforeInsert()
  checkSlugInsert() {
    if (!this.strSlug) {
      this.strSlug = this.strName;
    }
    this.strSlug = this.strSlug
      .toLowerCase()
      .replaceAll(' ', '_')
      .replaceAll("'", '');
  }

  @BeforeUpdate()
  checkSlugUpdate() {
    this.strSlug = this.strSlug
      .toLowerCase()
      .replaceAll(' ', '_')
      .replaceAll("'", '');
  }
}
