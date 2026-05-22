-- 1. Eliminar columnas legacy de la tabla package
-- Estas columnas ya no se usan. Los límites se controlan con usage_limit_variables.
ALTER TABLE package DROP COLUMN IF EXISTS "maxProducts";
ALTER TABLE package DROP COLUMN IF EXISTS "maxUsers";
ALTER TABLE package DROP COLUMN IF EXISTS "maxInvoices";

-- 2. Marcar los paquetes CYCLON N00 y Cyclon Plus [+] como no facturables (gratuitos)
UPDATE package SET "isBillable" = false WHERE code = 'DP00003' OR name = 'CYCLON N00';
UPDATE package SET "isBillable" = false WHERE code = 'DP00001' OR name = 'Cyclon Plus [+]';

-- 3. Verificar
SELECT id, code, name, price, "isBillable" FROM package;
