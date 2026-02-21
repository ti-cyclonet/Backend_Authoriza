-- Crear tabla potential_users en Authoriza
CREATE TABLE IF NOT EXISTS potential_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    source_application VARCHAR(50) NOT NULL,
    basic_data_id INTEGER,
    document_type_id INTEGER,
    document_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'POTENTIAL',
    converted_to_user_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS IDX_potential_users_email ON potential_users(email);
CREATE INDEX IF NOT EXISTS IDX_potential_users_source ON potential_users(source_application);