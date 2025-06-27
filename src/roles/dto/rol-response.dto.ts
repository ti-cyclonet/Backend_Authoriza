import { Expose } from 'class-transformer';

export class RolResponseDto {
  @Expose()
  id: string;

  @Expose()
  strName: string;

  @Expose()
  strDescription1: string;

  @Expose()
  strDescription2: string;
}
