export class CreateGlobalParametersPeriodDto {
  globalParameterId: string;
  periodId: string;
  value: string;
  status?: string = "ACTIVE"; 
}
