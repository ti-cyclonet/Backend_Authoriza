import { PartialType } from '@nestjs/mapped-types';
import { CustomerParameter } from '../entities/customer-parameter.entity';

export class CreateCustomerParametersDto implements Partial<CustomerParameter> {
  name: string;
  value: string;
  periodId?: string;
}
