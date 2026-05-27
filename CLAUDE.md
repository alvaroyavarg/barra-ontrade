# BARRA On Trade — Contexto de desarrollo

## Stack
- React 18 + Vite 7 + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- Vercel (deploy + serverless functions en `/api/`)
- Branch activo: `claude/serene-ramanujan-PrSfy`

## Roles de usuario
| Rol | Acceso |
|-----|--------|
| `walker` | Su ruta y cuentas asignadas |
| `manager` | Vista global de todos los walkers |
| `cpa` | Dashboard CP&A, solicitudes de branding, kanban |

## On Five (pilares de ejecución)
`staff` · `assortment` · `menu` · `branding` · `activation`

## Arquitectura de datos
- `useSupabaseData` hook (`src/hooks/useSupabaseData.js`) — fuente única de verdad para todo el estado
- Actualizaciones optimistas con rollback en fallo de DB
- `uid()` helper en `OnTradeCrm.jsx` usa `crypto.randomUUID()` para IDs collision-safe
- **Regla de seguridad**: nunca mostrar la palabra "Supabase" en ningún texto visible para el usuario

## Archivos clave
```
src/
  App.jsx                         # ErrorBoundary + routing raíz
  contexts/AuthContext.jsx        # Auth + perfil de usuario
  hooks/useSupabaseData.js        # Estado global + todas las acciones DB
  components/OnTradeCrm.jsx       # Componente principal (~6600 líneas)
  services/
    localsService.js              # CRUD cuentas, contactos, misiones, pilares
    notesService.js               # CRUD notas/minutas
    assortmentService.js          # Auditorías de assortment
    kanbanService.js              # Tarjetas kanban
    brandingRequestsService.js    # Solicitudes Walker→CP&A
  lib/supabase.js                 # Cliente Supabase + isSupabaseEnabled flag
api/                              # Vercel serverless (usa SUPABASE_SERVICE_ROLE_KEY)
supabase_schema.sql               # Schema completo — ejecutar en SQL Editor
```

## Variables de entorno requeridas
```env
# Frontend (Vite)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# API serverless (Vercel)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## ⚠️ Tareas pendientes en Supabase (ejecutar antes de usar en producción)

### SQL Editor — ejecutar en orden:

```sql
-- 1. Tabla branding_requests (nueva — copiar bloque completo de supabase_schema.sql)
-- Ver líneas 139-173 de supabase_schema.sql

-- 2. Columna photos en notes (para adjuntar fotos a minutas)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS photos text[] default '{}';

-- 3. Tabla profiles (si no fue creada por Auth trigger)
-- Ver líneas 7-21 de supabase_schema.sql
```

### Storage — crear bucket:
1. Dashboard → Storage → New bucket
2. Nombre: `evidencias`, activar Public
3. Ejecutar en SQL Editor:
```sql
CREATE POLICY "anon_all_evidencias"
  ON storage.objects FOR ALL
  USING (bucket_id = 'evidencias')
  WITH CHECK (bucket_id = 'evidencias');
```

---

## Estado del proyecto (mayo 2025)

### ✅ Completado
- [x] ErrorBoundary en App level
- [x] `uid()` con `crypto.randomUUID()` (8 ocurrencias reemplazadas)
- [x] calcHealthScore corregido (fallback 30, "Sin auditar": 30)
- [x] publishNote con rollback en fallo DB
- [x] saveAssortmentAudit pasa `lastAuditIso` real al DB
- [x] updatePillar usa timestamp real de auditoría
- [x] fetchLatestAudit maneja PGRST116 (sin filas) correctamente
- [x] kanbanService `local_name` fijo en cardToRow
- [x] brandingRequestsService completo (fetch/submit/update)
- [x] brandingRequests en useSupabaseData (optimistic + rollback)
- [x] Props threading: OnTradeCrm → ExecutionWorkspace → OnFiveModuleDetail → BrandingAuditPanel
- [x] BrandingRequestsBoard wired a props reales
- [x] CpaDashboard con KPIs reales de brandingRequests
- [x] ManagerDashboard con cuentas urgentes reales (healthScore < 60)
- [x] Código muerto removido (~77 líneas)
- [x] Badge "Conectado ✓" (sin "Supabase" visible)
- [x] Foto × botón más grande en mobile (h-7 w-7)
- [x] Hamburger más grande (h-10 w-10)

### 🔮 Backlog (no urgente)
- [ ] RLS real enforcement (actualmente políticas all-open)
- [ ] TypeScript migration
- [ ] Paginación para listas de cuentas largas
- [ ] Testing framework (Vitest + React Testing Library)
- [ ] Code splitting para reducir bundle ~950KB
- [ ] Push notifications para CP&A cuando llega solicitud nueva
