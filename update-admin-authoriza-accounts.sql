-- Script para actualizar la configuración del paquete Cyclon Plus [+]
-- Cambiar adminAuthoriza de 1 cuenta a 2 cuentas

UPDATE configuration_package 
SET total_account = 2 
WHERE package_id IN (
    SELECT id FROM package WHERE name = 'Cyclon Plus [+]'
) 
AND rol_id IN (
    SELECT id FROM rol WHERE str_name = 'adminAuthoriza'
);

-- Verificar el cambio
SELECT 
    p.name as package_name,
    r.str_name as role_name,
    cp.total_account,
    cp.price
FROM configuration_package cp
JOIN package p ON cp.package_id = p.id
JOIN rol r ON cp.rol_id = r.id
WHERE p.name = 'Cyclon Plus [+]'
ORDER BY r.str_name;