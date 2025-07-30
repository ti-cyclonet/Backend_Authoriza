import { PartialType } from '@nestjs/mapped-types';
import { CreateConfigurationPackageDto } from './create-configuration-package.dto';

export class UpdateConfigurationPackageDto extends PartialType(CreateConfigurationPackageDto) {}
