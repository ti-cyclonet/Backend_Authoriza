import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Documento electrónico emitido (o por emitir) ante la DIAN a través del
 * proveedor tecnológico. La venta nunca espera a la DIAN: el documento nace
 * PENDIENTE con su número reservado y se envía en segundo plano (cola con
 * reintentos). Lo emitido no se borra ni se edita: se corrige con notas.
 */
@Entity('einvoice_documents')
@Index(['tenantId', 'createdAt'])
@Index(['status', 'nextAttemptAt'])
export class EinvoiceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ type: 'uuid' })
  issuerId: string;

  /** App de origen y su registro (venta de InOut, factura de Authoriza…). */
  @Column({ type: 'varchar', length: 20 })
  sourceApp: 'INOUT' | 'AUTHORIZA' | 'FACTONET';

  @Column({ type: 'varchar', length: 100 })
  sourceId: string;

  /** Evita emitir dos veces lo mismo (p. ej. "INOUT:venta:<id>:FACTURA"). */
  @Column({ type: 'varchar', length: 200, unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 15 })
  type: 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'POS';

  @Column({ type: 'varchar', length: 4 })
  prefix: string;

  @Column({ type: 'integer' })
  number: number;

  @Column({ type: 'uuid', nullable: true })
  resolutionId: string | null;

  /** Nota crédito/débito: documento que corrige. */
  @Column({ type: 'uuid', nullable: true })
  relatedDocumentId: string | null;

  @Column({ type: 'timestamptz' })
  issueDate: Date;

  /**
   * PENDIENTE (por enviar) · EN_PROCESO (el PT/DIAN aún no responde) ·
   * ACEPTADO · RECHAZADO (corregir y volver a emitir) · CONTINGENCIA (PT o
   * DIAN caídos: se reintenta solo).
   */
  @Column({ type: 'varchar', length: 15, default: 'PENDIENTE' })
  status: 'PENDIENTE' | 'EN_PROCESO' | 'ACEPTADO' | 'RECHAZADO' | 'CONTINGENCIA';

  /** Comprador (null = consumidor final). */
  @Column({ type: 'jsonb', nullable: true })
  buyer: Record<string, any> | null;

  /** Líneas, impuestos y totales calculados (dian.computeTotals). */
  @Column({ type: 'jsonb' })
  totals: Record<string, any>;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  total: number;

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, any> | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cufe: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerRef: string | null;

  @Column({ type: 'text', nullable: true })
  qrData: string | null;

  @Column({ type: 'text', nullable: true })
  xmlUrl: string | null;

  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  messages: string[] | null;

  /** Eventos del comprador (acuse, aceptación…) que informa el PT. */
  @Column({ type: 'jsonb', nullable: true })
  events: { kind: string; at: string }[] | null;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextAttemptAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
