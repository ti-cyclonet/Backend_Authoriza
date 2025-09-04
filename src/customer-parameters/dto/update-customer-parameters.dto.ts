import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerParametersDto } from './create-customer-parameters.dto';

export class UpdateCustomerParametersDto extends PartialType(CreateCustomerParametersDto) {}
