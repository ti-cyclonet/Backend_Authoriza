-- Limpiar tablas duplicadas y usar solo document_types

-- Eliminar tabla duplicada
DROP TABLE IF EXISTS document_type_catalog;

-- Limpiar tabla document_types
DELETE FROM document_types;

-- Insertar los tipos de documento correctos
INSERT INTO document_types (id, description, document_type) VALUES
(uuid_generate_v4(), 'Cédula de ciudadanía', 'CC'),
(uuid_generate_v4(), 'Cédula de extranjería', 'CE'),
(uuid_generate_v4(), 'Pasaporte', 'PP'),
(uuid_generate_v4(), 'Tarjeta de identidad', 'TI'),
(uuid_generate_v4(), 'Nit', 'NIT');