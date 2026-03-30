import { Expose, Type } from 'class-transformer';
import { LegalEntityDataResponseDto } from 'src/legal-entity-data/dto/legal-entity-data-response.dto';
import { NaturalPersonDataResponseDto } from 'src/natural-person-data/dto/natural-person-data-response.dto';
import { DocumentTypeResponseDto } from 'src/document-types/dto/document-type-response.dto';

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
  @Type(() => DocumentTypeResponseDto)
  documentType?: DocumentTypeResponseDto;

  @Expose()
  @Type(() => NaturalPersonDataResponseDto)
  naturalPersonData?: NaturalPersonDataResponseDto;

  @Expose()
  @Type(() => LegalEntityDataResponseDto)
  legalEntityData?: LegalEntityDataResponseDto;
}