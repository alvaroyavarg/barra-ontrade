import * as XLSX from "xlsx";

const MENU_FIELDS = [
  ["hasTropicalGin",         "Tropical Gin"],
  ["hasWhiskyAuthorCocktail","CA c/ Whisky"],
  ["hasGinAuthorCocktail",   "CA c/ Gin"],
  ["hasWhiscolaNaming",      "JW + Coca Cola"],
  ["hasTanquerayGt",         "Gin & Tonic"],
  ["hasWhiskySourBlack",     "Whisky Sour"],
];

const SKIP_SHEETS = new Set([
  "testing","buscador","informacion acumulada","avances de kpis",
  "detalle de avances de kpis","free good","registro consolidados free good",
]);

// Any of these column names in a row marks it as the header row
const HEADER_ANCHORS = new Set([
  "cliente id", "id distribuidor", "nombre cuenta", "nombre fantasía",
  "nombre fantasia", "razón social", "razon social",
]);

function clean(v) { return v == null ? "" : String(v).trim(); }
function yes(v) { return ["SI","SÍ","OK","YES","TRUE","1"].includes(clean(v).toUpperCase()); }
function isFilled(v) { const t = clean(v).toUpperCase(); return Boolean(t) && !["NO","NA","N/A","-"].includes(t); }

