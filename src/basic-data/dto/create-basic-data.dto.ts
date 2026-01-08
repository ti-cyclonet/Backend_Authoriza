import { IsIn, IsString, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBasicDataDto {
  @IsString()
  @IsIn(['J', 'N'])
  @Type(() => String)
  strPersonType: 'J' | 'N';

  @IsString()
  strStatus: string;

  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;
}
