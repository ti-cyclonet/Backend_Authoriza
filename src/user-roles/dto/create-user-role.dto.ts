import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateUserRoleDto {
  @IsString()
  userId: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsString()
  status: string;
}