import { Expose } from 'class-transformer';

export class LegalEntityDataResponseDto {
  @Expose()
  id: string;

  @Expose()
  businessName: string;

  @Expose()
  webSite?: string;

  @Expose()
  contactEmail: string;

  @Expose()
  contactPhone: string;
}