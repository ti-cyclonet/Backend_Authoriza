import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ConfigurationPackage } from 'src/configuration-package/entities/configuration-package.entity';
import { Image } from 'src/images/entities/image.entity';
import { Contract } from 'src/contract/entities/contract.entity';

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

  @OneToMany(() => Image, (image) => image.package, { cascade: true })
  images: Image[];

  @OneToMany(() => Contract, (contract) => contract.package)
  contracts: Contract[];
}
