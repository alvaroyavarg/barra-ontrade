-- ============================================================
-- BARRA · On Trade Execution — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Cuentas / locales (tabla maestra)
create table if not exists locals (
  id                 text primary key,
  account_code       text default '',
  walker_name        text default '',
  sheet_name         text default '',
  legal_name         text default '',
  name               text not null,
  distributor        text default '',
  region             text default '',
  office             text default '',
  district           text default '',
  channel            text default '',
  segment            text default '',
  subchannel         text default '',
  address            text default '',
  developer          text default '',
  skus               text default '',
  agreement          text default '',
  agreement_end_date text default '',
  menu_url           text default '',
  observation        text default '',
  occasion           text default '',
  health_score       integer default 50,
  has_aacc           boolean default false,
  investment         numeric default 0,
  tags               text[] default '{}',
  ruta               text default '',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Contactos por cuenta
create table if not exists contacts (
  id         text primary key,
  local_id   text references locals(id) on delete cascade,
  name       text not null,
  role       text default '',
  note       text default '',
  phone      text default '',
  created_at timestamptz default now()
);

-- Notas y minutas de visita
create table if not exists notes (
  id          text primary key,
  local_id    text references locals(id) on delete cascade,
  author      text default '',
  date_label  text default '',
  note_date   timestamptz default now(),
  type        text default 'Minuta',
  text        text not null,
  next_action text default '',
  created_at  timestamptz default now()
);

-- Misiones por cuenta
create table if not exists missions (
  id         text primary key,
  local_id   text references locals(id) on delete cascade,
  title      text not null,
  origin     text default '',
  impact     text default '',
  reason     text default '',
  status     text default 'Sugerida',
  progress   integer default 0,
  next_step  text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pilares On Five por cuenta (uno por pilar)
create table if not exists pillars (
  id          uuid primary key default gen_random_uuid(),
  local_id    text references locals(id) on delete cascade,
  pillar      text not null,   -- staff | assortment | menu | branding | activation
  score       text default 'Sin registro',
  summary     text default '',
  details     text[] default '{}',
  next_action text default '',
  last_audit  timestamptz,
  updated_at  timestamptz default now(),
  unique (local_id, pillar)
);

-- Auditorías de assortment en terreno
create table if not exists assortment_audits (
  id         uuid primary key default gen_random_uuid(),
  local_id   text references locals(id) on delete cascade,
  checked_ids text[] default '{}',
  saved_at   text default '',
  author     text default '',
  present    integer default 0,
  total      integer default 0,
  pct        integer default 0,
  created_at timestamptz default now()
);

-- Kanban de tareas
create table if not exists kanban_cards (
  id         text primary key,
  local_id   text references locals(id) on delete set null,
  local_name text default '',
  title      text not null,
  zone       text default '',
  origin     text default '',
  priority   text default 'Media',
  due        text default '',
  column_id  text default 'todo',
  updated_at timestamptz default now()
);

-- ── Row-Level Security (RLS) ────────────────────────────────
-- Habilitar RLS en todas las tablas
alter table locals           enable row level security;
alter table contacts         enable row level security;
alter table notes            enable row level security;
alter table missions         enable row level security;
alter table pillars          enable row level security;
alter table assortment_audits enable row level security;
alter table kanban_cards     enable row level security;

-- Política abierta para anon (ajustar según auth real en el futuro)
create policy "anon_all_locals"            on locals            for all using (true) with check (true);
create policy "anon_all_contacts"          on contacts          for all using (true) with check (true);
create policy "anon_all_notes"             on notes             for all using (true) with check (true);
create policy "anon_all_missions"          on missions          for all using (true) with check (true);
create policy "anon_all_pillars"           on pillars           for all using (true) with check (true);
create policy "anon_all_audits"            on assortment_audits for all using (true) with check (true);
create policy "anon_all_kanban"            on kanban_cards      for all using (true) with check (true);

-- Desarrolladores Andina (códigos CL fijos, datos editables)
create table if not exists developers (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  first_name text default '',
  last_name  text default '',
  phone      text default '',
  email      text default '',
  updated_at timestamptz default now()
);

alter table developers enable row level security;
create policy "anon_all_developers" on developers for all using (true) with check (true);

insert into developers (code, first_name, last_name, phone, email) values
  ('CL51', 'Pia',       'Rojas',    '56972252170', 'projas@koandina.com'),
  ('CL52', 'Fernando',  'Perez',    '56942089220', 'fperezve@koandina.com'),
  ('CL53', 'Alexis',    'Fuentes',  '56998837747', 'afuentesvaldivieso@koandina.com'),
  ('CL54', 'Sebastian', 'Cornejo',  '56957092336', 'scornejos@koandina.com'),
  ('CL55', 'Vicente',   'Chellew',  '56971062663', 'vchellew@koandina.com'),
  ('CL56', 'Santiago',  'Izurieta', '56957189826', 'sanizurieta@koandina.com'),
  ('CL57', 'Fernando',  'Acuña',    '56934686689', 'facunaf@koandina.com'),
  ('CL58', 'Valentina', 'Albornoz', '56950094360', 'valbornoz@koandina.com')
on conflict (code) do nothing;

-- ── Índices de apoyo ─────────────────────────────────────────
create index if not exists idx_contacts_local      on contacts (local_id);
create index if not exists idx_notes_local         on notes (local_id, note_date desc);
create index if not exists idx_missions_local      on missions (local_id);
create index if not exists idx_pillars_local       on pillars (local_id);
create index if not exists idx_audits_local        on assortment_audits (local_id, created_at desc);
create index if not exists idx_kanban_local        on kanban_cards (local_id);
create index if not exists idx_locals_walker       on locals (walker_name);
