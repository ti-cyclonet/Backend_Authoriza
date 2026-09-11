-- =============================================================================
-- RESET COMPLETO — AuthorizaDB (staging / local)
-- Schema: public
--
-- Trunca TODAS las tablas del schema public de una sola vez usando CASCADE, de
-- modo que NO hay que acertar el orden de dependencias ni el nombre exacto de
-- cada tabla (útil porque varias entidades TypeORM usan el nombre de la CLASE
-- en PascalCase, p. ej. "BasicData", "NaturalPersonData", "Image", y no
-- snake_case). RESTART IDENTITY reinicia todas las secuencias/identidades.
--
-- USO EN TablePlus:
--   1. Conéctate a la base de datos local/staging de Authoriza.
--   2. Abre una pestaña de SQL (Cmd/Ctrl + T).
--   3. Pega este script y ejecútalo (Cmd/Ctrl + Enter) o "Run Current".
--
-- ⚠️  BORRA TODOS LOS DATOS del schema public. Verifica que estás conectado a la
--     base local/staging y NO a producción antes de ejecutar.
-- =============================================================================

DO $$
DECLARE
    table_list text;
BEGIN
    -- Reunir todas las tablas base del schema public (excluye vistas y tablas
    -- particionadas hijas), calificadas y con comillas para nombres PascalCase.
    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
    FROM pg_tables
    WHERE schemaname = 'public';

    IF table_list IS NULL THEN
        RAISE NOTICE 'No hay tablas en el schema public. Nada que truncar.';
        RETURN;
    END IF;

    -- TRUNCATE con CASCADE resuelve las FKs automáticamente; RESTART IDENTITY
    -- reinicia todas las columnas identity/serial de las tablas truncadas.
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';

    RAISE NOTICE 'Truncadas todas las tablas del schema public.';
END $$;

-- Reiniciar CUALQUIER secuencia restante (p. ej. secuencias no ligadas a una
-- identity de tabla truncada) para garantizar un estado limpio desde 1.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
    END LOOP;
END $$;
