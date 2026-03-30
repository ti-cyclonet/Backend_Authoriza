import { DataSource } from 'typeorm';
import { CustomerParameter } from '../customer-parameters/entities/customer-parameter.entity';

export async function seedCustomerParameters(dataSource: DataSource) {
  const customerParameterRepository = dataSource.getRepository(CustomerParameter);

  const existingParams = await customerParameterRepository.count();
  if (existingParams > 0) {
    console.log('Customer parameters already seeded');
    return;
  }

  const customerParameters = [
    {
      code: 'MAX_STOCK_ALERT',
      name: 'Alerta de Stock Máximo',
      description: 'Porcentaje de stock máximo para generar alertas',
      dataType: 'number'
    },
    {
      code: 'MIN_STOCK_ALERT',
      name: 'Alerta de Stock Mínimo',
      description: 'Porcentaje de stock mínimo para generar alertas',
      dataType: 'number'
    },
    {
      code: 'AUTO_REORDER',
      name: 'Reorden Automático',
      description: 'Activar reorden automático de materiales',
      dataType: 'boolean'
    },
    {
      code: 'CURRENCY',
      name: 'Moneda',
      description: 'Moneda utilizada en el sistema',
      dataType: 'string'
    }
  ];

  await customerParameterRepository.save(customerParameters);
  console.log('Customer parameters seeded successfully');
}
