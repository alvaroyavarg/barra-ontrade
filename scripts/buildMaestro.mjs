/**
 * Uso: node scripts/buildMaestro.mjs <ruta-al-excel>
 * Ejemplo: node scripts/buildMaestro.mjs ~/Downloads/"Maestro de Cuentas DBA .xlsx"
 *
 * Parsea el Maestro de Cuentas DBA y regenera src/data/maestroCuentas.js
 */

import { createRequire } from "module";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const XLSX = require("../node_modules/xlsx/xlsx.js");

const __dir = fileURLToPath(new URL(".", import.meta.url));
const OUTPUT = resolve(__dir, "../src/data/maestroCuentas.js");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Error: debes pasar la ruta al Excel como argumento.");
  console.error('Ejemplo: node scripts/buildMaestro.mjs ~/Downloads/"Maestro de Cuentas DBA .xlsx"');
  process.exit(1);
}

const wb = XLSX.readFile(resolve(filePath));

function clean(v) { return v == null ? "" : String(v).trim(); }
function yes(v) { return ["SI","SÍ","OK","YES","TRUE","1"].includes(clean(v).toUpperCase()); }
function isFilled(v) { const t = clean(v).toUpperCase(); return Boolean(t) && !["NO","NA","N/A","-"].includes(t); }

function parseFotoExito(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return `${p.d}/${p.m}`;
  }
  return clean(v);
}
function formatDate(v) {
  if (!v) return "Sin registro";
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return `${String(p.d).padStart(2,"0")}-${String(p.m).padStart(2,"0")}-${p.y}`;
  }
  return clean(v);
}

const MENU_FIELDS = [
  ["hasTropicalGin",          "Tropical Gin"],
  ["hasWhiskyAuthorCocktail", "CA c/ Whisky"],
  ["hasGinAuthorCocktail",    "CA c/ Gin"],
  ["hasWhiscolaNaming",       "JW + Coca Cola"],
  ["hasTanquerayGt",          "Gin & Tonic"],
  ["hasWhiskySourBlack",      "Whisky Sour"],
];

