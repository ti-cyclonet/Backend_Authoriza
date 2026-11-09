import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Complemento opcional de un contrato (p. ej. Facturación electrónica): suma
 * un valor mensual a la factura del contrato. Lo activa el administrador del
 * negocio aceptando los términos del servicio.
 */
@Entity('contract_addons')
@Index(['tenantId', 'code'])
export class ContractAddon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ type: 'uuid' })
  contractId: string;

  /** EINVOICING (por ahora el único). */
  @Column({ type: 'varchar', length: 30 })
  code: 'EINVOICING';

  /** Escalón del complemento (BASICO, MEDIO, ALTO). */
  @Column({ type: 'varchar', length: 20 })
  tier: string;

  /** Documentos incluidos al mes. */
  @Column({ type: 'integer', default: 0 })
  includedUnits: number;

  /** Valor mensual acordado al activarlo (null = precio aún por definir). */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyValue: number | null;

  /** Valor de cada documento por encima de los incluidos (null = por definir). */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  extraUnitValue: number | null;

  /**
   * SOLICITADO (aceptó los términos; espera que el servicio esté disponible y
   * su habilitación ante la DIAN) · ACTIVO (se cobra y se emite) · CANCELADO.
   */
  @Column({ type: 'varchar', length: 15, default: 'SOLICITADO' })
  status: 'SOLICITADO' | 'ACTIVO' | 'CANCELADO';

  @Column({ type: 'varchar', length: 20 })
  termsVersion: string;

  @Column({ type: 'varchar', length: 255 })
  requestedBy: string;

  @Column({ type: 'timestamptz' })
  requestedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  requestIp: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  /** Aviso enviado cuando el servicio quedó disponible. */
  @Column({ type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
