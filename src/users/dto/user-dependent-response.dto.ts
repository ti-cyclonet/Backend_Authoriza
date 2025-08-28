import { Expose } from 'class-transformer';

export class UserDependentResponseDto {
  @Expose()
  id: string;

  @Expose()
  strUserName: string;

  @Expose()
  strStatus: string;
}
