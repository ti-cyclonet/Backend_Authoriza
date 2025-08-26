import { IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBasicDataDto {
  @IsString()
  @IsIn(['J', 'N'])
  @Type(() => String)
  strPersonType: 'J' | 'N';

  @IsString()
  strStatus: string;
}
