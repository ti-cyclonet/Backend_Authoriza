import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Parámetros del cotizador de la landing (una sola fila, id 'default'). */
@Entity({ name: 'quoter_settings' })
export class QuoterSettings {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ type: 'jsonb' })
  data: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
