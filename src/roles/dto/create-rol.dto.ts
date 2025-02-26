import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
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
  menuOptions: CreateMenuoptionDto[];
  
}
