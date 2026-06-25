import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------------- enums ---------------- */
export const roleEnum = pgEnum("role", ["walker", "manager"]);
export const accountTypeEnum = pgEnum("account_type", ["estandar", "aacc"]);
export const questionTypeEnum = pgEnum("question_type", ["binary", "numeric", "percent"]);
export const answerEnum = pgEnum("answer", ["si", "no", "na"]);
export const visitStatusEnum = pgEnum("visit_status", ["draft", "submitted"]);
export const programTypeEnum = pgEnum("program_type", [
  "incentivo",
  "capacitacion_comercial",
  "capacitacion_marca",
]);
export const programStatusEnum = pgEnum("program_status", [
  "planned",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

/* ---------------- users / routes ---------------- */
export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  comuna: text("comuna"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  routeId: uuid("route_id").references(() => routes.id, { onDelete: "set null" }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------------- clients ---------------- */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    comuna: text("comuna"),
    routeId: uuid("route_id").references(() => routes.id, { onDelete: "set null" }),
    walkerId: uuid("walker_id").references(() => users.id, { onDelete: "set null" }),
    accountType: accountTypeEnum("account_type").notNull().default("estandar"),
    isReserve: boolean("is_reserve").default(false).notNull(),
    contractInfo: text("contract_info"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byWalker: index("clients_walker_idx").on(t.walkerId),
    byRoute: index("clients_route_idx").on(t.routeId),
    byType: index("clients_type_idx").on(t.accountType),
  })
);

/* ---------------- framework config (config-driven) ---------------- */
export const pillars = pgTable("pillars", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  weight: numeric("weight", { precision: 5, scale: 2 }).default("1").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

export const frameworkItems = pgTable("framework_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  pillarId: uuid("pillar_id")
    .notNull()
    .references(() => pillars.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  questionType: questionTypeEnum("question_type").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }).default("1").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

export const itemTargets = pgTable(
  "item_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => frameworkItems.id, { onDelete: "cascade" }),
    accountType: accountTypeEnum("account_type").notNull(),
    applies: boolean("applies").default(true).notNull(),
    targetValue: numeric("target_value", { precision: 7, scale: 2 }),
    isMandatory: boolean("is_mandatory").default(false).notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("item_targets_item_account_uq").on(t.itemId, t.accountType),
  })
);

/* ---------------- drink strategy serves ---------------- */
export const serves = pgTable("serves", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brand: text("brand"),
  referencePriceIndex: numeric("reference_price_index", { precision: 6, scale: 2 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

/* ---------------- SKU mínimos ---------------- */
export const skus = pgTable("skus", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brand: text("brand"),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

export const skuRequirements = pgTable(
  "sku_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    accountType: accountTypeEnum("account_type").notNull(),
    required: boolean("required").default(true).notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("sku_requirements_sku_account_uq").on(t.skuId, t.accountType),
  })
);

/* ---------------- visits & measurements ---------------- */
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    walkerId: uuid("walker_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: visitStatusEnum("status").default("draft").notNull(),
    visitedAt: timestamp("visited_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
    aaccFloorBreached: boolean("aacc_floor_breached").default(false).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byClient: index("visits_client_idx").on(t.clientId, t.visitedAt),
    byWalker: index("visits_walker_idx").on(t.walkerId, t.visitedAt),
    byStatus: index("visits_status_idx").on(t.status),
  })
);

export const visitPillarScores = pgTable("visit_pillar_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id, { onDelete: "cascade" }),
  pillarId: uuid("pillar_id")
    .notNull()
    .references(() => pillars.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 5, scale: 2 }),
  applicableCount: integer("applicable_count").default(0).notNull(),
  compliantCount: integer("compliant_count").default(0).notNull(),
});

export const visitAnswers = pgTable(
  "visit_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => frameworkItems.id, { onDelete: "cascade" }),
    answer: answerEnum("answer"),
    numericValue: numeric("numeric_value", { precision: 12, scale: 2 }),
    isCompliant: boolean("is_compliant"),
    note: text("note"),
  },
  (t) => ({
    uniq: uniqueIndex("visit_answers_visit_item_uq").on(t.visitId, t.itemId),
  })
);

export const visitServeChecks = pgTable("visit_serve_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id, { onDelete: "cascade" }),
  serveId: uuid("serve_id")
    .notNull()
    .references(() => serves.id, { onDelete: "cascade" }),
  present: boolean("present").default(false).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }),
  priceIndex: numeric("price_index", { precision: 6, scale: 2 }),
});

export const visitSkuChecks = pgTable("visit_sku_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id, { onDelete: "cascade" }),
  skuId: uuid("sku_id")
    .notNull()
    .references(() => skus.id, { onDelete: "cascade" }),
  present: boolean("present").default(false).notNull(),
});

export const visitPhotos = pgTable("visit_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => frameworkItems.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const visitComments = pgTable(
  "visit_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    onePerVisit: uniqueIndex("visit_comments_visit_uq").on(t.visitId),
  })
);

/* ---------------- notifications ---------------- */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    visitId: uuid("visit_id").references(() => visits.id, { onDelete: "cascade" }),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byUser: index("notifications_user_idx").on(t.userId, t.read),
  })
);

/* ---------------- staff programs ---------------- */
export const staffPrograms = pgTable("staff_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  walkerId: uuid("walker_id").references(() => users.id, { onDelete: "set null" }),
  type: programTypeEnum("type").notNull(),
  title: text("title").notNull(),
  status: programStatusEnum("status").default("planned").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  prize: text("prize"),
  dbaRequired: boolean("dba_required").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const staffProgramEvidence = pgTable("staff_program_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id")
    .notNull()
    .references(() => staffPrograms.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------------- settings (singleton) ---------------- */
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  photoRequiredPerItem: boolean("photo_required_per_item").default(false).notNull(),
  allowNa: boolean("allow_na").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
