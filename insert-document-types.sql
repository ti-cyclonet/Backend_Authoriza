-- Script para insertar tipos de documento
-- Ejecutar directamente en la base de datos

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS document_types (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    description varchar(100) NOT NULL,
    document_type varchar(10) NOT NULL,
    dtm_creation_date timestamp DEFAULT CURRENT_TIMESTAMP,
    dtm_latest_update_date timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Insertar tipos de documento si no existen
INSERT INTO document_types (id, description, document_type) 
SELECT uuid_generate_v4(), 'Cédula de ciudadanía', 'CC'
WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE document_type = 'CC');

INSERT INTO document_types (id, description, document_type) 
SELECT uuid_generate_v4(), 'Cédula de extranjería', 'CE'
WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE document_type = 'CE');

INSERT INTO document_types (id, description, document_type) 
SELECT uuid_generate_v4(), 'Pasaporte', 'PP'
WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE document_type = 'PP');

INSERT INTO document_types (id, description, document_type) 
SELECT uuid_generate_v4(), 'Tarjeta de identidad', 'TI'
WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE document_type = 'TI');

INSERT INTO document_types (id, description, document_type) 
SELECT uuid_generate_v4(), 'Nit', 'NIT'
WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE document_type = 'NIT');