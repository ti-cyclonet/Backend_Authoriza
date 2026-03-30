import { IsEmail, IsUUID } from 'class-validator';

export class TransferAdminRoleDto {
  @IsEmail()
  newAdminEmail: string;

  @IsUUID()
  contractId: string;
}
