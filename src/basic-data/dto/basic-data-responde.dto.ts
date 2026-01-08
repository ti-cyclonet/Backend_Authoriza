import { Expose, Type } from 'class-transformer';
import { LegalEntityDataResponseDto } from 'src/legal-entity-data/dto/legal-entity-data-response.dto';
import { NaturalPersonDataResponseDto } from 'src/natural-person-data/dto/natural-person-data-response.dto';
import { DocumentType } from 'src/document-types/entities/document-type.entity';

export class BasicDataResponseDto {
  @Expose()
  id: string;

  @Expose()
  strPersonType: 'J' | 'N';

  @Expose()
  strStatus: string;

  @Expose()
  documentTypeId?: string;

  @Expose()
  documentNumber?: string;

  @Expose()
  @Type(() => DocumentType)
  documentType?: DocumentType;

  @Expose()
  @Type(() => NaturalPersonDataResponseDto)
  naturalPersonData?: NaturalPersonDataResponseDto;

  @Expose()
  @Type(() => LegalEntityDataResponseDto)
  legalEntityData?: LegalEntityDataResponseDto;
}
