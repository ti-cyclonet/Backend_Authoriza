import { Type } from 'class-transformer';
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

  @IsString()
  strDescription1: string;

  @IsString()
  @IsOptional()
  strDescription2?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuoptionDto)
  menuOptions: CreateMenuoptionDto[];
}
