/**
 * Resetea datos de auditoría del maestro de cuentas.
 * Mantiene toda la info de la cuenta, limpia: pilares, notas, progreso de misiones.
 * Uso: node scripts/cleanAuditData.mjs
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

const { MAESTRO_LOCALS, MAESTRO_WALKERS, MAESTRO_META } = await import(
  "../src/data/maestroCuentas.js"
);

const BLANK_PILLAR = (title) => ({
  title,
  score: "Sin registro",
  summary: "",
  details: [],
  nextAction: "",
});

const cleaned = MAESTRO_LOCALS.map((local) => ({
  ...local,
  healthScore: 50,
  notes: [],
  missions: (local.missions ?? []).map((m) => ({
    ...m,
    status: "Sugerida",
    progress: 0,
  })),
  pillars: {
    staff:      BLANK_PILLAR("Staff"),
    assortment: BLANK_PILLAR("Assortment"),
    menu:       BLANK_PILLAR("Menu"),
    branding:   BLANK_PILLAR("Branding"),
    activation: BLANK_PILLAR("Activacion"),
  },
}));

const now = new Date().toLocaleDateString("es-CL", {
  day: "2-digit", month: "short", year: "numeric",
});
const OUTPUT = resolve(__dir, "../src/data/maestroCuentas.js");

const output = `// Auto-generado el ${now} — no editar manualmente.
// Para regenerar: node scripts/buildMaestro.mjs <ruta-al-excel>
export const MAESTRO_LOCALS = ${JSON.stringify(cleaned, null, 2)};
export const MAESTRO_WALKERS = ${JSON.stringify(MAESTRO_WALKERS, null, 2)};
export const MAESTRO_META = ${JSON.stringify(MAESTRO_META, null, 2)};
`;

writeFileSync(OUTPUT, output);
console.log(`✓ ${cleaned.length} cuentas limpiadas — pilares, notas y misiones reseteados`);