function countOk(vals) { return vals.filter(Boolean).length; }
function scoreFromRate(r) {
  if (r >= 0.85) return "Fuerte";
  if (r >= 0.60) return "Bueno";
  if (r >= 0.35) return "Atencion";
  return "Pendiente";
}
function healthFromPillars(pillars) {
  const w = { Fuerte: 100, Bueno: 82, Atencion: 58, Pendiente: 35 };
  const vals = Object.values(pillars).map((p) => w[p.score] ?? 55);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

const ws = wb.Sheets["BASE"];
if (!ws) {
  console.error('Error: no se encontró la hoja "BASE" en el Excel.');
  process.exit(1);
}

const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
const headers = raw[1].map(clean);
const dataRows = raw.slice(2).filter((r) => clean(r[0]));

function toObj(row) {
  return headers.reduce((acc, h, i) => { if (h) acc[h] = row[i]; return acc; }, {});
}

const locals = dataRows.map((row, idx) => {
  const item = toObj(row);
  const accountCode = clean(item["CLIENTE ID"]);
  const walkerName  = clean(item["WALKER"]) || "Walker";
  const developer   = clean(item["Desarrollador Sell Out"]) || clean(item["Contacto Cuenta"]) || "";
  const name        = clean(item["Nombre Fantasía"]) || clean(item["Razón Social"]) || `Cuenta ${idx + 1}`;

  const menuEval = {
    commercialStatus:        clean(item["Acuerdo Comercial Vigente"]).toLowerCase().includes("diageo") ? "diageo" : "none",
    authorCocktailsTotal:    2,
    authorCocktailsDiageo:   countOk([yes(item["CA c/ Whisky"]), yes(item["CA c/ Gin"])]),
    hasTropicalGin:          yes(item["Tropical Gin"]),
    hasWhiskyAuthorCocktail: yes(item["CA c/ Whisky"]),
    hasGinAuthorCocktail:    yes(item["CA c/ Gin"]),
    hasWhiscolaNaming:       yes(item["JW + Coca Cola"]),
    hasTanquerayGt:          yes(item["Gin & Tonic"]),
    hasWhiskySourBlack:      yes(item["Whisky Sour"]),
    lastSaved: "Maestro DBA",
  };

  const menuOk    = MENU_FIELDS.filter(([key]) => menuEval[key]).length;
  const menuRate  = menuOk / MENU_FIELDS.length;
  const assortRaw = parseFotoExito(item["Foto de Éxito"]);
  const brandOk   = countOk([yes(item["Glassware"]), yes(item["Neones y otros"])]);
  const hasAct    = yes(item["Always On"]);
  const hasVisit  = isFilled(item["Visitas"]);

  const blankPillar = (title) => ({ title, score: "Sin registro", summary: "", details: [], nextAction: "" });
  const pillars = {
    staff:      blankPillar("Staff"),
    assortment: blankPillar("Assortment"),
    menu:       blankPillar("Menu"),
    branding:   blankPillar("Branding"),
    activation: blankPillar("Activacion"),
  };

  return {
    id: `BASE-${idx}-${accountCode || idx}`,
    accountCode, walkerName, sheetName: "BASE",
    legalName:   clean(item["Razón Social"]), name,
    distributor: clean(item["DISTRIBUIDOR"]),
    region:      clean(item["REGION"]),
    office:      clean(item["OFICINA"]),
    district:    clean(item["Comuna"]),
    channel:     clean(item["CANAL"]),
    segment:     clean(item["Segmento"]),
    subchannel:  clean(item["SUBCANAL"]),
    address:     clean(item["Dirección"]),
    developer,
    skus:             clean(item["SKU's"]),
    agreement:        clean(item["Acuerdo Comercial Vigente"]),
    agreementEndDate: formatDate(item["Fecha de Termino Acuerdo Comercial"]),
    menuUrl:     clean(item["Carta"]),
    observation: clean(item["Observación"]),
    occasion:    clean(item["SUBCANAL"]) || "On Trade",
    healthScore: 50,
    hasAacc:     clean(item["Acuerdo Comercial Vigente"]).toLowerCase().includes("diageo"),
    investment:  0,
    tags: [clean(item["CANAL"]), clean(item["Segmento"]), clean(item["SUBCANAL"])].filter(Boolean),
    contacts: [{ id: "dev", name: developer || walkerName || "Sin responsable", role: "Desarrollador Sell Out", note: clean(item["DISTRIBUIDOR"]), phone: "" }],
    kpis: [
      { label: "Cod. cliente", value: accountCode || "-",                                note: "llave venta real" },
      { label: "Segmento",     value: clean(item["Segmento"]) || "-",                   note: clean(item["SUBCANAL"]) || "subcanal" },
      { label: "Acuerdo",      value: clean(item["Acuerdo Comercial Vigente"]) || "-",  note: `Termino: ${formatDate(item["Fecha de Termino Acuerdo Comercial"])}` },
      { label: "SKUs",         value: clean(item["SKU's"]) ? clean(item["SKU's"]).split(",").length : 0, note: "declarados" },
      { label: "Menu",         value: `${menuOk}/${MENU_FIELDS.length}`,                note: "KPIs cumplidos" },
      { label: "Branding",     value: `${brandOk}/2`,                                   note: "Glassware / Neon" },
    ],
    monthlySales: [],
    missions: [],
    pillars, menuEvaluation: menuEval,
    notes: [],
  };
});

const walkerMap = {};
locals.forEach((l) => { walkerMap[l.walkerName] = (walkerMap[l.walkerName] || 0) + 1; });
const walkers = Object.entries(walkerMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ id: name, name, count }));

const now = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const output = `// Auto-generado el ${now} — no editar manualmente.
// Para regenerar: node scripts/buildMaestro.mjs <ruta-al-excel>
export const MAESTRO_LOCALS = ${JSON.stringify(locals, null, 2)};
export const MAESTRO_WALKERS = ${JSON.stringify(walkers, null, 2)};
export const MAESTRO_META = ${JSON.stringify({ fileName: filePath.split("/").pop(), count: locals.length, walkerCount: walkers.length, sheetName: "BASE" }, null, 2)};
`;

writeFileSync(OUTPUT, output);
console.log(`✓ ${locals.length} cuentas · ${walkers.length} walkers → src/data/maestroCuentas.js`);
