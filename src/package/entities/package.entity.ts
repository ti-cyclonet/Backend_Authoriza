import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ConfigurationPackage } from '../../configuration-package/entities/configuration-package.entity';
import { Image } from '../../images/entities/image.entity';
import { Contract } from '../../contract/entities/contract.entity';

@Entity()
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'int', default: 50 })
  maxProducts: number;

  @Column({ type: 'int', default: 1 })
  maxUsers: number;

  @Column({ type: 'int', default: 100 })
  maxInvoices: number;

  @OneToMany(() => ConfigurationPackage, (config) => config.package)
  configurations: ConfigurationPackage[];

  @OneToMany(() => Image, (image) => image.package, { cascade: true })
  images: Image[];

  @OneToMany(() => Contract, (contract) => contract.package)
  contracts: Contract[];
}
