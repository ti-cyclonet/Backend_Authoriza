-- Eliminar la foreign key existente
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS "FK_user_roles_principalUser";

-- Renombrar la columna
ALTER TABLE user_roles RENAME COLUMN "principalUserId" TO "contractId";

-- Eliminar la foreign key hacia users
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS "FK_7629a888-76b4-4b44-8ffb-56e2c0797fe5";

-- Agregar la nueva foreign key hacia contract (sin 's')
ALTER TABLE user_roles ADD CONSTRAINT "FK_user_roles_contract" 
FOREIGN KEY ("contractId") REFERENCES contract(id) ON DELETE CASCADE;
