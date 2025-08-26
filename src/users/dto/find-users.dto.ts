import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { IsOptional, IsUUID, IsBooleanString } from 'class-validator';

export class FindUsersDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  dependentOnId?: string;

  @IsOptional()
  @IsBooleanString()
  withDeleted?: string;
}
