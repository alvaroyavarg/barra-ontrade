/**
 * Seed Key 3: framework inicial (3 pilares + Drink Strategy), 2 rutas,
 * 10 clientes demo (3 AACC, 2 Reserve) y 3 usuarios (uno por rol).
 *
 * Uso: npm run db:seed [-- --force]
 * Aborta si ya existen visitas, salvo que se pase --force.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DEMO_PASSWORD = "key3demo";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definida");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existingVisits = await db.select({ id: schema.visits.id }).from(schema.visits).limit(1);
  if (existingVisits.length > 0 && !process.argv.includes("--force")) {
    console.error("⛔ Ya existen visitas en la base. Usa --force para resembrar (borra TODO).");
    await pool.end();
    process.exit(1);
  }

  // Limpieza en orden de FKs
  await db.delete(schema.programUpdates);
  await db.delete(schema.programs);
  await db.delete(schema.visitComments);
  await db.delete(schema.visitPhotos);
  await db.delete(schema.visitPillarScores);
  await db.delete(schema.visitAnswers);
  await db.delete(schema.visits);
  await db.delete(schema.itemTargets);
  await db.delete(schema.items);
  await db.delete(schema.serves);
  await db.delete(schema.pillars);
  await db.delete(schema.clientImports);
  await db.delete(schema.clients);
  await db.delete(schema.users);
  await db.delete(schema.routes);
  await db.delete(schema.appSettings);

  // ===== Rutas =====
  const [rutaOriente, rutaCentro] = await db
    .insert(schema.routes)
    .values([{ name: "Ruta Oriente" }, { name: "Ruta Centro" }])
    .returning();

  // ===== Usuarios (uno por rol) =====
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.insert(schema.users).values([
    { email: "cpa@key3.cl", name: "Carolina Pérez", role: "cpa", passwordHash },
    { email: "manager@key3.cl", name: "Martín Soto", role: "manager", passwordHash },
    {
      email: "walker@key3.cl",
      name: "Valentina Rojas",
      role: "walker",
      routeId: rutaOriente.id,
      passwordHash,
    },
  ]);

  // ===== Clientes demo (10: 3 AACC, 2 Reserve) =====
  await db.insert(schema.clients).values([
    // Ruta Oriente (la del walker demo)
    { name: "Bar La Virgen", comuna: "Providencia", address: "Av. Providencia 1234", routeId: rutaOriente.id, accountType: "aacc" },
    { name: "Rooftop Andes", comuna: "Las Condes", address: "Av. Apoquindo 4500", routeId: rutaOriente.id, accountType: "aacc", isReserve: true },
    { name: "Speakeasy 74", comuna: "Vitacura", address: "Av. Vitacura 7400", routeId: rutaOriente.id, isReserve: true },
    { name: "La Terraza Italia", comuna: "Providencia", address: "Av. Italia 980", routeId: rutaOriente.id },
    { name: "Club Capital", comuna: "Las Condes", address: "Isidora Goyenechea 2800", routeId: rutaOriente.id },
    { name: "La Esquina Ñuñoa", comuna: "Ñuñoa", address: "Av. Irarrázaval 3200", routeId: rutaOriente.id },
    // Ruta Centro
    { name: "Gran Hotel Centro", comuna: "Santiago", address: "Estado 150", routeId: rutaCentro.id, accountType: "aacc" },
    { name: "Cervecería Franklin", comuna: "Santiago", address: "Franklin 741", routeId: rutaCentro.id },
    { name: "Mística Bar", comuna: "Santiago", address: "Lastarria 90", routeId: rutaCentro.id },
    { name: "Donde el Negro", comuna: "Estación Central", address: "Alameda 3850", routeId: rutaCentro.id },
  ]);

  // ===== Pilares Key 3 =====
  const [staff, menu, activacion] = await db
    .insert(schema.pillars)
    .values([
      { code: "staff", name: "Staff", tagline: "El equipo del cliente vende mejor nuestras marcas", position: 1 },
      { code: "menu", name: "Menú", tagline: "Ganamos la carta. El foco del negocio", position: 2 },
      { code: "activacion", name: "Activación", tagline: "Activamos al consumidor en el punto de venta", position: 3 },
    ])
    .returning();

  // ===== Drink Strategy =====
  // Solo Whiscola mide price index por ahora (target 120% vs Piscola);
  // el resto se indexa después si funciona bien.
  const [whiscola, tanquerayGt, paloma, jwBlackSour] = await db
    .insert(schema.serves)
    .values([
      { code: "whiscola_jw_red", name: "Whiscola JW Red", brand: "Johnnie Walker Red", referenceDrink: "Piscola", targetPriceIndex: 120, position: 1 },
      { code: "tanqueray_gt", name: "Tanqueray G&T", brand: "Tanqueray", position: 2 },
      { code: "paloma_don_julio", name: "Paloma Don Julio", brand: "Don Julio", position: 3 },
      { code: "jw_black_sour", name: "JW Black Sour", brand: "Johnnie Walker Black", position: 4 },
    ])
    .returning();

  // ===== Items de medición =====
  const insertedItems = await db
    .insert(schema.items)
    .values([
      // --- Staff ---
      { pillarId: staff.id, code: "staff_incentivo", name: "Incentivo vigente", helpText: "Programa de incentivo corriendo en el cliente (mín. 1 por trimestre)", position: 1 },
      { pillarId: staff.id, code: "staff_cap_comercial", name: "Capacitación comercial al día", helpText: "Dictada por el Walker: cómo vender, primer trago, upselling", position: 2 },
      { pillarId: staff.id, code: "staff_cap_marca", name: "Capacitación de marca al día", helpText: "Dictada por DBA (Diageo Bar Ambassador): historia y producción de marca", position: 3 },
      // --- Menú ---
      { pillarId: menu.id, code: "menu_share", name: "Share of menu", helpText: "% de cocktails de autor con marcas Diageo (objetivo 60%)", type: "percent" as const, position: 1 },
      { pillarId: menu.id, code: "menu_top3", name: "Primera posición (top 3 Diageo)", helpText: "Los 3 primeros cocktails de la carta son Diageo", position: 2 },
      { pillarId: menu.id, code: "serve_presence_whiscola_jw_red", name: "En carta: Whiscola JW Red", position: 3, serveId: whiscola.id, serveMetric: "presence" as const },
      { pillarId: menu.id, code: "serve_presence_tanqueray_gt", name: "En carta: Tanqueray G&T", position: 4, serveId: tanquerayGt.id, serveMetric: "presence" as const },
      { pillarId: menu.id, code: "serve_presence_paloma_don_julio", name: "En carta: Paloma Don Julio", position: 5, serveId: paloma.id, serveMetric: "presence" as const },
      { pillarId: menu.id, code: "serve_presence_jw_black_sour", name: "En carta: JW Black Sour", position: 6, serveId: jwBlackSour.id, serveMetric: "presence" as const },
      { pillarId: menu.id, code: "serve_index_whiscola_jw_red", name: "Price index Whiscola vs Piscola", helpText: "Se registra el precio de la Piscola y el de la Whiscola; precio máximo permitido = Piscola × 1,2", type: "numeric" as const, position: 7, serveId: whiscola.id, serveMetric: "price_index" as const },
      // --- Activación ---
      { pillarId: activacion.id, code: "act_acciones", name: "Participa en acciones del cliente", helpText: "Promociones, Happy Hour: participar SIEMPRE", position: 1 },
      { pillarId: activacion.id, code: "act_popup", name: "Pop-up en carta", position: 2 },
      { pillarId: activacion.id, code: "act_menu_reserve", name: "Menú adaptado Reserve", helpText: "Carta reducida para cuentas Reserve", position: 3, reserveScope: "reserve_only" as const },
      { pillarId: activacion.id, code: "act_table_tent", name: "Table Tent (TT)", helpText: "Para cuentas masivas (no Reserve)", position: 4, reserveScope: "non_reserve_only" as const },
    ])
    .returning();

  // ===== Targets por tipo de cuenta (piso AACC) =====
  const MANDATORY_AACC = new Set([
    "menu_share",
    "menu_top3",
    "serve_presence_whiscola_jw_red",
    "serve_presence_tanqueray_gt",
    "serve_presence_paloma_don_julio",
    "serve_presence_jw_black_sour",
  ]);

  const targetRows = insertedItems.flatMap((item) =>
    (["estandar", "aacc"] as const).map((accountType) => ({
      itemId: item.id,
      accountType,
      applicable: true,
      targetValue:
        item.code === "menu_share" ? 60 : item.code === "serve_index_whiscola_jw_red" ? 120 : null,
      comparator: item.code === "serve_index_whiscola_jw_red" ? ("lte" as const) : ("gte" as const),
      mandatory: accountType === "aacc" && MANDATORY_AACC.has(item.code),
    })),
  );
  await db.insert(schema.itemTargets).values(targetRows);

  // ===== Settings =====
  await db.insert(schema.appSettings).values([
    { key: "score_green_min", value: 80 },
    { key: "score_amber_min", value: 60 },
  ]);

  console.log("✅ Seed completo:");
  console.log(`   rutas: 2 · usuarios: 3 · clientes: 10 (3 AACC, 2 Reserve)`);
  console.log(`   pilares: 3 · serves: 4 · items: ${insertedItems.length} · targets: ${targetRows.length}`);
  console.log("");
  console.log("   Usuarios demo (contraseña: " + DEMO_PASSWORD + ")");
  console.log("   · walker@key3.cl   (Walker, Ruta Oriente)");
  console.log("   · manager@key3.cl  (OT Manager)");
  console.log("   · cpa@key3.cl      (CP&A)");

  await pool.end();
}

main().catch((err) => {
  console.error("⛔ Seed falló:", err);
  process.exit(1);
});
