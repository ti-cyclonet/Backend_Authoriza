import { IsNumber, IsUUID } from 'class-validator';

export class CreateConfigurationPackageDto {
  @IsNumber()
  price: number;

  @IsNumber()
  totalAccount: number;

  @IsUUID()
  rolId: string;

  @IsUUID()
  packageId: string;
}
