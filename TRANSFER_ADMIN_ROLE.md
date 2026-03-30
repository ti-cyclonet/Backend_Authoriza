# Transferencia de Rol AdminAuthoriza

## Contexto
Authoriza es una aplicación interna de CycloNet. El usuario 'ti.cyclonet' es el super usuario inicial, pero debe quedar como 'accountOwner' (gestión de contratos/facturación) y crear un administrador operativo con 'adminAuthoriza'.

## Pasos

### 1. Ejecutar migración para crear rol 'accountOwner'
```bash
npm run migration:run
```

### 2. Crear el nuevo usuario administrador desde el frontend
Crear el usuario que será el administrador operativo del sistema.

### 3. Ejecutar script de configuración
```bash
npm run setup:admin
```

El script te pedirá:
- Email del nuevo administrador
- Confirmación

Y automáticamente:
- Remueve 'adminAuthoriza' de ti.cyclonet
- Asigna 'accountOwner' a ti.cyclonet
- Asigna 'adminAuthoriza' al nuevo usuario
- Crea la dependencia entre usuarios

## Resultado
- ti.cyclonet → accountOwner (gestión administrativa)
- nuevo usuario → adminAuthoriza (operaciones diarias)
- Se aprovechan las 2 cuentas del contrato Cyclon Plus [+]
