import { DataSource } from 'typeorm';
import { GlobalParameter } from '../global-parameters/entities/global-parameter.entity';

export default class GlobalParametersSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const globalParamRepo = dataSource.getRepository(GlobalParameter);

    const defaults = [
      {
        code: 'profit_margin',
        name: 'Profit Margin',
        description: 'Porcentaje de ganancia (%)',
        dataType: 'number',
      },
      {
        code: 'iva',
        name: 'IVA',
        description: 'IVA (%) aplicado a productos/servicios',
        dataType: 'number',
      },
      {
        code: 'global_discount',
        name: 'Global Discount',
        description: 'Descuento global aplicado a ventas (%)',
        dataType: 'number',
      },
      {
        code: 'currency',
        name: 'Currency',
        description: 'Moneda por defecto del sistema',
        dataType: 'string',
      },
      {
        code: 'late_fee_penalty',
        name: '% de Penalización por Mora',
        description: 'Recargo adicional aplicado a facturas vencidas.',
        dataType: 'number',
      },
      {
        code: 'financing_interest',
        name: 'Interés por Financiamiento',
        description: 'Tasa aplicada cuando un cliente opta por pagos fraccionados o diferidos.',
        dataType: 'number',
      },
    ];

    for (const param of defaults) {
      const existingParam = await globalParamRepo.findOne({
        where: { code: param.code },
      });

      if (!existingParam) {
        const globalParam = globalParamRepo.create({
          code: param.code,
          name: param.name,
          description: param.description,
          dataType: param.dataType,
        });
        await globalParamRepo.save(globalParam);
      }
    }
  }
}
