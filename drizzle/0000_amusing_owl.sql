CREATE TYPE "public"."account_type" AS ENUM('estandar', 'aacc');--> statement-breakpoint
CREATE TYPE "public"."comparator" AS ENUM('gte', 'lte');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('binary', 'numeric', 'percent');--> statement-breakpoint
CREATE TYPE "public"."program_kind" AS ENUM('incentivo', 'capacitacion_comercial', 'capacitacion_marca');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('planificado', 'en_curso', 'completado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."reserve_scope" AS ENUM('all', 'reserve_only', 'non_reserve_only');--> statement-breakpoint
CREATE TYPE "public"."serve_metric" AS ENUM('presence', 'price_index');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('walker', 'manager', 'cpa');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"filename" text NOT NULL,
	"summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"comuna" text NOT NULL,
	"route_id" uuid NOT NULL,
	"account_type" "account_type" DEFAULT 'estandar' NOT NULL,
	"is_reserve" boolean DEFAULT false NOT NULL,
	"contract_info" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "item_targets" (
	"item_id" uuid NOT NULL,
	"account_type" "account_type" NOT NULL,
	"applicable" boolean DEFAULT true NOT NULL,
	"target_value" double precision,
	"comparator" "comparator" DEFAULT 'gte' NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL,
	CONSTRAINT "item_targets_item_id_account_type_pk" PRIMARY KEY("item_id","account_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"help_text" text,
	"type" "item_type" DEFAULT 'binary' NOT NULL,
	"weight" double precision DEFAULT 1 NOT NULL,
	"position" integer NOT NULL,
	"photo_required" boolean DEFAULT false NOT NULL,
	"allow_na" boolean DEFAULT true NOT NULL,
	"reserve_scope" "reserve_scope" DEFAULT 'all' NOT NULL,
	"serve_id" uuid,
	"serve_metric" "serve_metric",
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pillars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pillars_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"note" text,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "program_kind" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "program_status" DEFAULT 'planificado' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"prize" text,
	"dba_name" text,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"reference_drink" text,
	"target_price_index" double precision,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "serves_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"route_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"answer_bool" boolean,
	"value_numeric" double precision,
	"is_na" boolean DEFAULT false NOT NULL,
	"compliant" boolean,
	"note" text,
	"meta" jsonb,
	"weight_snapshot" double precision NOT NULL,
	"target_snapshot" double precision,
	"comparator_snapshot" "comparator",
	"mandatory_snapshot" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_comments" (
	"visit_id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"read_by_walker" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"answer_id" uuid,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_pillar_scores" (
	"visit_id" uuid NOT NULL,
	"pillar_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"yes_weight" double precision NOT NULL,
	"applicable_weight" double precision NOT NULL,
	CONSTRAINT "visit_pillar_scores_visit_id_pillar_id_pk" PRIMARY KEY("visit_id","pillar_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"walker_id" uuid NOT NULL,
	"status" "visit_status" DEFAULT 'draft' NOT NULL,
	"account_type_snapshot" "account_type" NOT NULL,
	"route_id_snapshot" uuid,
	"overall_score" double precision,
	"aacc_alert" boolean DEFAULT false NOT NULL,
	"note" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_imports" ADD CONSTRAINT "client_imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_targets" ADD CONSTRAINT "item_targets_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_serve_id_serves_id_fk" FOREIGN KEY ("serve_id") REFERENCES "public"."serves"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "program_updates" ADD CONSTRAINT "program_updates_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "program_updates" ADD CONSTRAINT "program_updates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "programs" ADD CONSTRAINT "programs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "programs" ADD CONSTRAINT "programs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "programs" ADD CONSTRAINT "programs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_answers" ADD CONSTRAINT "visit_answers_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_answers" ADD CONSTRAINT "visit_answers_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_comments" ADD CONSTRAINT "visit_comments_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_comments" ADD CONSTRAINT "visit_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_answer_id_visit_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."visit_answers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_pillar_scores" ADD CONSTRAINT "visit_pillar_scores_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_pillar_scores" ADD CONSTRAINT "visit_pillar_scores_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_walker_id_users_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_route_id_snapshot_routes_id_fk" FOREIGN KEY ("route_id_snapshot") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_route_idx" ON "clients" USING btree ("route_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "items_serve_metric_uq" ON "items" USING btree ("serve_id","serve_metric") WHERE serve_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "visit_answers_uq" ON "visit_answers" USING btree ("visit_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "visits_one_draft_uq" ON "visits" USING btree ("walker_id","client_id") WHERE status = 'draft';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_feed_idx" ON "visits" USING btree ("submitted_at" DESC NULLS LAST) WHERE status = 'submitted';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_client_idx" ON "visits" USING btree ("client_id","submitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_walker_idx" ON "visits" USING btree ("walker_id","submitted_at" DESC NULLS LAST);