// Excel convierte "4/4", "3/4" etc. a fechas (formato chileno DD/MM).
// Para recuperar el ratio original: día / mes.
function parseFotoExito(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.trim();          // ya es texto: "4/4", "NA", etc.
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getDate()}/${v.getMonth() + 1}`;       // DD/MM → ratio original
  }
  if (typeof v === "number") {                          // serial de fecha XLSX
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return `${p.d}/${p.m}`;
  }
  return clean(v);
}
function formatDate(v) {
  if (!v) return "Sin registro";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toLocaleDateString("es-CL");
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return `${String(p.d).padStart(2,"0")}-${String(p.m).padStart(2,"0")}-${p.y}`;
  }
  return clean(v);
}
function toObj(headers, row) {
  return headers.reduce((acc, h, i) => { if (h) acc[h] = row[i]; return acc; }, {});
}
function countOk(vals) { return vals.filter(Boolean).length; }
function scoreFromRate(r) {
  if (r >= 0.85) return "Fuerte";
  if (r >= 0.60) return "Bueno";
  if (r >= 0.35) return "Atencion";
  return "Pendiente";
}
function healthFromPillars(pillars) {
  const w = { Fuerte:100, Bueno:82, Atencion:58, Pendiente:35, Riesgo:25 };
  const vals = Object.values(pillars).map((p) => w[p.score] ?? 55);
  return Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
}

const PENDING_CODES = new Set(["pendiente", "tbd", "s/n", "sin codigo", "sin código", "-", "n/a", "na", "por definir", "pd"]);

function buildLocal(item, sheetName, idx) {
  const rawCode     = clean(item["CLIENTE ID"]) || clean(item["ID Distribuidor"]) || "";
  const accountCode = PENDING_CODES.has(rawCode.toLowerCase()) ? "" : rawCode;
  // Walker (Diageo) and Desarrollador (Andina CL code) are different fields
  const walkerName   = clean(item["WALKER"]) || clean(item["Walker"]) || "";
  const developer    = clean(item["Desarrollador Sell Out"]) || clean(item["Desarrollador"]) || clean(item["Contacto Cuenta"]) || "";
  const name         = clean(item["Nombre Fantasía"]) || clean(item["Nombre Cuenta"]) || clean(item["Razón Social"]) || `Cuenta ${idx+1}`;

  const rawAgreement = clean(item["Acuerdo Comercial Vigente"]) || clean(item["AACC"]) || "";
  const menuEval = {
    commercialStatus: rawAgreement.toLowerCase().includes("diageo") ? "diageo" : "none",
    authorCocktailsTotal: 2,
    authorCocktailsDiageo: countOk([yes(item["CA c/ Whisky"]), yes(item["CA c/ Gin"])]),
    hasTropicalGin:          yes(item["Tropical Gin"]),
    hasWhiskyAuthorCocktail: yes(item["CA c/ Whisky"]),
    hasGinAuthorCocktail:    yes(item["CA c/ Gin"]),
    hasWhiscolaNaming:       yes(item["JW + Coca Cola"]),
    hasTanquerayGt:          yes(item["Gin & Tonic"]),
    hasWhiskySourBlack:      yes(item["Whisky Sour"]),
    lastSaved: `Importado: ${sheetName}`,
  };

  const menuOk    = MENU_FIELDS.filter(([key]) => menuEval[key]).length;
  const menuRate  = menuOk / MENU_FIELDS.length;
  const assortRaw = parseFotoExito(item["Foto de Éxito"]);
  const brandOk   = countOk([yes(item["Glassware"]), yes(item["Neones y otros"])]);
  const hasAct    = yes(item["Always On"]);
  const hasVisit  = isFilled(item["Visitas"]);

  const pillars = {
    staff: {
      title:"Staff", score: hasVisit ? "Bueno" : "Pendiente",
      summary: hasVisit ? `Visita: ${formatDate(item["Visitas"])}` : "Sin visita registrada",
      details: [`Walker: ${walkerName}`, `Desarrollador: ${developer || "Sin dato"}`, `Fecha: ${formatDate(item["Visitas"])}`],
      nextAction: hasVisit ? "Mantener frecuencia y registrar minuta." : "Registrar visita rutinaria.",
    },
    assortment: {
      title:"Assortment",
      score: (() => {
        if (!assortRaw || assortRaw === "" || assortRaw.toUpperCase() === "NA") return "Pendiente";
        const match = assortRaw.match(/^(\d+)\/(\d+)$/);
        if (match) {
          const rate = parseInt(match[1]) / parseInt(match[2]);
          return rate >= 1 ? "Fuerte" : rate >= 0.6 ? "Bueno" : "Atencion";
        }
        return "Atencion";
      })(),
      summary: (assortRaw && assortRaw !== "" && assortRaw.toUpperCase() !== "NA")
        ? `Foto de Exito: ${assortRaw}`
        : "Pendiente foto de exito",
      details: [`SKUs: ${clean(item["SKU's"]) || "Sin dato"}`, `Foto de Exito: ${assortRaw || "Sin dato"}`],
      nextAction: assortRaw === "4/4" || assortRaw === "5/5"
        ? "Mantener cumplimiento."
        : "Validar foto de exito y faltantes.",
    },
    menu: {
      title:"Menu", score: scoreFromRate(menuRate),
      summary: `${menuOk}/${MENU_FIELDS.length} KPIs cumplidos`,
      details: MENU_FIELDS.map(([,label]) => `${label}: ${yes(item[label]) ? "OK" : clean(item[label]) || "Pendiente"}`),
      nextAction: menuOk === MENU_FIELDS.length ? "Menu OK." : "Cerrar gaps de cocktails y drink strategy.",
    },
    branding: {
      title:"Branding", score: brandOk ? "Bueno" : "Pendiente",
      summary: `${brandOk}/2 elementos presentes`,
      details: [`Glassware: ${yes(item["Glassware"]) ? "OK":"Pendiente"}`, `Neon: ${yes(item["Neones y otros"]) ? "OK":"Pendiente"}`],
      nextAction: brandOk ? "Registrar evidencia visual." : "Solicitar material POP.",
    },
    activation: {
      title:"Activacion", score: hasAct ? "Bueno" : "Pendiente",
      summary: hasAct ? "Always On activo" : "Sin activacion registrada",
      details: [`Always On: ${yes(item["Always On"]) ? "OK":"Pendiente"}`],
      nextAction: hasAct ? "Medir resultado." : "Levantar oportunidad de activacion.",
    },
  };

  const agreement = clean(item["Acuerdo Comercial Vigente"]) || clean(item["AACC"]) || "";
  const outlet    = clean(item["SUBCANAL"]) || clean(item["Outlet"]) || "";
  const diageoId  = clean(item["ID Diageo"]) || "";

  const ruta = clean(item["Ruta"]) || clean(item["RUTA"]) || clean(item["ruta"]) || "";
  const safeName = (name || `cuenta${idx}`).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);

  return {
    id: accountCode ? `acc-${accountCode}` : `acc-pend-${sheetName.slice(0, 8)}-${safeName}-${idx}`,
    accountCode, walkerName, sheetName, diageoId, ruta,
    accountCodePending: !accountCode,
    legalName:   clean(item["Razón Social"]), name,
    distributor: clean(item["DISTRIBUIDOR"]),
    region:      clean(item["REGION"]),
    office:      clean(item["OFICINA"]),
    district:    clean(item["Comuna"]),
    channel:     clean(item["CANAL"]),
    segment:     clean(item["Segmento"]),
    subchannel:  outlet,
    address:     clean(item["Dirección"]),
    developer,
    skus:             clean(item["SKU's"]),
    agreement,
    agreementEndDate: formatDate(item["Fecha de Termino Acuerdo Comercial"]),
    menuUrl:     clean(item["Carta"]),
    observation: clean(item["Observación"]),
    occasion:    outlet || "On Trade",
    healthScore: healthFromPillars(pillars),
    hasAacc: agreement.toLowerCase().includes("diageo"),
    investment: 0,
    tags: [clean(item["CANAL"]), clean(item["Segmento"]), outlet].filter(Boolean),
    contacts: [{ id:"dev", name: developer || walkerName || "Sin responsable", role:"Desarrollador Sell Out", note: clean(item["DISTRIBUIDOR"]), phone:"" }],
    kpis: [
      { label:"Cod. cliente", value: accountCode||"-",                               note:"llave venta real" },
      { label:"Segmento",     value: clean(item["Segmento"])||"-",                   note: outlet||"outlet" },
      { label:"Acuerdo",      value: agreement||"-",                                 note:`Termino: ${formatDate(item["Fecha de Termino Acuerdo Comercial"])}` },
      { label:"SKUs",         value: clean(item["SKU's"]) ? clean(item["SKU's"]).split(",").length : 0, note:"declarados" },
      { label:"Menu",         value:`${menuOk}/${MENU_FIELDS.length}`,               note:"KPIs cumplidos" },
      { label:"Branding",     value:`${brandOk}/2`,                                  note:"Glassware / Neon" },
    ],
    monthlySales: [],
    missions: [{
      id:`mission-${sheetName}-${idx}`,
      title: menuOk === MENU_FIELDS.length ? "Mantener KPIs de menu" : "Cerrar gaps de Menu ON FIVE",
      origin:"Excel", impact:"Menu", reason:`${menuOk}/${MENU_FIELDS.length} KPIs cumplidos`,
      status: menuOk === MENU_FIELDS.length ? "Aceptada" : "Sugerida",
      progress: Math.round(menuRate * 100), nextStep:"Revisar detalle de Menu en On Five.",
    }],
    pillars, menuEvaluation: menuEval,
    notes: [{ id:`note-${sheetName}-${idx}`, author:"Excel Maestro", date:"Importado", type:"Observacion",
      text: clean(item["Observación"]) || "Cuenta importada desde maestro de cuentas.",
      nextAction:"Validar con venta real usando CLIENTE ID." }],
  };
}

function parseSheet(ws, sheetName) {
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:"", blankrows:false });
  const hIdx = rows.findIndex((row) =>
    row.some((c) => HEADER_ANCHORS.has(clean(c).toLowerCase()))
  );
  if (hIdx < 0) return [];
  const headers = rows[hIdx].map(clean);
  const dataRows = rows.slice(hIdx + 1).filter((row) => clean(row[0]));
  return dataRows.map((row, idx) => buildLocal(toObj(headers, row), sheetName, idx));
}

export async function parseOnFiveWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type:"array", cellDates:true });

  // Leer SOLO la primera hoja (BASE)
  const sheetName = workbook.SheetNames[0];
  const allLocals = parseSheet(workbook.Sheets[sheetName], sheetName);

  if (allLocals.length === 0) {
    throw new Error(`No encontré filas con CLIENTE ID en la hoja "${sheetName}".`);
  }

  // Walkers únicos desde columna WALKER
  const walkerMap = {};
  allLocals.forEach((local) => {
    const key = local.walkerName;
    if (!walkerMap[key]) walkerMap[key] = 0;
    walkerMap[key]++;
  });

  const walkers = Object.entries(walkerMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ id: name, name, count }));

  return { walkers, locals: allLocals, fileName: file.name, sheetName };
}

export function summarizeOnFiveLocals(locals) {
  const total = locals.length || 1;
  return {
    total:        locals.length,
    avg:          Math.round(locals.reduce((s,l) => s + (l.healthScore||0), 0) / total),
    menuOk:       locals.filter((l) => l.pillars.menu.score === "Fuerte" || l.pillars.menu.score === "Bueno").length,
    brandingOk:   locals.filter((l) => l.pillars.branding.score !== "Pendiente").length,
    activationOk: locals.filter((l) => l.pillars.activation.score !== "Pendiente").length,
    aacc:         locals.filter((l) => l.hasAacc).length,
  };
}
