import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuoptionDto } from './create-menuoption.dto';

export class UpdateMenuoptionDto extends PartialType(CreateMenuoptionDto) {}
