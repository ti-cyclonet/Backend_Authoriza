import { Exclude, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateMenuoptionDto } from 'src/menuoptions/dto/create-menuoption.dto';

export class CreateRolDto {
  @IsString()
  @MinLength(1)
  strName: string;

  @IsOptional()
  @IsString()
  strDescription1: string;

  @IsString()
  @IsOptional()
  strDescription2?: string;

  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return [];
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuoptionDto)
  menuOptions?: CreateMenuoptionDto[];

  @Exclude()
  id?: any;

  @Exclude()
  strState?: any;

  @Exclude()
  isTemporary?: any;
}

