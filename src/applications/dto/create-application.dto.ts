import { Exclude } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  strName: string;

  @IsString()
  strDescription: string;

  @IsString()
  @IsOptional()
  strUrlImage?: string;

  @IsString()
  @IsOptional()
  strSlug?: string;

  @IsString({ each: true})
  @IsArray()
  @IsOptional()
  strTags?: string[];
  
  @IsArray()
  @IsOptional()
  strRoles: { 
    strName: string; 
    strDescription1?: string; 
    strDescription2?: string;
    strMenuOptions?: {
      strName: string;
      strDescription: string;
      strUrl: string;
      strIcon: string;
      strType: string;
      ingOrder: number;
      strSubmenus?: {
        strName: string;
        strDescription: string;
        strUrl: string;
        strIcon: string;
        strType: string;
        ingOrder: number;
      }[];
    }[];
  }[];

  @Exclude() // opcional, si no deseas que se valide o serialice
  id?: any;

  @Exclude()
  strState?: any;

  @Exclude()
  file?: any;
}
