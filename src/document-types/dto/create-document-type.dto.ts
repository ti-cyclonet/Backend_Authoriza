import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['CC', 'CE', 'TI', 'PP', 'NIT'])
  strDocumentType: string;

  @IsString()
  @IsNotEmpty()
  strDocumentNumber: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  strStatus?: string = 'ACTIVE';
}