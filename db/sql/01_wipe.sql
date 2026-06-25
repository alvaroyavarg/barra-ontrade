-- Key 3 — RESET del esquema public.
-- ⚠️ Borra TODAS las tablas y datos de la Barra vieja en este proyecto.
-- Correr una sola vez, antes del schema de Key 3.

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all routines  in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
