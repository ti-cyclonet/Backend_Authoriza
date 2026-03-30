# Dashboard API

## Descripción
Módulo que proporciona endpoints para obtener estadísticas del sistema para mostrar en el dashboard del frontend.

## Endpoints

### GET /dashboard/stats
Obtiene estadísticas generales del sistema.

**Autenticación:** Requerida (JWT)

**Respuesta:**
```json
{
  "users": {
    "total": 150,
    "active": 120,
    "inactive": 20,
    "unconfirmed": 10,
    "byRole": [
      { "role": "ADMIN", "count": 5 },
      { "role": "USER", "count": 145 }
    ]
  },
  "invoices": {
    "total": 500,
    "totalValue": 125000.50,
    "paid": 400,
    "pending": 80,
    "overdue": 20,
    "byStatus": [
      { "status": "Paid", "count": 400, "value": 100000.00 },
      { "status": "Issued", "count": 80, "value": 20000.50 }
    ],
    "monthlyRevenue": [
      { "month": "2024-01", "revenue": 15000.00 },
      { "month": "2023-12", "revenue": 18000.00 }
    ]
  },
  "contracts": {
    "total": 200,
    "active": 180,
    "expired": 15,
    "byStatus": [
      { "status": "ACTIVE", "count": 180 },
      { "status": "EXPIRED", "count": 15 }
    ]
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### GET /dashboard/invoices/stats
Obtiene estadísticas de facturas filtradas por rango de fechas.

**Autenticación:** Requerida (JWT)

**Parámetros de consulta:**
- `startDate` (opcional): Fecha de inicio (formato: YYYY-MM-DD)
- `endDate` (opcional): Fecha de fin (formato: YYYY-MM-DD)

**Ejemplo:** `/dashboard/invoices/stats?startDate=2024-01-01&endDate=2024-01-31`

### GET /dashboard/recent-activity
Obtiene actividad reciente del sistema (últimos 5 registros de cada entidad).

**Autenticación:** Requerida (JWT)

**Respuesta:**
```json
{
  "recentUsers": [
    {
      "id": "uuid",
      "username": "user@example.com",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "recentInvoices": [
    {
      "id": 123,
      "value": 1500.00,
      "status": "Paid",
      "user": "user@example.com",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "recentContracts": [
    {
      "id": "uuid",
      "value": 5000.00,
      "status": "ACTIVE",
      "user": "user@example.com",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Seguridad
- Todos los endpoints requieren autenticación JWT
- El token debe enviarse en el header `Authorization: Bearer <token>`
- Los endpoints están protegidos por el guard `JwtAuthGuard`

## Uso en el Frontend
```typescript
// Obtener estadísticas generales
const stats = await fetch('/api/dashboard/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(res => res.json());

// Obtener estadísticas de facturas por rango de fechas
const invoiceStats = await fetch('/api/dashboard/invoices/stats?startDate=2024-01-01&endDate=2024-01-31', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(res => res.json());
```