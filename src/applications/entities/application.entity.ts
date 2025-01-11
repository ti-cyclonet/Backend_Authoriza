import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column('text',{
    array: true,
    default: []
  })
  strTags: string[];

  @BeforeInsert()
  checkSlugInsert(){
    if (!this.strSlug){
      this.strSlug = this.strName
    }
    this.strSlug = this.strSlug
    .toLowerCase()
      .replaceAll(' ','_')
      .replaceAll("'",'')
  }

  @BeforeUpdate()
  checkSlugUpdate(){
    this.strSlug = this.strSlug
    .toLowerCase()
      .replaceAll(' ','_')
      .replaceAll("'",'')
  }
}
