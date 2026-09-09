import {
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Expose, Type } from 'class-transformer';
import { NaturalPersonData } from '../../natural-person-data/entities/natural-person-data.entity';
import { LegalEntityData } from '../../legal-entity-data/entities/legal-entity-data.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';

@Entity()
@Unique('UQ_basic_data_document', ['documentTypeId', 'documentNumber'])
export class BasicData {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ type: 'enum', enum: ['J', 'N'] })
  strPersonType: 'J' | 'N';

  @Expose()
  @Column()
  strStatus: string;

  @Expose()
  @OneToOne(() => User, (user) => user.basicData, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @OneToOne(() => NaturalPersonData, (natural) => natural.basicData, {
    eager: true,
    cascade: true,
  })
  @Expose()
  @Type(() => NaturalPersonData)
  naturalPersonData: NaturalPersonData;

  @OneToOne(() => LegalEntityData, (legal) => legal.basicData, {
    eager: true,
    cascade: true,
  })
  @Expose()
  @Type(() => LegalEntityData)
  legalEntityData: LegalEntityData;

  @ManyToOne(() => DocumentType, { nullable: true, eager: true })
  @JoinColumn({ name: 'document_type_id' })
  @Expose()
  documentType: DocumentType;

  @Column({ name: 'document_type_id', type: 'uuid', nullable: true })
  @Expose()
  documentTypeId: string;

  @Column({ name: 'document_number', length: 50, nullable: true })
  @Expose()
  documentNumber: string;

  // Foto de perfil VIGENTE del usuario (avatar). Vive en la identidad central
  // (BasicData) para que TODAS las apps del ecosistema la sirvan igual. El
  // histórico/registro de subidas se guarda en la entidad Image (relación
  // "Photos" del MER); este campo cachea la URL actual para servirla sin joins.
  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  @Expose()
  avatarUrl: string | null;
}
