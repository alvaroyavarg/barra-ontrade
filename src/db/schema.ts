import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ============ Enums ============
export const userRoleEnum = pgEnum("user_role", ["walker", "manager", "cpa"]);
export const accountTypeEnum = pgEnum("account_type", ["estandar", "aacc"]);
export const itemTypeEnum = pgEnum("item_type", ["binary", "numeric", "percent"]);
export const serveMetricEnum = pgEnum("serve_metric", ["presence", "price_index"]);
export const comparatorEnum = pgEnum("comparator", ["gte", "lte"]);
export const reserveScopeEnum = pgEnum("reserve_scope", ["all", "reserve_only", "non_reserve_only"]);
export const visitStatusEnum = pgEnum("visit_status", ["draft", "submitted"]);
export const programKindEnum = pgEnum("program_kind", [
  "incentivo",
  "capacitacion_comercial",
  "capacitacion_marca",
]);
export const programStatusEnum = pgEnum("program_status", [
  "planificado",
  "en_curso",
  "completado",
  "cancelado",
]);

// ============ Organización y usuarios ============
export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  routeId: uuid("route_id").references(() => routes.id), // solo walkers
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============ Clientes ============
// account_type viene de la base cargada por CP&A; el Walker NUNCA lo edita.
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    comuna: text("comuna").notNull(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id),
    accountType: accountTypeEnum("account_type").notNull().default("estandar"),
    isReserve: boolean("is_reserve").notNull().default(false),
    contractInfo: jsonb("contract_info"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clients_route_idx").on(t.routeId)],
);

export const clientImports = pgTable("client_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  filename: text("filename").notNull(),
  summary: jsonb("summary").notNull(), // {inserted, updated, errors[]}
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============ Framework Key 3 (config-driven, jamás hardcodear) ============
export const pillars = pgTable("pillars", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // 'staff' | 'menu' | 'activacion'
  name: text("name").notNull(),
  tagline: text("tagline"),
  position: integer("position").notNull(),
  active: boolean("active").notNull().default(true),
});

// Drink Strategy. Si target_price_index es null, el serve solo mide presencia.
export const serves = pgTable("serves", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(), // 'Whiscola JW Red'
  brand: text("brand").notNull(),
  referenceDrink: text("reference_drink"), // 'Piscola'
  targetPriceIndex: doublePrecision("target_price_index"), // 120 = precio máx 120% del referente
  position: integer("position").notNull(),
  active: boolean("active").notNull().default(true),
});

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    helpText: text("help_text"),
    type: itemTypeEnum("type").notNull().default("binary"),
    weight: doublePrecision("weight").notNull().default(1),
    position: integer("position").notNull(),
    photoRequired: boolean("photo_required").notNull().default(false),
    allowNa: boolean("allow_na").notNull().default(true),
    reserveScope: reserveScopeEnum("reserve_scope").notNull().default("all"),
    // items autogenerados por el editor de serves (presencia / price index)
    serveId: uuid("serve_id").references(() => serves.id),
    serveMetric: serveMetricEnum("serve_metric"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("items_serve_metric_uq")
      .on(t.serveId, t.serveMetric)
      .where(sql`serve_id is not null`),
  ],
);

// Requisitos por tipo de cuenta: target, comparador y piso obligatorio AACC.
export const itemTargets = pgTable(
  "item_targets",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    accountType: accountTypeEnum("account_type").notNull(),
    applicable: boolean("applicable").notNull().default(true),
    targetValue: doublePrecision("target_value"), // 60 (share) · 120 (price index)
    comparator: comparatorEnum("comparator").notNull().default("gte"),
    mandatory: boolean("mandatory").notNull().default(false), // piso AACC
  },
  (t) => [primaryKey({ columns: [t.itemId, t.accountType] })],
);

// ============ Visitas ============
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    walkerId: uuid("walker_id")
      .notNull()
      .references(() => users.id),
    status: visitStatusEnum("status").notNull().default("draft"),
    // snapshots: la historia no se reescribe si reclasifican al cliente
    accountTypeSnapshot: accountTypeEnum("account_type_snapshot").notNull(),
    routeIdSnapshot: uuid("route_id_snapshot").references(() => routes.id),
    overallScore: doublePrecision("overall_score"), // calculado server-side al submit
    aaccAlert: boolean("aacc_alert").notNull().default(false), // piso AACC incumplido
    note: text("note"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("visits_one_draft_uq")
      .on(t.walkerId, t.clientId)
      .where(sql`status = 'draft'`),
    index("visits_feed_idx").on(t.submittedAt.desc()).where(sql`status = 'submitted'`),
    index("visits_client_idx").on(t.clientId, t.submittedAt.desc()),
    index("visits_walker_idx").on(t.walkerId, t.submittedAt.desc()),
  ],
);

// Una fila por item respondido; upsert en cada respuesta = autosave.
// Los *_snapshot congelan la config del framework al momento de responder.
export const visitAnswers = pgTable(
  "visit_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    answerBool: boolean("answer_bool"), // binary: Sí/No
    valueNumeric: doublePrecision("value_numeric"), // percent / numeric (index ya calculado)
    isNa: boolean("is_na").notNull().default(false),
    compliant: boolean("compliant"), // null si N/A
    note: text("note"),
    meta: jsonb("meta"), // {priceReference, priceServe, maxAllowed} para price index
    weightSnapshot: doublePrecision("weight_snapshot").notNull(),
    targetSnapshot: doublePrecision("target_snapshot"),
    comparatorSnapshot: comparatorEnum("comparator_snapshot"),
    mandatorySnapshot: boolean("mandatory_snapshot").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("visit_answers_uq").on(t.visitId, t.itemId)],
);

// Desnormalizado para feed y analytics (fuente de verdad: visit_answers).
export const visitPillarScores = pgTable(
  "visit_pillar_scores",
  {
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id),
    score: doublePrecision("score").notNull(),
    yesWeight: doublePrecision("yes_weight").notNull(),
    applicableWeight: doublePrecision("applicable_weight").notNull(),
  },
  (t) => [primaryKey({ columns: [t.visitId, t.pillarId] })],
);

export const visitPhotos = pgTable("visit_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id, { onDelete: "cascade" }),
  answerId: uuid("answer_id").references(() => visitAnswers.id, { onDelete: "cascade" }), // null = foto general
  url: text("url").notNull(),
  pathname: text("pathname").notNull(), // key en Vercel Blob
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Coaching: UN (1) comentario por visita, editable por su autor.
export const visitComments = pgTable("visit_comments", {
  visitId: uuid("visit_id")
    .primaryKey()
    .references(() => visits.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  readByWalker: boolean("read_by_walker").notNull().default(false), // notification dot
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============ Programas de staff (Fase 5) ============
export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id), // walker responsable
  kind: programKindEnum("kind").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: programStatusEnum("status").notNull().default("planificado"),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on"),
  prize: text("prize"), // incentivos: botellas, merch
  dbaName: text("dba_name"), // capacitación de marca: DBA agendado
  approvedBy: uuid("approved_by").references(() => users.id), // manager/cpa
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const programUpdates = pgTable("program_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  note: text("note"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============ Settings globales ============
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(), // 'score_green_min': 80 · 'score_amber_min': 60
  value: jsonb("value").notNull(),
});
