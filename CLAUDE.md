# Key 3 — Contexto de desarrollo

Herramienta de **ejecución y medición del canal On Trade** (Diageo Chile). Reemplaza la
app anterior "Barra" (queda en `legacy/` solo como referencia, no se despliega).

## Stack
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS v3**
- **Drizzle ORM** (`db/schema.ts` = fuente de verdad) sobre **Postgres de Supabase**
- **Supabase Storage** para fotos de visitas
- **NextAuth** (credentials + JWT, rol en el token) + RBAC server-side (pendiente Phase 1)
- Deploy: **Vercel**

## Roles (RBAC estricto — 2 roles)
| | Walker | Manager (admin) |
|---|---|---|
| Registrar visitas en terreno | ✅ solo sus clientes | ❌ supervisa |
| Ruta / clientes / historial | ✅ propios | ✅ todas las rutas |
| Dashboards & analytics | solo lo propio | todo (channel-wide) |
| Base de clientes, framework, usuarios, ajustes | ❌ | ✅ |

El **Manager** absorbió lo que era CP&A: es el super-admin.

## Framework Key 3 — SIEMPRE config-driven (nunca hardcodear)
Vive en la base, editable por el Manager. 3 pilares + SKU mínimos:
- **Staff** · **Menú** · **Activación** (`pillars` → `framework_items` → `item_targets`)
- **SKU mínimos** (`skus` / `sku_requirements`) — medido aparte, no es pilar (NO usar la palabra "hygiene")
- **Drink Strategy** = `serves` (4 serves)
- Targets y `is_mandatory` por **tipo de cuenta** en `item_targets` (mismo ítem, dos niveles).

### Cuentas: Estándar vs AACC
- `account_type` viene **predefinido en la base de clientes**. El Walker **NUNCA** lo edita.
- AACC = piso obligatorio en share of menu (60%), primera posición (Top 3), Drink Strategy (4) y portfolio completo de SKU.
- Incumplir un ítem mandatory AACC → marcar visita con alerta **"Piso AACC incumplido"**.
- AACC debe ser **visualmente inconfundible** (badge) en la UI.

## Scoring (no improvisar — ver brief §5)
- Score = % de ítems aplicables en "Sí" (compliant), ponderado por peso del ítem.
- "No aplica" (`na`) se **excluye del denominador**. "No" cuenta en contra. Nada de crédito por no respondido / N/A.
- Score por pilar + score general por visita. Score actual del cliente = última visita.
- Numéricos (share, índice de precio): compliant si cumple el target del tipo de cuenta.
- **Calcular SIEMPRE server-side** al hacer submit. Nunca confiar en el cliente.

## Design tokens (estilo Mercury — `tailwind.config.ts` + `app/globals.css`)
- Fondo `#FAFAFB` (canvas) · cards blancas, `rounded-2xl` (16px), borde `#EEEEF2` (line), sombra `soft`.
- **Un solo acento**: indigo `#5B5BD6` (`accent`). Verde/ámbar/rojo (`ok`/`warn`/`bad`) solo para cumplimiento.
- Texto `#1A1A1E` (ink), muted `#6B6B76`. Tipografía **Inter** (`@fontsource/inter`).
- Mobile-first Walker (bottom tab bar, CTA "Nueva visita"); Manager con sidebar.
- Maqueta de referencia aprobada en `mockup/`.

## Reglas no negociables (lecciones de "Barra")
1. **Mobile-first** para flujos del Walker (probar a 375px, touch ≥ 44px).
2. **Cero pérdida de datos**: autosave de respuestas (draft) en cada cambio; submit con reintento.
3. **Fotos en mobile**: cámara + galería, compresión cliente, estado de subida visible.
4. **Estado persiste** entre navegación/re-login (servidor = fuente de verdad).
5. **Muro de actividad**: log denso tipo Mercury/Linear. NUNCA red social (sin avatares, likes, reposts, composer).
6. **Ser asertivo, no optimista**: no declarar "listo" sin probar. Usar ✅ probado / ⚠️ lógico sin probar / 🔴 issue conocido.
7. No mostrar nombres de infra (Supabase, etc.) en texto visible al usuario.

## ⚠️ Acceso a la base desde este entorno
El sandbox de Claude Code **no puede conectarse a Supabase** (política de red + el proxy no
soporta Postgres raw). Implicancias:
- Migraciones/seed/import → se corren en **Supabase SQL Editor** (ver `db/README.md`) o desde Vercel.
- Pruebas end-to-end con base → en un **deploy de Vercel**, no en este contenedor.
- Las llaves (`DATABASE_URL`, `SUPABASE_*`, `AUTH_SECRET`) van en **Vercel** / `.env.local` (gitignored).

## Comandos
```
npm run dev          # dev local (necesita .env.local con acceso a la base)
npm run build        # build de producción
npm run db:generate  # generar migración SQL desde db/schema.ts
npm run db:migrate   # aplicar migraciones (requiere acceso a la base)
```

## Estructura
```
app/                 # rutas (App Router)
components/           # UI
lib/                 # db client, auth, utils
db/
  schema.ts          # Drizzle (fuente de verdad)
  migrations/        # SQL generado (versionado)
  sql/               # 01_wipe · 03_seed_framework · run_all (para Supabase)
templates/           # CSV para cargar clientes y usuarios reales
mockup/              # maqueta estática aprobada (referencia visual)
legacy/              # app Barra anterior (referencia, no se usa)
```
