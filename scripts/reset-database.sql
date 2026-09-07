-- =============================================================================
-- RESET COMPLETO — AuthorizaDB   (schema: public)
-- =============================================================================
-- ⚠️  DESTRUCTIVO E IRREVERSIBLE. Borra TODOS los datos de Authoriza.
--     Authoriza es el login de TODO el ecosistema (Shotra, Kiri, InOut,
--     FactoNet). Vaciarlo deja a todos los usuarios sin acceso hasta que los
--     seeds se vuelvan a ejecutar.
--
-- ORM: TypeORM con synchronize:true  →  al REINICIAR el contenedor,
--      TypeORM recrea el esquema y main.ts ejecuta los seeds automáticamente.
--      Por eso NO hace falta correr migraciones ni un seed manual: basta con
--      ejecutar este SQL y luego reiniciar el contenedor (ver README.md).
--
-- Ejecutar en la base de datos de Authoriza (NO en otra). Verifica primero:
--     SELECT current_database();   -- debe decir AuthorizaDB
-- =============================================================================

BEGIN;

-- Desactiva los triggers de FK: permite borrar sin importar el orden y resuelve
-- la dependencia circular user <-> basic_data (ambos lados tienen @JoinColumn)
-- y la auto-referencia de menuoption.
SET session_replication_role = 'replica';

-- Hijos / más dependientes primero (con replica role el orden no es crítico).
DELETE FROM public.global_parameters_for_invoices;
DELETE FROM public.global_parameters_periods;
DELETE FROM public.customer_parameters_periods;
DELETE FROM public.rol_menuoption;
DELETE FROM public.configuration_package;
DELETE FROM public.usage_limit_variables;
DELETE FROM public.image;
DELETE FROM public.user_roles;
DELETE FROM public.user_dependencies;
DELETE FROM public.invoices;
DELETE FROM public.natural_person_data;
DELETE FROM public.legal_entity_data;
DELETE FROM public.contract;
DELETE FROM public.basic_data;
DELETE FROM public."user";
DELETE FROM public.rol;
DELETE FROM public.menuoption;
DELETE FROM public.application;
DELETE FROM public.package;
DELETE FROM public.global_parameters;
DELETE FROM public.customer_parameters;
DELETE FROM public.periods;
DELETE FROM public.document_types;
DELETE FROM public.entity_codes;
DELETE FROM public.email_templates;
DELETE FROM public.assistant_sessions;
DELETE FROM public.system_logs;
DELETE FROM public.potential_users;

-- Reactiva los triggers de FK
SET session_replication_role = 'origin';

-- Reiniciar todas las secuencias del schema public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT s.relname AS seq_name
        FROM pg_class s
        JOIN pg_namespace n ON n.oid = s.relnamespace
        WHERE s.relkind = 'S' AND n.nspname = 'public'
    ) LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.seq_name) || ' RESTART WITH 1';
    END LOOP;
END $$;

COMMIT;

-- Después de ejecutar este SQL, REINICIA el contenedor para que los seeds
-- recreen aplicaciones, paquetes, roles y el usuario admin (ver README.md).
