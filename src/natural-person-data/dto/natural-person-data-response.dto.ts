import { Expose } from 'class-transformer';

export class NaturalPersonDataResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  secondName?: string;

  @Expose()
  firstSurname: string;

  @Expose()
  secondSurname?: string;

  @Expose()
  birthDate: Date;

  @Expose()
  maritalStatus: string;

  @Expose()
  sex: string;
}