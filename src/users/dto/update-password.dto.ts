import { IsString, MinLength, IsUUID, IsOptional } from 'class-validator';

export class UpdatePasswordDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsOptional()
  mustChangePassword?: boolean;
}
