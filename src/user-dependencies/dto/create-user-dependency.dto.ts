import { IsUUID, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDependencyDto {
  @IsUUID()
  principalUserId: string;

  @IsUUID()
  dependentUserId: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: string;
}