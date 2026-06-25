# Base de datos — Key 3

Postgres en **Supabase** (proyecto `barra-ontrade`, reusado y limpiado para Key 3).
Drizzle ORM es la fuente de verdad del schema (`db/schema.ts`).

> ⚠️ Desde el entorno de Claude Code **no hay acceso de red a Supabase** (política del
> sandbox + el proxy no tunelea conexiones raw a Postgres). Por eso el SQL se corre a
> mano en el **SQL Editor de Supabase**, y la app se conecta a la base recién al
> desplegarse en **Vercel** (o corriendo en tu máquina).

## Setup inicial (una vez)

En **Supabase → SQL Editor**, pega y corre **`db/sql/run_all.sql`**. Ese archivo hace, en orden:

1. **`01_wipe.sql`** — ⚠️ borra TODO el esquema `public` (la data de la Barra vieja).
2. **schema de Key 3** (`migrations/0000_*.sql`, generado por Drizzle) — crea las 20 tablas + enums.
3. **`03_seed_framework.sql`** — carga el framework Key 3 (pilares, ítems, targets por tipo de cuenta, serves, SKU mínimos, settings).

(También puedes correr los 3 archivos por separado si prefieres.)

## Después
- **Storage**: el bucket de fotos se crea por código (script de setup) usando la `service_role`.
- **Datos reales**: clientes y walkers se cargan desde `templates/` (ver su README).
- **Variables de entorno**: configurarlas en **Vercel** (y en `.env.local` para local). Ver `.env.example`.

## Cambios de schema (a futuro)
1. Editar `db/schema.ts`.
2. `npm run db:generate` → nueva migración SQL.
3. Correr la migración en Supabase (o `npm run db:migrate` desde un entorno con acceso).
