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
}
