ALTER TABLE user_roles ADD COLUMN "contractId" uuid NULL;

ALTER TABLE user_roles ADD CONSTRAINT "FK_user_roles_contract" 
FOREIGN KEY ("contractId") REFERENCES contracts(id) ON DELETE CASCADE;
