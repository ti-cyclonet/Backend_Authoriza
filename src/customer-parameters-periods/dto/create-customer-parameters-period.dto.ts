export class CreateCustomerParametersPeriodDto {
  customerParameterId: string;
  periodId: string;
  value: string;
  status?: string = "ACTIVE";
}
