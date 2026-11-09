import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EinvoiceIssuer } from './einvoice-issuer.entity';

/**
 * Resolución de numeración de la DIAN (formulario 1876) de un emisor: prefijo,
 * rango y vigencia. La factura y el POS tienen numeraciones distintas; las
 * notas crédito/débito usan su propio prefijo sin rango autorizado.
 */
@Entity('einvoice_resolutions')
@Index(['issuerId', 'docType', 'active'])
export class EinvoiceResolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  issuerId: string;

  @ManyToOne(() => EinvoiceIssuer, (i) => i.resolutions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issuerId' })
  issuer: EinvoiceIssuer;

  @Column({ type: 'varchar', length: 15 })
  docType: 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'POS';

  /** Número de la resolución de la DIAN. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  resolutionNumber: string | null;

  @Column({ type: 'varchar', length: 4 })
  prefix: string;

  @Column({ type: 'integer' })
  rangeFrom: number;

  @Column({ type: 'integer' })
  rangeTo: number;

  /** Último número usado (0 = ninguno). Se reserva con bloqueo al emitir. */
  @Column({ type: 'integer', default: 0 })
  lastNumber: number;

  @Column({ type: 'date' })
  validFrom: string;

  @Column({ type: 'date' })
  validTo: string;

  /** Clave técnica de la resolución (para el CUFE). Solo la leen el backend y el PT. */
  @Column({ type: 'varchar', length: 100, nullable: true, select: false })
  technicalKey: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
