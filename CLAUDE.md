# Key 3 — Contexto de desarrollo

Herramienta oficial de ejecución y medición del canal On Trade de Diageo Chile.
Walkers miden ejecución en bares/restaurantes contra el framework **Key 3**
(3 pilares: **Staff · Menú · Activación**). Reemplaza a la app anterior "Barra"
(ON 5) — partida limpia, sin migración de código.

## Regla #1 — Framework config-driven (NUNCA hardcodear)

Los pilares, items, pesos, targets, serves y flags mandatory viven en la DB
(`pillars`, `items`, `item_targets`, `serves`). CP&A los edita desde el Admin
panel sin tocar código. **Prohibido** hardcodear lógica de pilares/items en
componentes o endpoints; todo se deriva de la config + snapshots.

## Stack y decisiones

- **Next.js 14 (App Router) + TypeScript estricto + Tailwind v4** (tokens en `@theme`, `src/app/globals.css`)
- **Postgres (Neon) + Drizzle ORM** — schema en `src/db/schema.ts`, migraciones versionadas en `/drizzle` (`drizzle-kit generate`). Driver único `pg` (node-postgres) para local y Neon; usar connection string **pooled** de Neon en producción.
- **NextAuth v4** credentials + JWT (`role` y `routeId` en el token). RBAC en `src/middleware.ts` por prefijo + re-verificación server-side en cada page/handler. Nunca confiar en el cliente.
- **Vercel Blob** para fotos (Fase 2), encapsulado en `lib/storage.ts` para poder migrar a S3.
- Sin `SessionProvider` por ahora: las pages server pasan datos de sesión como props.

## Comandos

```bash
npm run dev          # dev server
npm run build        # build producción
npm run db:generate  # genera migración desde src/db/schema.ts
npm run db:migrate   # aplica migraciones
npm run db:seed      # siembra framework + demo (-- --force borra todo)
```

## Variables de entorno

```env
DATABASE_URL=        # Postgres (Neon pooled en prod)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
# Fase 2: BLOB_READ_WRITE_TOKEN=
```

Usuarios demo (password `key3demo`): `walker@key3.cl` · `manager@key3.cl` · `cpa@key3.cl`

## Roles y RBAC

| Rol | Acceso |
|---|---|
| `walker` | Su ruta, sus clientes, registrar visitas, programas. Home: `/ruta` |
| `manager` | Todas las rutas (lectura), dashboards equipo, aprobar programas, 1 comentario coaching por visita. Home: `/dashboard` |
| `cpa` | Todo lo anterior + medir en cualquier cuenta + `/admin/**` (único rol). Home: `/dashboard` |

`account_type` (estandar/aacc) y `is_reserve` vienen de la base cargada por
CP&A — el Walker **jamás** los edita.

## Reglas de scoring (no improvisar)

- `score = 100 × Σ(weight × compliant) / Σ(weight)` sobre items aplicables respondidos; **N/A sale del denominador**; "No" castiga; jamás dar crédito por items sin responder (el wizard exige completitud antes del submit).
- Numéricos: compliant si cumple target del tipo de cuenta (`comparator` gte/lte).
- Price index (solo Whiscola vs Piscola por ahora): walker registra precio Piscola → el sistema muestra precio máximo = Piscola × 1,2 → compliant si precio Whiscola ≤ máximo. Si no cumple, queda como tarea por corregir.
- Item `mandatory` AACC incumplido → `visits.aacc_alert = true`, independiente del score.
- Las respuestas guardan **snapshots** de config (`weight/target/comparator/mandatory`): cambios de framework no reescriben la historia.
- Analytics: siempre la última visita por cliente; tendencias usan todas las del rango.

## Reglas de comportamiento (lecciones de "Barra")

1. **Mobile-first** en flujos Walker: probar a 375px, touch targets ≥ 44px, sin anchos fijos.
2. **Cero pérdida de datos**: autosave por respuesta (server + espejo local), drafts resumibles, retry en submit.
3. Fotos: captura + galería, compresión client-side, estado de subida visible.
4. El estado sobrevive navegación y re-login: el server es la fuente de verdad.
5. **Reportar con honestidad**: ✅ probado · ⚠️ lógica correcta sin probar · 🔴 issue conocido. Nunca declarar "listo" sin probar.
6. Muro de actividad = log profesional denso (Mercury/Linear), NO red social: sin likes, sin avatares con foto, sin composer. Entradas compactas (~96px), 5–6 visitas por pantalla mobile.

## Design tokens (Mercury-style — definidos en `globals.css`)

- Fondo `#FAFAFB` · cards blancas, radius 16px (`rounded-card`), borde `#EEEEF2`, sombra suave (`shadow-card`)
- Acento único `#5B5BD6` (`accent`, `accent-strong`, `accent-soft`); verde/rojo SOLO para compliance
- Texto `#1A1A1E` (`ink`), muted `#6B6B76`; tipografía Inter, jerarquía por peso/tamaño; KPIs 32–40px semibold
- Botones pill, segmented controls para Sí/No, transiciones 200ms + `active:scale-0.97` (clase `.tappable`)
- Copy UI en español chileno, conciso

## Estado de fases

- [x] **Fase 1** — fundaciones: scaffold, tokens, auth + RBAC, schema + seed, app shell
- [ ] **Fase 2** — flujo Walker E2E: ruta → nueva visita → score → muro de actividad
- [ ] **Fase 3** — Admin CP&A: framework editor, serves, carga clientes, usuarios
- [ ] **Fase 4** — dashboards Manager/CP&A + comentarios coaching
- [ ] **Fase 5** — programas de staff (incentivos y capacitaciones)

Fuera de alcance por decisión de negocio: SKU/assortment (eliminado del
framework), alerta trimestral de incentivos, price index en serves ≠ Whiscola
(se indexan después si funciona bien).

## Branch activo

`claude/vigilant-einstein-eoa61p` — el código viejo de Barra quedó en `main`.
