import { Expose } from 'class-transformer';

export class DocumentTypeResponseDto {
  @Expose()
  id: string;

  @Expose()
  description: string;

  @Expose()
  documentType: string;
}
