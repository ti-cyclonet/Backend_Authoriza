import { Package } from 'src/package/entities/package.entity';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Image {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  url: string;

  @ManyToOne(() => Package, (pkg) => pkg.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packageId' })
  package: Package;
}
