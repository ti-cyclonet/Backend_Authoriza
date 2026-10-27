import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Servicio de un aliado que se recomienda dentro de las apps (hoy InOut):
 * facturación electrónica, contabilidad, datáfonos, impresoras… Si es un
 * enlace de referido, CycloNet recibe una comisión cuando el negocio contrata.
 */
@Entity('partner_offers')
@Index(['active', 'sortOrder'])
export class PartnerOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** facturacion | contabilidad | pagos | hardware | mensajeria | domicilios | web | otros */
  @Column({ type: 'varchar', length: 30, default: 'otros' })
  category: string;

  @Column({ type: 'text' })
  description: string;

  /** Beneficio para el negocio: «1 mes gratis», «15 % de descuento»… */
  @Column({ type: 'varchar', length: 160, nullable: true })
  benefit: string | null;

  /** Destino (enlace de referido). Nunca se entrega a las apps: pasan por /partners/go/:id. */
  @Column({ type: 'varchar', length: 1000 })
  url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  /** Apps donde sale: ['inout']. */
  @Column({ type: 'jsonb', default: () => `'["inout"]'` })
  applications: string[];

  /** Pantallas donde se sugiere además del catálogo: inicio, ventas, cartera. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  placements: string[];

  /** Enlace de referido: la app avisa que CycloNet puede recibir una comisión. */
  @Column({ type: 'boolean', default: true })
  isAffiliate: boolean;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 100 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** Un clic de un negocio en un servicio recomendado (para cobrar las comisiones). */
@Entity('partner_clicks')
@Index(['offerId', 'createdAt'])
export class PartnerClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  offerId: string;

  @Column({ type: 'varchar', length: 30 })
  application: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  /** catalogo | inicio | ventas | cartera */
  @Column({ type: 'varchar', length: 30, default: 'catalogo' })
  placement: string;

  @CreateDateColumn()
  createdAt: Date;
}
