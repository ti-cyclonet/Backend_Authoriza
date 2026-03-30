# Entity Codes System

## Descripción
Sistema de códigos personalizados para entidades que genera consecutivos únicos compuestos por prefijo de dos letras y número de 5 dígitos.

## Códigos Implementados

| Entidad  | Prefijo | Formato | Ejemplo |
|----------|---------|---------|---------|
| Usuario  | CU      | CU00000 | CU00001 |
| Factura  | DF      | DF00000 | DF00001 |
| Contrato | DC      | DC00000 | DC00001 |
| Paquete  | DP      | DP00000 | DP00001 |

## Estructura

### Entidad EntityCode
```typescript
{
  id: string;           // UUID único
  entityType: string;   // Tipo de entidad (User, Invoice, etc.)
  prefix: string;       // Prefijo de dos letras
  currentNumber: number; // Número consecutivo actual
  digitLength: number;  // Longitud de dígitos (5 por defecto)
}
```

### Servicio EntityCodeService
- `generateCode(entityType: string)`: Genera el siguiente código para la entidad
- `initializeEntityCodes()`: Inicializa los códigos base en la BD

## Implementación en Entidades

Cada entidad tiene un campo `code` único:
```typescript
@Column({ unique: true, nullable: true })
code: string;
```

## Uso en Servicios

```typescript
// En el servicio de creación
const code = await this.entityCodeService.generateCode('User');
const user = this.userRepository.create({ ...dto, code });
```

## Endpoints

### GET /api/dashboard/entity-codes
Obtiene los códigos más recientes de cada entidad para el dashboard.

## Migración

La migración `1756829474480-add-entity-codes.ts` incluye:
- Creación de tabla `entity_codes`
- Agregado de columna `code` a entidades existentes
- Inicialización de códigos base
- Restricciones de unicidad

## Características

- **Atomicidad**: Generación thread-safe de códigos
- **Unicidad**: Códigos únicos por entidad
- **Escalabilidad**: Soporte para nuevas entidades
- **Consistencia**: Formato estándar XX00000
- **Trazabilidad**: Códigos legibles y ordenados