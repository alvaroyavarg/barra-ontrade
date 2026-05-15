/**
 * Seed inicial: sube las 134 cuentas del maestro a Supabase.
 * Uso: VITE_SUPABASE_URL=https://... VITE_SUPABASE_ANON_KEY=eyJ... node scripts/seedSupabase.mjs
 *
 * Sube solo datos de cuenta (sin auditorías). Usa upsert — es seguro volver a correr.
 */
import { createClient } from "@supabase/supabase-js";
import { MAESTRO_LOCALS } from "../src/data/maestroCuentas.js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY como variables de entorno.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function localToRow(l) {
  return {
    id:                l.id,
    account_code:      l.accountCode ?? "",
    walker_name:       l.walkerName ?? "",
    sheet_name:        l.sheetName ?? "",
    legal_name:        l.legalName ?? "",
    name:              l.name,
    distributor:       l.distributor ?? "",
    region:            l.region ?? "",
    office:            l.office ?? "",
    district:          l.district ?? "",
    channel:           l.channel ?? "",
    segment:           l.segment ?? "",
    subchannel:        l.subchannel ?? "",
    address:           l.address ?? "",
    developer:         l.developer ?? "",
    skus:              l.skus ?? "",
    agreement:         l.agreement ?? "",
    agreement_end_date: l.agreementEndDate ?? "",
    menu_url:          l.menuUrl ?? "",
    observation:       l.observation ?? "",
    occasion:          l.occasion ?? "",
    health_score:      50,
    has_aacc:          l.hasAacc ?? false,
    investment:        l.investment ?? 0,
    tags:              l.tags ?? [],
    updated_at:        new Date().toISOString(),
  };
}

function contactToRow(localId, c) {
  return {
    id:       `${localId}-${c.id}`,
    local_id: localId,
    name:     c.name,
    role:     c.role ?? "",
    note:     c.note ?? "",
    phone:    c.phone ?? "",
  };
}

console.log(`Subiendo ${MAESTRO_LOCALS.length} cuentas a Supabase...`);

// Upsert locals en batches de 50
const BATCH = 50;
for (let i = 0; i < MAESTRO_LOCALS.length; i += BATCH) {
  const batch = MAESTRO_LOCALS.slice(i, i + BATCH);
  const rows = batch.map(localToRow);
  const { error } = await supabase.from("locals").upsert(rows, { onConflict: "id" });
  if (error) { console.error(`Error en batch ${i}:`, error.message); process.exit(1); }
  console.log(`  ✓ ${Math.min(i + BATCH, MAESTRO_LOCALS.length)}/${MAESTRO_LOCALS.length} cuentas`);
}

// Upsert contactos
const allContacts = MAESTRO_LOCALS.flatMap((l) =>
  (l.contacts ?? []).map((c) => contactToRow(l.id, c))
);
for (let i = 0; i < allContacts.length; i += BATCH) {
  const { error } = await supabase.from("contacts").upsert(allContacts.slice(i, i + BATCH), { onConflict: "id" });
  if (error) { console.error(`Error contactos batch ${i}:`, error.message); process.exit(1); }
}
console.log(`  ✓ ${allContacts.length} contactos`);

console.log("\n✓ Seed completado. Las 134 cuentas están en Supabase.");
console.log("  Los datos de auditoría (pilares, notas, misiones) se llenan desde la app.");
