import { DataSource } from 'typeorm';
import { CustomerParameter } from '../customer-parameters/entities/customer-parameter.entity';

/**
 * Seed de parámetros predefinidos para InOut.
 * Estos parámetros se asignan a períodos y controlan el comportamiento de la app.
 * 
 * Categorías:
 * - FISCAL: IVA, retenciones
 * - COMERCIAL: % ganancia, % descuento, penalización por mora
 * - OPERATIVO: costos fijos (arriendo, servicios)
 * - NEGOCIO: datos del negocio para facturación
 */
export default class InoutParametersSeed {
  async run(dataSource: DataSource): Promise<void> {
    const paramRepo = dataSource.getRepository(CustomerParameter);

    const parameters = [
      // ═══════ FISCAL ═══════
      {
        code: 'IVA_PORCENTAJE',
        name: 'IVA (%)',
        description: 'Porcentaje de Impuesto al Valor Agregado aplicado a ventas y facturas',
        dataType: 'number',
      },
      {
        code: 'IVA_PORCENTAJE_REDUCIDO',
        name: 'IVA Reducido (%)',
        description: 'IVA reducido (5%) para alimentos, medicamentos y bienes de la canasta familiar',
        dataType: 'number',
      },
      {
        code: 'INC_PORCENTAJE',
        name: 'INC - Impoconsumo (%)',
        description: 'Impuesto Nacional al Consumo (8%) para restaurantes, bares y comidas preparadas. No aplica simultáneamente con IVA.',
        dataType: 'number',
      },
      {
        code: 'RETENCION_FUENTE',
        name: 'Retención en la Fuente (%)',
        description: 'Porcentaje de retención en la fuente aplicable',
        dataType: 'number',
      },
      {
        code: 'RETENCION_ICA',
        name: 'Retención ICA (%)',
        description: 'Porcentaje de retención de industria y comercio',
        dataType: 'number',
      },

      // ═══════ COMERCIAL ═══════
      {
        code: 'PORCENTAJE_GANANCIA',
        name: 'Margen de Ganancia (%)',
        description: 'Porcentaje de ganancia sobre el costo de producción o compra',
        dataType: 'number',
      },
      {
        code: 'PORCENTAJE_DESCUENTO_MAX',
        name: 'Descuento Máximo Permitido (%)',
        description: 'Porcentaje máximo de descuento que se puede aplicar a una venta',
        dataType: 'number',
      },
      {
        code: 'PENALIZACION_MORA',
        name: 'Penalización por Mora (%)',
        description: 'Porcentaje de penalización diaria por pago tardío',
        dataType: 'number',
      },
      {
        code: 'INTERES_CREDITO',
        name: 'Interés para Ventas a Crédito (%)',
        description: 'Porcentaje de interés mensual aplicado a ventas a crédito',
        dataType: 'number',
      },
      {
        code: 'DIAS_CREDITO',
        name: 'Días de Crédito',
        description: 'Número de días de plazo para pago de facturas a crédito',
        dataType: 'number',
      },
      {
        code: 'PUNTOS_POR_COMPRA',
        name: 'Puntos por Compra',
        description: 'Cantidad de puntos de fidelidad otorgados por cada compra realizada',
        dataType: 'number',
      },
      {
        code: 'PUNTOS_POR_PESO',
        name: 'Puntos por Monto ($)',
        description: 'Cantidad de puntos otorgados por cada $X gastado (ej: 1 punto por cada $10.000)',
        dataType: 'number',
      },
      {
        code: 'DIAS_VIGENCIA_COTIZACION',
        name: 'Vigencia de Cotización (días)',
        description: 'Número de días que una cotización permanece vigente antes de expirar',
        dataType: 'number',
      },

      // ═══════ COSTOS FIJOS (OPERATIVOS) ═══════
      {
        code: 'COSTO_ARRIENDO',
        name: 'Arriendo Mensual',
        description: 'Valor mensual del arriendo del local/bodega',
        dataType: 'number',
      },
      {
        code: 'COSTO_AGUA',
        name: 'Servicio de Agua',
        description: 'Valor mensual del servicio de agua',
        dataType: 'number',
      },
      {
        code: 'COSTO_ENERGIA',
        name: 'Servicio de Energía',
        description: 'Valor mensual del servicio de energía eléctrica',
        dataType: 'number',
      },
      {
        code: 'COSTO_GAS',
        name: 'Servicio de Gas',
        description: 'Valor mensual del servicio de gas',
        dataType: 'number',
      },
      {
        code: 'COSTO_INTERNET',
        name: 'Servicio de Internet',
        description: 'Valor mensual del servicio de internet/telecomunicaciones',
        dataType: 'number',
      },
      {
        code: 'COSTO_NOMINA',
        name: 'Nómina Mensual',
        description: 'Valor total mensual de la nómina de empleados',
        dataType: 'number',
      },

      // ═══════ DATOS DEL NEGOCIO (para facturación) ═══════
      {
        code: 'NEGOCIO_NOMBRE',
        name: 'Nombre del Negocio',
        description: 'Razón social o nombre comercial que aparece en las facturas',
        dataType: 'string',
      },
      {
        code: 'NEGOCIO_NIT',
        name: 'NIT del Negocio',
        description: 'Número de Identificación Tributaria del negocio',
        dataType: 'string',
      },
      {
        code: 'NEGOCIO_DIRECCION',
        name: 'Dirección del Negocio',
        description: 'Dirección física que aparece en las facturas',
        dataType: 'string',
      },
      {
        code: 'NEGOCIO_TELEFONO',
        name: 'Teléfono del Negocio',
        description: 'Teléfono de contacto que aparece en las facturas',
        dataType: 'string',
      },
      {
        code: 'NEGOCIO_EMAIL',
        name: 'Email del Negocio',
        description: 'Correo electrónico que aparece en las facturas',
        dataType: 'string',
      },
      {
        code: 'NEGOCIO_CIUDAD',
        name: 'Ciudad',
        description: 'Ciudad del negocio para documentos',
        dataType: 'string',
      },
    ];

    let created = 0;
    for (const param of parameters) {
      const existing = await paramRepo.findOne({ where: { code: param.code } });
      if (!existing) {
        await paramRepo.save(paramRepo.create(param));
        created++;
      }
    }

    if (created > 0) {
      console.log(`✅ ${created} parámetros predefinidos de InOut creados`);
    } else {
      console.log('⚠️ Parámetros predefinidos de InOut ya existían');
    }
  }
}
