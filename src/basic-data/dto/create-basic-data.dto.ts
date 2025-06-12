import { IsIn, IsString } from 'class-validator';

export class CreateBasicDataDto {
  @IsIn(['J', 'N'])
  strPersonType: 'J' | 'N';

  @IsString()
  strStatus: string;
}