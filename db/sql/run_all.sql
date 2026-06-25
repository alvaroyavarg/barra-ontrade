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

-- ===== SCHEMA (generado por Drizzle) =====

CREATE TYPE "public"."account_type" AS ENUM('estandar', 'aacc');--> statement-breakpoint
CREATE TYPE "public"."answer" AS ENUM('si', 'no', 'na');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('planned', 'scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('incentivo', 'capacitacion_comercial', 'capacitacion_marca');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('binary', 'numeric', 'percent');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('walker', 'manager');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"comuna" text,
	"route_id" uuid,
	"walker_id" uuid,
	"account_type" "account_type" DEFAULT 'estandar' NOT NULL,
	"is_reserve" boolean DEFAULT false NOT NULL,
	"contract_info" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "framework_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"question_type" "question_type" NOT NULL,
	"weight" numeric(5, 2) DEFAULT '1' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "framework_items_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "item_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"account_type" "account_type" NOT NULL,
	"applies" boolean DEFAULT true NOT NULL,
	"target_value" numeric(7, 2),
	"is_mandatory" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"visit_id" uuid,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pillars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weight" numeric(5, 2) DEFAULT '1' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pillars_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"comuna" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "serves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"reference_price_index" numeric(6, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photo_required_per_item" boolean DEFAULT false NOT NULL,
	"allow_na" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sku_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"account_type" "account_type" NOT NULL,
	"required" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_program_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"walker_id" uuid,
	"type" "program_type" NOT NULL,
	"title" text NOT NULL,
	"status" "program_status" DEFAULT 'planned' NOT NULL,
	"start_date" date,
	"end_date" date,
	"prize" text,
	"dba_required" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"role" "role" NOT NULL,
	"route_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visit_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"answer" "answer",
	"numeric_value" numeric(12, 2),
	"is_compliant" boolean,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "visit_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"item_id" uuid,
	"url" text NOT NULL,
	"thumb_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_pillar_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"pillar_id" uuid NOT NULL,
	"score" numeric(5, 2),
	"applicable_count" integer DEFAULT 0 NOT NULL,
	"compliant_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_serve_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"serve_id" uuid NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"price" numeric(12, 2),
	"price_index" numeric(6, 2)
);
--> statement-breakpoint
CREATE TABLE "visit_sku_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"present" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"walker_id" uuid NOT NULL,
	"status" "visit_status" DEFAULT 'draft' NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"overall_score" numeric(5, 2),
	"aacc_floor_breached" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_walker_id_users_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "framework_items" ADD CONSTRAINT "framework_items_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_targets" ADD CONSTRAINT "item_targets_item_id_framework_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."framework_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_requirements" ADD CONSTRAINT "sku_requirements_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_program_evidence" ADD CONSTRAINT "staff_program_evidence_program_id_staff_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."staff_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_programs" ADD CONSTRAINT "staff_programs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_programs" ADD CONSTRAINT "staff_programs_walker_id_users_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_answers" ADD CONSTRAINT "visit_answers_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_answers" ADD CONSTRAINT "visit_answers_item_id_framework_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."framework_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_comments" ADD CONSTRAINT "visit_comments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_comments" ADD CONSTRAINT "visit_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_item_id_framework_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."framework_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_pillar_scores" ADD CONSTRAINT "visit_pillar_scores_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_pillar_scores" ADD CONSTRAINT "visit_pillar_scores_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_serve_checks" ADD CONSTRAINT "visit_serve_checks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_serve_checks" ADD CONSTRAINT "visit_serve_checks_serve_id_serves_id_fk" FOREIGN KEY ("serve_id") REFERENCES "public"."serves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sku_checks" ADD CONSTRAINT "visit_sku_checks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sku_checks" ADD CONSTRAINT "visit_sku_checks_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_walker_id_users_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_walker_idx" ON "clients" USING btree ("walker_id");--> statement-breakpoint
CREATE INDEX "clients_route_idx" ON "clients" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "clients_type_idx" ON "clients" USING btree ("account_type");--> statement-breakpoint
CREATE UNIQUE INDEX "item_targets_item_account_uq" ON "item_targets" USING btree ("item_id","account_type");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE UNIQUE INDEX "sku_requirements_sku_account_uq" ON "sku_requirements" USING btree ("sku_id","account_type");--> statement-breakpoint
CREATE UNIQUE INDEX "visit_answers_visit_item_uq" ON "visit_answers" USING btree ("visit_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visit_comments_visit_uq" ON "visit_comments" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "visits_client_idx" ON "visits" USING btree ("client_id","visited_at");--> statement-breakpoint
CREATE INDEX "visits_walker_idx" ON "visits" USING btree ("walker_id","visited_at");--> statement-breakpoint
CREATE INDEX "visits_status_idx" ON "visits" USING btree ("status");
-- ===== SEED FRAMEWORK =====

-- Key 3 — seed del framework (config-driven). Correr DESPUÉS del schema.
-- Pilares, ítems, targets por tipo de cuenta, serves, SKU mínimos y settings.

/* ---------- pilares ---------- */
insert into pillars (key, name, description, weight, sort_order) values
  ('staff',      'Staff',      'El equipo del cliente vende mejor nuestras marcas', 30, 1),
  ('menu',       'Menú',       'Ganamos la carta. El foco del negocio',             40, 2),
  ('activacion', 'Activación', 'Activamos al consumidor en el punto de venta',      30, 3);

/* ---------- ítems ---------- */
insert into framework_items (pillar_id, key, label, description, question_type, weight, sort_order)
select p.id, v.key, v.label, v.descr, v.qtype::question_type, 1, v.sort
from (values
  ('staff',      'incentivos',             'Incentivos activos',          'Programa de incentivos vigente (mín. 1 por trimestre)', 'binary',  1),
  ('staff',      'capacitacion_comercial', 'Capacitación comercial',      'Cómo vender, first drink, upselling (la dicta el Walker)', 'binary', 2),
  ('staff',      'capacitacion_marca',     'Capacitación de marca (DBA)',  'Historia y producción de marca (agendada con DBA)',     'binary',  3),
  ('menu',       'share_of_menu',          'Share of menu',                '% de cocktails de autor con Diageo',                    'percent', 1),
  ('menu',       'primera_posicion',       'Primera posición (Top 3)',     'Top 3 cocktails de la carta son Diageo',                'binary',  2),
  ('menu',       'drink_strategy',         'Drink Strategy (4 serves)',    'Los 4 serves presentes en carta',                      'binary',  3),
  ('menu',       'precio_index',           'Índice de precio',             'Índice de precio del serve clave vs referencia',        'numeric', 4),
  ('activacion', 'participar_acciones',    'Participar en acciones',       'Participa en promociones / Happy Hour del cliente',     'binary',  1),
  ('activacion', 'popup_carta',            'Pop-Up en carta',              'Pop-Up presente en la carta',                          'binary',  2),
  ('activacion', 'menu_adaptado',          'Menú adaptado / Table Tent',   'Menú reducido (Reserve) o Table Tent (masivo)',         'binary',  3)
) as v(pillar_key, key, label, descr, qtype, sort)
join pillars p on p.key = v.pillar_key;

/* ---------- targets por tipo de cuenta ---------- */
-- target_value: share 60, precio_index 120; mandatory AACC: share, primera_posicion, drink_strategy.
insert into item_targets (item_id, account_type, applies, target_value, is_mandatory)
select i.id, t.acct::account_type, true, t.target, t.mand
from (values
  ('incentivos',             'estandar', null::numeric, false),
  ('incentivos',             'aacc',     null,          false),
  ('capacitacion_comercial', 'estandar', null,          false),
  ('capacitacion_comercial', 'aacc',     null,          false),
  ('capacitacion_marca',     'estandar', null,          false),
  ('capacitacion_marca',     'aacc',     null,          false),
  ('share_of_menu',          'estandar', 60,            false),
  ('share_of_menu',          'aacc',     60,            true),
  ('primera_posicion',       'estandar', null,          false),
  ('primera_posicion',       'aacc',     null,          true),
  ('drink_strategy',         'estandar', null,          false),
  ('drink_strategy',         'aacc',     null,          true),
  ('precio_index',           'estandar', 120,           false),
  ('precio_index',           'aacc',     120,           false),
  ('participar_acciones',    'estandar', null,          false),
  ('participar_acciones',    'aacc',     null,          false),
  ('popup_carta',            'estandar', null,          false),
  ('popup_carta',            'aacc',     null,          false),
  ('menu_adaptado',          'estandar', null,          false),
  ('menu_adaptado',          'aacc',     null,          false)
) as t(item_key, acct, target, mand)
join framework_items i on i.key = t.item_key;

/* ---------- drink strategy serves ---------- */
insert into serves (name, brand, reference_price_index, sort_order) values
  ('Whiscola',       'Johnnie Walker Red',   120, 1),
  ('Tanqueray G&T',  'Tanqueray',            null, 2),
  ('Paloma',         'Don Julio',            null, 3),
  ('JW Black Sour',  'Johnnie Walker Black', null, 4);

/* ---------- SKU mínimos (portfolio On Trade) ---------- */
insert into skus (name, brand, sort_order) values
  ('JW Red',              'Johnnie Walker', 1),
  ('JW Black',            'Johnnie Walker', 2),
  ('Tanqueray London Dry','Tanqueray',      3),
  ('Tanqueray Sevilla',   'Tanqueray',      4),
  ('Don Julio Blanco',    'Don Julio',      5),
  ('Don Julio Reposado',  'Don Julio',      6),
  ('Gordon''s London Dry','Gordon''s',      7),
  ('Baileys Original',    'Baileys',        8);

-- Estándar: solo los 3 mínimos obligatorios. AACC: portfolio completo.
insert into sku_requirements (sku_id, account_type, required)
select s.id, 'estandar'::account_type,
       (s.name in ('JW Red', 'JW Black', 'Tanqueray London Dry'))
from skus s;

insert into sku_requirements (sku_id, account_type, required)
select s.id, 'aacc'::account_type, true
from skus s;

/* ---------- settings (singleton) ---------- */
insert into settings (photo_required_per_item, allow_na) values (false, true);
