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