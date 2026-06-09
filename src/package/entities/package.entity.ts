import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ConfigurationPackage } from '../../configuration-package/entities/configuration-package.entity';
import { Image } from '../../images/entities/image.entity';
import { Contract } from '../../contract/entities/contract.entity';
import { UsageLimitVariable } from '../../usage-limit-variables/entities/usage-limit-variable.entity';

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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'boolean', default: true })
  isBillable: boolean;

  // Landing page fields
  @Column({ type: 'boolean', default: false })
  showInLanding: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName?: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: false })
  isHighlighted: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'Elegir Plan' })
  ctaLabel?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'register' })
  ctaType?: string;

  @OneToMany(() => ConfigurationPackage, (config) => config.package)
  configurations: ConfigurationPackage[];

  @OneToMany(() => Image, (image) => image.package, { cascade: true })
  images: Image[];

  @OneToMany(() => Contract, (contract) => contract.package)
  contracts: Contract[];

  @OneToMany(() => UsageLimitVariable, (ulv) => ulv.package, {
    cascade: true,
    eager: true,
  })
  usageLimitVariables: UsageLimitVariable[];
}
