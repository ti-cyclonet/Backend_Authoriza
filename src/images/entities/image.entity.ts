import { Package } from '../../package/entities/package.entity';
import { BasicData } from '../../basic-data/entities/basic-data.entity';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Image {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  url: string;

  // Imagen de un PAQUETE (Presentation_images del MER).
  @ManyToOne(() => Package, (pkg) => pkg.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packageId' })
  package: Package;

  @Column({ nullable: true })
  packageId: string;

  // Foto de una PERSONA (relación "Photos" del MER: BASIC-DATA → IMAGES).
  // Nullable porque una Image puede ser de paquete o de persona.
  @ManyToOne(() => BasicData, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'basicDataId' })
  basicData: BasicData;

  @Column({ type: 'uuid', nullable: true })
  basicDataId: string;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  createdAt: Date;
}
