-- Eliminar la foreign key antigua que está causando conflicto
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS "FK_583c9160e097c4787f387f6b034";
