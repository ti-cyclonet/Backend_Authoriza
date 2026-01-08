import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('document_types')
export class DocumentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'description', length: 100 })
  description: string;

  @Column({ name: 'document_type', length: 10 })
  documentType: string;

  @Column({ name: 'dtm_creation_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dtmCreationDate: Date;

  @Column({ name: 'dtm_latest_update_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  dtmLatestUpdateDate: Date;
}