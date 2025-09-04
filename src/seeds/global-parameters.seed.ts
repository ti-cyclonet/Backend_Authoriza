import { DataSource } from 'typeorm';
import { GlobalParametersPeriods } from '../global-parameters-periods/entities/global-parameters-periods.entity';
import { GlobalParameter } from '../global-parameters/entities/global-parameter.entity';
import { Period } from '../period/entities/period.entity';

export default class GlobalParametersSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const globalParamRepo = dataSource.getRepository(GlobalParameter);
    const periodsRepo = dataSource.getRepository(Period);
    const paramPeriodRepo = dataSource.getRepository(GlobalParametersPeriods);

    // 🔹 Tomar el periodo activo más reciente (o crear uno si no existe)
    let period = await periodsRepo.findOne({
      where: {},
      order: { startDate: 'DESC' },
    });

    if (!period) {
      period = periodsRepo.create({
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // +1 año
        status: 'ACTIVE',
      });
      await periodsRepo.save(period);
    }

    const defaults = [
      {
        code: 'profit_margin',
        name: 'Profit Margin',
        value: '20',
        description: 'Porcentaje de ganancia (%)',
        dataType: 'number',
      },
      {
        code: 'iva',
        name: 'IVA',
        value: '19',
        description: 'IVA (%) aplicado a productos/servicios',
        dataType: 'number',
      },
      {
        code: 'global_discount',
        name: 'Global Discount',
        value: '5',
        description: 'Descuento global aplicado a ventas (%)',
        dataType: 'number',
      },
      {
        code: 'currency',
        name: 'Currency',
        value: 'COP',
        description: 'Moneda por defecto del sistema',
        dataType: 'string',
      },
      {
        code: 'late_fee_penalty',
        name: '% de Penalización por Mora',
        value: '10',
        description: 'Recargo adicional aplicado a facturas vencidas.',
        dataType: 'number',
      },
      {
        code: 'financing_interest',
        name: 'Interés por Financiamiento',
        value: '2',
        description:
          'Tasa aplicada cuando un cliente opta por pagos fraccionados o diferidos.',
        dataType: 'number',
      },
    ];

    for (const param of defaults) {
      // 1️⃣ Verificar si existe el parámetro en global_parameters
      let globalParam = await globalParamRepo.findOne({
        where: { code: param.code },
      });

      if (!globalParam) {
        globalParam = globalParamRepo.create({
          code: param.code,
          name: param.name,
          description: param.description,
          dataType: param.dataType,
        });
        await globalParamRepo.save(globalParam);
      }

      // 2️⃣ Verificar si ya existe un valor en global_parameters_periods para ese periodo
      const existsPeriodValue = await paramPeriodRepo.findOne({
        where: {
          globalParameter: { id: globalParam.id },
          period: { id: period.id },
        },
        relations: ['globalParameter', 'period'],
      });

      if (!existsPeriodValue) {
        const paramPeriod = paramPeriodRepo.create({
          globalParameter: globalParam,
          period,
          value: param.value,
          status: 'ACTIVE',
        });
        await paramPeriodRepo.save(paramPeriod);
      }
    }
  }
}
