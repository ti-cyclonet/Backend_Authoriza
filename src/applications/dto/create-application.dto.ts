import { Exclude, plainToInstance, Transform, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateRolDto } from 'src/roles/dto/create-rol.dto';

export class CreateApplicationDto {
  @IsString()
  strName: string;

  @IsString()
  strDescription: string;

  @IsOptional()
  @IsString()
  strUrlImage?: string;

  @IsOptional()
  @IsString()
  strSlug?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return value;
  })
  @IsString({ each: true })
  @IsArray()
  strTags?: string[];  

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? plainToInstance(CreateRolDto, parsed)
          : [];
      } catch {
        return [];
      }
    }
    return value;
  })
  @Type(() => CreateRolDto)
  @ValidateNested({ each: true })
  @IsArray()
  strRoles: CreateRolDto[];

  @Exclude()
  id?: any;

  @Exclude()
  strState?: any;

  @Exclude()
  file?: any;
}