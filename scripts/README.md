# Reset completo de la base de datos — Authoriza

Script para **vaciar por completo** la base de datos de Authoriza y dejar que
los seeds la recreen desde cero.

> ⚠️ **Operación destructiva e irreversible.** Authoriza es el control de acceso
> de **todo el ecosistema** (Shotra, Kiri, InOut, FactoNet). Al vaciarlo, todos
> los usuarios pierden acceso hasta que los seeds vuelvan a correr. Úsalo solo
> con plena intención y, en producción, idealmente con un respaldo previo.

## Cómo funciona

Authoriza usa **TypeORM con `synchronize: true`**. Esto significa que:

- El **esquema** (tablas, enums) lo mantiene TypeORM a partir de las entidades:
  se recrea/sincroniza cada vez que arranca el contenedor.
- Los **datos base** (aplicaciones, paquetes, roles, menús, usuario admin,
  plantillas de email, parámetros) los recrean los **seeds** que corren en
  `src/main.ts` al iniciar.

Por eso el reset es de **2 pasos**: vaciar datos (SQL) y reiniciar el contenedor
(los seeds repueblan). **No** se corren migraciones ni seed manual.

## Archivos

- `reset-database.sql` — vacía todas las tablas de Authoriza (envuelto en una
  transacción, con `session_replication_role = 'replica'` para saltarse el orden
  de las FK y la circular `user ↔ basic_data`), y reinicia las secuencias.

## Pasos

### 1. Ejecutar el SQL (TablePlus o psql)

Conéctate a la base de **Authoriza** y **verifica primero** que es la correcta:

```sql
SELECT current_database();   -- debe decir AuthorizaDB (o AuthorizaDB_staging en staging)
```

Luego ejecuta el contenido de `reset-database.sql`.

Alternativa por consola (desde una máquina con acceso a la BD):

```bash
psql "host=<HOST> port=5432 dbname=AuthorizaDB user=cyclonet_admin sslmode=require" \
  -f reset-database.sql
```

### 2. Reiniciar el contenedor (recrea esquema + seeds)

En el servidor (EC2):

```bash
sudo docker restart cyclonet-authoriza-api
sudo docker logs cyclonet-authoriza-api --tail 60   # confirmar que los seeds corrieron
```

Deberías ver en el log la creación de aplicaciones, paquetes, roles y el usuario
admin. Con eso la base queda reconstruida y limpia.

## Entornos

| Entorno | Base de datos | Contenedor |
|---|---|---|
| Producción | `AuthorizaDB` | `cyclonet-authoriza-api` |
| Staging | `AuthorizaDB_staging` | (según despliegue de staging) |

El SQL es el mismo; solo cambia a qué base te conectas y qué contenedor reinicias.

## Notas

- El usuario admin recreado es `ti.cyclonet@hotmail.com` (contraseña inicial en
  `src/seeds/user.seed.ts`, con `mustChangePassword`).
- Tras el reset, los usuarios de las demás apps deben **volver a registrarse /
  iniciar sesión** para regenerar sus datos.
