import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TestimonialStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PRIVADO';
/** Dónde se publica una opinión aprobada. */
export type TestimonialSite = 'inout' | 'cyclonet';

/**
 * Opinión de un usuario de una app del ecosistema (hoy InOut). Nada se
 * publica sin el permiso del usuario (consentPublish) y la aprobación de un
 * administrador de Authoriza.
 */
@Entity('testimonials')
@Index(['application', 'status'])
@Index(['userId'])
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** App de origen: 'InOut'. */
  @Column({ type: 'varchar', length: 30 })
  application: string;

  @Column({ type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 120 })
  authorName: string;

  /** Solo interno (para responder); nunca se publica. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  authorEmail: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  businessName: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city: string | null;

  /** Logo del negocio (solo se publica con consentLogo). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  /** Corrección de ortografía hecha al aprobar (sin cambiar el sentido). */
  @Column({ type: 'text', nullable: true })
  editedComment: string | null;

  /** Lo que más le ha ayudado: inventario, pedidos, market… */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  highlights: string[];

  /** Autoriza publicar su nombre, negocio, ciudad y comentario (Ley 1581). */
  @Column({ type: 'boolean', default: false })
  consentPublish: boolean;

  /** Autoriza publicar el logo del negocio. */
  @Column({ type: 'boolean', default: false })
  consentLogo: boolean;

  /** Viene de un usuario con sesión en la app (cliente real). */
  @Column({ type: 'boolean', default: true })
  verified: boolean;

  @Column({ type: 'varchar', length: 12, default: 'PENDIENTE' })
  status: TestimonialStatus;

  /** Destacada: sale primero. */
  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'jsonb', default: () => `'["inout"]'` })
  showOn: TestimonialSite[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
