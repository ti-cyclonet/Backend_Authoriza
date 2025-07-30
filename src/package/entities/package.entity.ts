import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';

@Entity()
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => ConfigurationPackage, (config) => config.package)
  configurations: ConfigurationPackage[];
}
