# Key 3

Herramienta de ejecución y medición del canal On Trade — Diageo Chile.
Framework **Key 3**: Staff · Menú · Activación.

## Setup local

```bash
npm install
cp .env.example .env.local   # completar DATABASE_URL y NEXTAUTH_SECRET
npm run db:migrate           # aplica migraciones (carpeta /drizzle)
npm run db:seed              # framework inicial + datos demo
npm run dev
```

Usuarios demo (contraseña `key3demo`):

| Email | Rol |
|---|---|
| `walker@key3.cl` | Walker (Ruta Oriente) |
| `manager@key3.cl` | OT Manager |
| `cpa@key3.cl` | CP&A (admin) |

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · Postgres (Neon) · NextAuth · Vercel

## Deploy (Vercel)

Variables requeridas: `DATABASE_URL` (Neon **pooled**), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

Más contexto de desarrollo en [CLAUDE.md](./CLAUDE.md).
