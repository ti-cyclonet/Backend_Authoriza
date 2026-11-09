import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EinvoiceResolution } from './einvoice-resolution.entity';

/**
 * Emisor de documentos electrónicos: un negocio (tenant) con sus datos
 * fiscales. CycloNet también es un emisor (sus facturas a los clientes).
 */
@Entity('einvoice_issuers')
export class EinvoiceIssuer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Usuario principal dueño del contrato (tenant de InOut / FactoNet). */
  @Column({ type: 'varchar', length: 100, unique: true })
  tenantId: string;

  @Column({ type: 'varchar', length: 3 })
  idType: string;

  @Column({ type: 'varchar', length: 20 })
  idNumber: string;

  @Column({ type: 'smallint', nullable: true })
  checkDigit: number | null;

  @Column({ type: 'varchar', length: 200 })
  legalName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  tradeName: string | null;

  @Column({ type: 'varchar', length: 10 })
  personType: 'JURIDICA' | 'NATURAL';

  @Column({ type: 'varchar', length: 3 })
  taxRegime: '48' | '49';

  @Column({ type: 'jsonb', default: () => "'[]'" })
  responsibilities: string[];

  @Column({ type: 'varchar', length: 10, nullable: true })
  ciiu: string | null;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 5 })
  municipalityCode: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** Id del emisor ante el proveedor tecnológico (lo asigna el PT al darlo de alta). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  providerIssuerId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  providerName: string | null;

  /** DATOS_INCOMPLETOS → LISTO (datos y resolución) → HABILITADO (dado de alta en el PT). */
  @Column({ type: 'varchar', length: 20, default: 'DATOS_INCOMPLETOS' })
  status: 'DATOS_INCOMPLETOS' | 'LISTO' | 'HABILITADO';

  @OneToMany(() => EinvoiceResolution, (r) => r.issuer)
  resolutions: EinvoiceResolution[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
