import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Prueba de la autorización otorgada por el titular (Ley 1581 de 2012 y
 * Decreto 1377 de 2013, art. 7: el responsable debe conservar prueba de la
 * autorización). Un registro por documento aceptado (términos, tratamiento de
 * datos), con la versión exacta del texto, el negocio (tenant) ante el que se
 * otorgó, y el origen (IP / navegador).
 */
@Entity({ name: 'user_consents' })
@Index(['userId', 'tenantId', 'consentType'])
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Usuario de Authoriza (null si el titular compró como invitado). */
  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** 'TERMS_CONDITIONS' | 'HABEAS_DATA' */
  @Column({ type: 'varchar', length: 40 })
  consentType: string;

  /** Versión del documento aceptado (ej. '2026-09-25'). */
  @Column({ type: 'varchar', length: 40 })
  documentVersion: string;

  /** Negocio (usuario principal dueño del contrato) ante quien se otorga. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Inout' })
  application: string;

  /** Ej. 'MARKETPLACE_REGISTER'. */
  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  acceptedAt: Date;
}
