import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { parseOnFiveWorkbook, summarizeOnFiveLocals } from "../utils/onFiveExcelParser.js";
import { MAESTRO_LOCALS, MAESTRO_WALKERS, MAESTRO_META } from "../data/maestroCuentas.js";
import { useSupabaseData } from "../hooks/useSupabaseData.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { createUserFromAdmin, fetchProfilesFromAdmin, fetchProfiles, fetchRoutes, addRoute, deleteRoute, updateUserRole, updateWalkerRuta, fetchDevelopers, updateDeveloper } from "../services/authService.js";
import { updateLocalRoute, updateLocalWalkerName, deleteAllLocals, upsertLocals, updateLocalAccountCode, upsertRoutesFromLocals } from "../services/localsService.js";
import { uploadPhoto } from "../services/storageService.js";

// ── Roles (sin datos personales mock) ─────────────────────────────
const CRM_ROLES = [
  { id: "walker",  label: "Walker",         name: "Walker On Trade",  subtitle: "Carga un Excel maestro para comenzar" },
  { id: "manager", label: "On Trade Manager", name: "On Trade Manager", subtitle: "Vista ejecutiva del canal" },
  { id: "cpa",     label: "CP&A",            name: "CP&A",             subtitle: "Branding y activaciones" },
];

// ── Vacíos — se pueblan desde Excel ───────────────────────────────
const EMPTY_LOCALS   = [];
const EMPTY_KANBAN   = [
  { id: "todo",     title: "Pendiente",   cards: [] },
  { id: "progress", title: "En progreso", cards: [] },
  { id: "done",     title: "Completado",  cards: [] },
];
const CRM_ACTIVITIES  = [];
const CRM_VISITS      = [];
const CPA_REQUESTS    = [];
const MANAGER_WALKERS = [];

const ROLE_NAV = {
  walker: [
    { id: "dashboard", label: "Dashboard",        icon: "⊞" },
    { id: "contacts",  label: "Cuentas",           icon: "🏪" },
    { id: "local",     label: "Perfil de cuenta",  icon: "👤" },
    { id: "execution", label: "On Five",           icon: "⚡" },
  ],
  manager: [
    { id: "dashboard",     label: "Dashboard",            icon: "⊞" },
    { section: "Walkers" },
    { id: "team",          label: "Equipo Walkers",       icon: "👥" },
    { section: "Cuentas" },
    { id: "contacts",      label: "Cuentas",              icon: "🏪" },
    { id: "local",         label: "Perfil de cuenta",     icon: "👤" },
    { section: "Análisis Comercial" },
    { id: "share",         label: "Análisis de Share",    icon: "🥧" },
    { id: "kpi-comercial", label: "KPIs Comerciales",     icon: "📈" },
    { id: "aacc",          label: "Acuerdos Comerciales", icon: "💰" },
    { id: "commercial",    label: "Consulta Comercial",   icon: "📊", openModule: "commercial" },
  ],
  cpa: [
    { id: "dashboard",         label: "Dashboard",             icon: "⊞" },
    { section: "Equipo Walker" },
    { id: "solicitudes",       label: "Solicitudes walkers",   icon: "📥" },
    { id: "kpi-walkers",       label: "KPIs walkers",          icon: "🏆" },
    { id: "contacts",          label: "Cuentas / PDV",         icon: "🏪" },
    { id: "local",             label: "Perfil de cuenta",      icon: "👤" },
    { section: "Análisis Comercial" },
    { id: "share",             label: "Análisis de Share",     icon: "🥧" },
    { id: "kpi-comercial",     label: "KPIs Comerciales",      icon: "📈" },
    { id: "aacc",              label: "Acuerdos Comerciales",  icon: "💰" },
    { section: "Gestión Financiera" },
    { id: "po",                label: "PO Management",         icon: "📋" },
    { id: "forecast",          label: "Forecast",              icon: "📅" },
    { id: "budget",            label: "Presupuesto",           icon: "💼" },
    { section: "Branding" },
    { id: "branding-requests", label: "Solicitudes branding",  icon: "⭐" },
    { section: "Config" },
    { id: "config",            label: "Configuración",         icon: "⚙️" },
  ],
};

const LEGACY_MODULES = [
  { id: "commercial", label: "Consulta Comercial" },
  { id: "aacc", label: "Acuerdos Comerciales" },
];

const ON_FIVE_MODULES = [
  {
    key: "staff",
    label: "Staff",
    title: "Staff e incentivos",
    description: "Capacitaciones, incentivos, merch entregado, ganadores y evidencias del equipo del local.",
    primaryAction: "Crear incentivo",
    fields: ["Tema capacitacion", "Duracion incentivo", "Premio", "Ganador"],
    actionCards: [
      "Registrar capacitacion DBA o Walker",
      "Agregar merch entregado: lanyards, pins, poleras o premios",
      "Subir foto del staff o ganador con premio",
    ],
    records: ["Incentivo Tanqueray termina en 5 dias", "Carla Funes capacitada en perfect serve", "Pendiente foto de ganador"],
  },
  {
    key: "assortment",
    label: "Assortment",
    title: "Assortment y venta LH",
    description: "Detalle de venta conectado a Lighthouse, etiquetas presentes, faltantes y foto de exito por segmento.",
    primaryAction: "Actualizar bitacora",
    fields: ["Venta LH", "Etiquetas faltantes", "Foto de exito", "Proxima reposicion"],
    actionCards: [
      "Revisar venta por etiqueta desde LH",
      "Marcar etiquetas faltantes segun segmento",
      "Comparar contra foto de exito perfecta",
    ],
    records: ["Faltan Singleton y Baileys", "Assortment esperado: 9 etiquetas", "Fuente futura: Lighthouse"],
  },
  {
    key: "menu",
    label: "Menu",
    title: "Menú",
    description: "KPI manual de carta: Cocteleria de Autor y Drink Strategy. Lectura por PDF o QR disponible en etapa futura.",
    primaryAction: "Escanear menu",
    fields: ["Ultima lectura", "Share de carta", "Proxima fecha cambio menu", "Oportunidad"],
    actionCards: [
      "Abrir lectura de carta con IA",
      "Registrar productos Diageo y competencia",
      "Guardar bitacora de cambios de menu",
    ],
    records: ["Proximo cambio de carta: junio", "Oportunidad Don Julio Paloma", "Lectura IA en maqueta"],
  },
  {
    key: "branding",
    label: "Branding",
    title: "Branding y visibilidad",
    description: "Elementos de marca presentes, estado de activos, evidencia y solicitudes directas a CP&A.",
    primaryAction: "Pedir a CP&A",
    fields: ["Elemento requerido", "Marca foco", "Motivo", "Estado solicitud"],
    actionCards: [
      "Registrar material POP existente",
      "Solicitar table tent, backbar, cooler o piezas de marca",
      "Subir foto de instalacion o deterioro",
    ],
    records: ["Table tent solicitado a CP&A", "Contrabarra con visibilidad gin", "Falta foto de instalacion"],
  },
  {
    key: "activation",
    label: "Activation",
    title: "Activation y promociones",
    description: "Promociones en curso, formato, mecanica, duracion, contraprestacion y fotos de ejecucion.",
    primaryAction: "Crear activacion",
    fields: ["Formato", "Duracion", "Que ofrecimos", "Fotos"],
    actionCards: [
      "Registrar HH, table tent, tasting o noche de marca",
      "Definir mecanica y contraprestacion acordada",
      "Subir fotos de registro y resultado",
    ],
    records: ["HH Tanqueray activa", "Mecanica: 2x1 Gin Tonic", "Pendiente medir venta incremental"],
  },
];

const STAFF_REGISTER_TYPES = [
  {
    key: "routineVisit",
    label: "Visita rutinaria",
    fields: [
      { key: "date", label: "Fecha", type: "date" },
      { key: "notes", label: "Notas", type: "textarea", placeholder: "Que se vio, que se acordo y que queda pendiente" },
      { key: "photos", label: "Fotos", type: "file" },
    ],
  },
  {
    key: "commercialVisit",
    label: "Visita comercial",
    fields: [
      { key: "date", label: "Fecha", type: "date" },
      { key: "participants", label: "Quien participo", type: "text", placeholder: "Ej: dueno, administrador, jefe de barra, Walker" },
      { key: "notes", label: "Minuta", type: "textarea", placeholder: "Tema conversado, acuerdo comercial, compromiso y proximo paso" },
      { key: "photos", label: "Fotos", type: "file" },
    ],
  },
  {
    key: "training",
    label: "Capacitacion",
    fields: [
      { key: "date", label: "Fecha", type: "date" },
      { key: "brand", label: "Marca", type: "text", placeholder: "Ej: Tanqueray, Don Julio, Johnnie Walker" },
      { key: "ownerType", label: "Quien la realizo", options: ["DBA", "Walker"], type: "select" },
      { key: "ownerName", label: "Quien", options: ["Ana Garcia", "Carlos DBA", "Marcos Ruiz", "Lucas Prima"], type: "datalist" },
      { key: "photo", label: "Foto de registro", type: "file" },
    ],
  },
  {
    key: "newIncentive",
    label: "Nuevo incentivo",
    fields: [
      { key: "incentiveName", label: "Nombre del incentivo", type: "text", placeholder: "Ej: Tanqueray Perfect Serve Challenge" },
      { key: "launchDate", label: "Fecha lanzamiento", type: "date" },
      { key: "duration", label: "Duracion", type: "dateRange" },
      { key: "mechanic", label: "Mecanica", type: "textarea", placeholder: "Como gana el staff y que se mide" },
      { key: "prize", label: "Premio", type: "text", placeholder: "Ej: gift card, merch, experiencia, producto" },
    ],
  },
  {
    key: "closeIncentive",
    label: "Cierre incentivo",
    fields: [
      { key: "incentive", label: "Incentivo a cerrar", options: ["__dynamic__"], type: "select" },
      { key: "winner", label: "Ganador", type: "text", placeholder: "Nombre del ganador" },
      { key: "prizePhoto", label: "Foto entrega premio", type: "file" },
    ],
  },
];

// ── Catálogo de etiquetas OT ──────────────────────────────────────
const OT_LABELS = [
  { id: "dj1942",    name: "Don Julio 1942",              category: "Tequila" },
  { id: "dj70",      name: "Don Julio 70",                category: "Tequila" },
  { id: "djrep",     name: "Don Julio Reposado",          category: "Tequila" },
  { id: "djanejo",   name: "Don Julio Añejo",             category: "Tequila" },
  { id: "djblanco",  name: "Don Julio Blanco",            category: "Tequila" },
  { id: "jwred",     name: "Johnnie Walker Red",          category: "Whisky" },
  { id: "jwblack",   name: "Johnnie Walker Black",        category: "Whisky" },
  { id: "jwdblack",  name: "Johnnie Walker Double Black", category: "Whisky" },
  { id: "jwgold",    name: "Johnnie Walker Gold",         category: "Whisky" },
  { id: "jwblue",    name: "Johnnie Walker Blue",         category: "Whisky" },
  { id: "tqlon",     name: "Tanqueray London",            category: "Gin" },
  { id: "tqbossa",   name: "Tanqueray Bossa Nova",        category: "Gin" },
  { id: "tqsevilla", name: "Tanqueray Sevilla",           category: "Gin" },
  { id: "tqroyale",  name: "Tanqueray Royale",            category: "Gin" },
  { id: "gordons",   name: "Gordon's",                    category: "Gin" },
  { id: "smirnoff",  name: "Smirnoff",                    category: "Vodka" },
];
const OT_INNOVATIONS = [
  { id: "tq00",      name: "Tanqueray 0,0",  category: "Gin NA" },
  { id: "gordspink", name: "Gordon's Pink",  category: "Gin" },
];
const OT_OUTLET_TYPES  = ["Bar", "Restaurante", "Disco"];
const OT_SEGMENT_TYPES = ["Reserve", "Premium Core", "Mainstream"];

// Clave compuesta: "Outlet-Segmento"
function assortmentKey(outlet, segment) { return `${outlet}-${segment}`; }

function normalizeOutlet(subchannel = "", occasion = "") {
  const s = (subchannel || occasion || "").toLowerCase();
  if (s.includes("disco") || s.includes("nightlife") || s.includes("club")) return "Disco";
  if (s.includes("rest") || s.includes("dining") || s.includes("hotel") || s.includes("bar")) {
    if (s.includes("rest") || s.includes("dining") || s.includes("hotel")) return "Restaurante";
  }
  return "Bar";
}

function normalizeSegment(segment = "") {
  const s = segment.toLowerCase();
  if (s.includes("reserve")) return "Reserve";
  if (s.includes("mainstream")) return "Mainstream";
  return "Premium Core";
}

// ── Assortment por defecto — CP&A puede editarlo en Configuración ─
const DEFAULT_ASSORTMENT_CONFIG = {
  // Bar
  "Bar-Reserve":              ["dj1942","dj70","djrep","djanejo","djblanco","jwblack","jwdblack","jwgold","jwblue","tqlon","tqbossa","tqsevilla","gordons"],
  "Bar-Premium Core":         ["djrep","djblanco","jwblack","jwdblack","jwgold","tqlon","tqsevilla","tqbossa","gordons","smirnoff"],
  "Bar-Mainstream":           ["jwred","jwblack","tqlon","gordons","smirnoff"],
  // Restaurante
  "Restaurante-Reserve":      ["dj1942","djrep","djanejo","djblanco","jwblack","jwgold","jwblue","tqlon","tqsevilla","gordons"],
  "Restaurante-Premium Core": ["djrep","djblanco","jwblack","jwgold","tqlon","tqsevilla","gordons","smirnoff"],
  "Restaurante-Mainstream":   ["jwred","jwblack","tqlon","gordons","smirnoff"],
  // Disco
  "Disco-Reserve":            ["djblanco","jwblack","jwdblack","jwgold","tqlon","tqbossa","gordons","smirnoff"],
  "Disco-Premium Core":       ["jwblack","jwred","tqlon","tqbossa","gordons","smirnoff"],
  "Disco-Mainstream":         ["jwred","tqlon","gordons","smirnoff"],
};

// Mantenemos ASSORTMENT_PORTFOLIOS solo como fallback legacy (no se usa en nueva lógica)
const ASSORTMENT_PORTFOLIOS = {};


const MENU_DETECTION_MOCKS = {
  "bar-lagarto": [
    { id: "m1", name: "Tanqueray & Tonic", category: "Gin", brand: "Tanqueray", owner: "Diageo", price: 8900, confidence: 0.94 },
    { id: "m2", name: "Don Julio Paloma", category: "Tequila", brand: "Don Julio", owner: "Diageo", price: 10900, confidence: 0.9 },
    { id: "m3", name: "JW Black Highball", category: "Whisky", brand: "Johnnie Walker", owner: "Diageo", price: 9900, confidence: 0.92 },
    { id: "m4", name: "Aperol Spritz", category: "Aperitivo", brand: "Aperol", owner: "Competencia", price: 8200, confidence: 0.88 },
    { id: "m5", name: "Margarita Casa", category: "Tequila", brand: "Competidor tequila", owner: "Competencia", price: 9500, confidence: 0.81 },
  ],
  "hotel-alvear": [
    { id: "m1", name: "Blue Label neat", category: "Whisky", brand: "Johnnie Walker", owner: "Diageo", price: 32000, confidence: 0.91 },
    { id: "m2", name: "Tanqueray No. Ten Martini", category: "Gin", brand: "Tanqueray", owner: "Diageo", price: 14500, confidence: 0.93 },
    { id: "m3", name: "Zacapa Old Fashioned", category: "Rum", brand: "Zacapa", owner: "Diageo", price: 16800, confidence: 0.85 },
    { id: "m4", name: "Macallan 12", category: "Whisky", brand: "Macallan", owner: "Competencia", price: 28500, confidence: 0.89 },
    { id: "m5", name: "Grey Goose Martini", category: "Vodka", brand: "Grey Goose", owner: "Competencia", price: 14200, confidence: 0.84 },
  ],
  "club-crobar": [
    { id: "m1", name: "Smirnoff Red Energy", category: "Vodka", brand: "Smirnoff", owner: "Diageo", price: 7200, confidence: 0.9 },
    { id: "m2", name: "JW Red Cola", category: "Whisky", brand: "Johnnie Walker", owner: "Diageo", price: 7600, confidence: 0.88 },
    { id: "m3", name: "Tanqueray Gin Tonic", category: "Gin", brand: "Tanqueray", owner: "Diageo", price: 8400, confidence: 0.92 },
    { id: "m4", name: "Jager Bomb", category: "Liqueur", brand: "Jagermeister", owner: "Competencia", price: 6900, confidence: 0.87 },
    { id: "m5", name: "Vodka house", category: "Vodka", brand: "Marca local", owner: "Competencia", price: 6200, confidence: 0.76 },
  ],
};

const GAP_RULES = [
  { pillar: "staff",      label: "Staff",       title: "Registrar visita de terreno",    priority: "Alta"  },
  { pillar: "menu",       label: "Menu",        title: "Cerrar gaps de menu On Five",    priority: "Alta"  },
  { pillar: "assortment", label: "Assortment",  title: "Actualizar foto de exito",       priority: "Media" },
  { pillar: "branding",   label: "Branding",    title: "Solicitar material POP",         priority: "Media" },
  { pillar: "activation", label: "Activacion",  title: "Activar Always On en cuenta",   priority: "Baja"  },
];

function buildKanbanFromLocals(locals) {
  const cards = [];
  const sorted = [...locals].sort((a, b) => a.healthScore - b.healthScore);
  for (const local of sorted) {
    const firstGap = GAP_RULES.find((r) => local.pillars[r.pillar]?.score === "Pendiente" || local.pillars[r.pillar]?.score === "Sin registro");
    if (!firstGap) continue;
    cards.push({
      id:       `task-${local.id}-${firstGap.pillar}`,
      localId:  local.id,
      local:    local.name,
      title:    firstGap.title,
      zone:     local.district || local.region || "",
      origin:   firstGap.label,
      priority: local.healthScore < 50 ? "Alta" : firstGap.priority,
      due:      local.walkerName,
    });
    if (cards.length >= 18) break;
  }
  return cards;
}

function OnTradeCrm({ onOpenModule, profile }) {
  const { signOut } = useAuth();
  const roleId = profile?.role ?? "walker";
  const [activeView, setActiveView] = useState("dashboard");
  const [activeWalker, setActiveWalker] = useState("all");
  const [excelError, setExcelError] = useState("");
  const [selectedLocalId, setSelectedLocalId] = useState(MAESTRO_LOCALS[0]?.id ?? null);
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [extraContacts, setExtraContacts] = useState({});
  const [activeOnFiveModule, setActiveOnFiveModule] = useState("staff");
  const [assortmentConfig, setAssortmentConfig] = useState(DEFAULT_ASSORTMENT_CONFIG);
  const [assortmentAudits, setAssortmentAudits] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingExcelResult, setPendingExcelResult] = useState(null);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadSavedAt, setUploadSavedAt] = useState(null);
  const [uploadSupabaseError, setUploadSupabaseError] = useState("");
  const [developers, setDevelopers] = useState([]);

  useEffect(() => {
    if (roleId === "walker" && profile?.walker_name) {
      setActiveWalker(profile.walker_name);
    }
  }, [roleId, profile?.walker_name]);

  useEffect(() => {
    fetchDevelopers().then(setDevelopers).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeView === "execution" && selectedLocalId) {
      // Siempre refresca desde DB al entrar a On Five (ignora caché)
      refreshNotesForLocal(selectedLocalId);
    }
  }, [activeView, selectedLocalId]);

  const {
    locals: localsData,
    setLocals: setLocalsData,
    walkers,
    setWalkers,
    meta: excelMeta,
    setMeta: setExcelMeta,
    kanbanColumns: supabaseKanban,
    setKanbanColumns,
    extraNotes,
    loading: supabaseLoading,
    syncError,
    isSupabaseEnabled,
    loadNotesForLocal,
    refreshNotesForLocal,
    publishNote: persistNote,
    updateLocalPillar,
    saveAssortmentAudit: persistAssortmentAudit,
    updateMission,
    importLocalsFromExcel,
    moveKanbanCardFn,
    addManualLocal,
  } = useSupabaseData({
    fallbackLocals: MAESTRO_LOCALS,
    fallbackWalkers: MAESTRO_WALKERS,
    fallbackMeta: MAESTRO_META,
  });

  const [localKanbanColumns, setLocalKanbanColumns] = useState(() => ([
    { id: "todo",     title: "Pendiente",   cards: buildKanbanFromLocals(MAESTRO_LOCALS) },
    { id: "progress", title: "En progreso", cards: [] },
    { id: "done",     title: "Completado",  cards: [] },
  ]));

  const kanbanColumns = supabaseKanban ?? localKanbanColumns;
  function setKanbanColumnsCompat(val) {
    setKanbanColumns(val);
    setLocalKanbanColumns(val);
  }

  const role = CRM_ROLES.find((item) => item.id === roleId) ?? CRM_ROLES[0];

  // Cuentas filtradas por Walker activo (walker_name del Excel o ruta asignada)
  const visibleLocals = useMemo(() => {
    if (activeWalker === "all") return localsData;
    return localsData.filter((l) =>
      l.walkerName === activeWalker ||
      (profile?.ruta && l.ruta === profile.ruta)
    );
  }, [localsData, activeWalker, profile?.ruta]);

  const selectedLocal = visibleLocals.find((item) => item.id === selectedLocalId) ?? visibleLocals[0] ?? null;
  const localNotes = selectedLocal ? [...(extraNotes[selectedLocal.id] ?? []), ...(selectedLocal.notes ?? [])] : [];
  const dashboardSummary = useMemo(() => summarizeOnFiveLocals(visibleLocals), [visibleLocals]);

  async function handleClearBase() {
    setLocalsData([]);
    setWalkers([]);
    setExcelMeta(null);
    setSelectedLocalId(null);
    setActiveWalker("all");
    try { await deleteAllLocals(); } catch {}
  }

  async function handleOnFiveWorkbookUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setExcelError("");
    setUploadSupabaseError("");
    setPendingExcelResult(null);
    setUploadSavedAt(null);
    try {
      const result = await parseOnFiveWorkbook(file);
      // Update React state immediately so user can preview
      setLocalsData(result.locals);
      setWalkers(result.walkers);
      setExcelMeta({ fileName: result.fileName, count: result.locals.length, walkerCount: result.walkers.length });
      setActiveWalker("all");
      setSelectedLocalId(result.locals[0]?.id ?? null);
      setKanbanColumnsCompat([
        { id: "todo",     title: "Pendiente",   cards: buildKanbanFromLocals(result.locals) },
        { id: "progress", title: "En progreso", cards: [] },
        { id: "done",     title: "Completado",  cards: [] },
      ]);
      setPendingExcelResult(result);
    } catch (error) {
      setExcelError(error.message || "No pude leer el Excel. Verifica que la hoja se llame 'Cuentas' y tenga las columnas correctas.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleSaveExcelToSupabase() {
    if (!pendingExcelResult) return;
    setUploadSaving(true);
    setUploadProgress(null);
    setUploadSupabaseError("");
    try {
      await upsertLocals(pendingExcelResult.locals, (done, total) => setUploadProgress({ done, total }));
      await upsertRoutesFromLocals(pendingExcelResult.locals).catch(() => {});
      fetchRoutes().then(setRoutes).catch(() => {});
      setUploadSavedAt(new Date());
      setPendingExcelResult(null);
    } catch (err) {
      const msg = err.message ?? "";
      const lower = msg.toLowerCase();
      let friendly = msg;
      if (lower.includes("ruta") || lower.includes("column") || lower.includes("does not exist")) {
        friendly = `Falta la columna 'ruta' en la base de datos.\nEjecuta en SQL Editor:\n\nALTER TABLE locals ADD COLUMN IF NOT EXISTS ruta text default '';\n\nLuego haz click en Guardar de nuevo.`;
      } else if (lower.includes("conflict") && lower.includes("second time")) {
        friendly = "El archivo tiene cuentas con el mismo código duplicado (CLIENTE ID). Revisa el Excel y asegúrate de que cada cuenta tenga un código único.";
      } else if (lower.includes("jwt") || lower.includes("auth")) {
        friendly = "Sesión expirada. Recarga la página e intenta de nuevo.";
      } else if (lower.includes("network") || lower.includes("fetch")) {
        friendly = "Error de conexión. Verifica tu internet e intenta de nuevo.";
      }
      setUploadSupabaseError(friendly);
    } finally {
      setUploadSaving(false);
    }
  }

  function moveCard(targetColumnId) {
    if (!draggedCardId) {
      return;
    }

    moveKanbanCardFn(draggedCardId, targetColumnId);
    setLocalKanbanColumns((currentColumns) => {
      let movedCard = null;
      const withoutCard = currentColumns.map((column) => {
        const cards = column.cards.filter((card) => {
          if (card.id === draggedCardId) {
            movedCard = card;
            return false;
          }

          return true;
        });

        return { ...column, cards };
      });

      if (!movedCard) {
        return currentColumns;
      }

      return withoutCard.map((column) =>
        column.id === targetColumnId ? { ...column, cards: [...column.cards, movedCard] } : column,
      );
    });
    setDraggedCardId(null);
  }

  function publishNote() {
    const noteText = draftNote.trim();
    if (!noteText || !selectedLocal) return;
    const note = {
      id: `note-${Date.now()}`,
      author: profile?.full_name ?? role.name,
      date: "Ahora",
      nextAction: "Definir siguiente paso desde el playbook.",
      text: noteText,
      type: "Minuta",
    };
    persistNote(selectedLocal.id, note);
    setDraftNote("");
  }

  return (
    <section
      aria-label="BARRA · On Trade Execution"
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 md:px-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition hover:bg-white/10 focus:outline-none md:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 14.75z" clipRule="evenodd" />
            </svg>
          </button>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base"
          >
            🪩
          </span>
          <div className="flex flex-col leading-tight">
            <strong className="text-[13px] font-semibold tracking-tight text-white">BARRA</strong>
            <small className="hidden text-[11px] text-slate-400 sm:block">On Trade Execution · Diageo Chile</small>
          </div>
          {isSupabaseEnabled && (
            <span className={`ml-2 hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${supabaseLoading ? "bg-yellow-500/20 text-yellow-300" : syncError ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
              {supabaseLoading ? "Sincronizando…" : syncError ? "Error sync" : "Supabase ✓"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-[13px] font-semibold text-white">{profile?.full_name ?? "Usuario"}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              {roleId === "walker"
                ? profile?.ruta ? `Walker · ${profile.ruta}` : "Walker"
                : roleId === "manager" ? "OT Manager" : "CP&A"}
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 z-30 flex w-72 flex-col gap-5
          border-r border-slate-200 bg-white p-3
          transition-transform duration-200 ease-in-out
          md:relative md:inset-auto md:z-auto md:w-60 md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Menú</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {roleId === "walker" ? "Walker On Trade" : roleId === "manager" ? "OT Manager" : "CP&A"}
            </span>
            <strong className="text-[13px] font-semibold text-slate-900">{profile?.full_name ?? role.name}</strong>
            <small className="text-[11px] text-slate-500">
              {roleId === "walker"
                ? profile?.ruta
                  ? `${profile.ruta} · ${visibleLocals.length} cuentas`
                  : `${visibleLocals.length} cuentas asignadas`
                : excelMeta
                  ? `${excelMeta.count} cuentas · ${excelMeta.walkerCount} walkers`
                  : role.subtitle}
            </small>
          </div>

          {roleId !== "walker" && walkers.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Walker</span>
              <SidebarNavButton
                isActive={activeWalker === "all"}
                onClick={() => setActiveWalker("all")}
              >
                Todos ({localsData.length})
              </SidebarNavButton>
              {walkers.map((w) => (
                <SidebarNavButton
                  key={w.id}
                  isActive={activeWalker === w.id}
                  onClick={() => { setActiveWalker(w.id); setSelectedLocalId(null); setActiveView("contacts"); }}
                >
                  {w.name} ({w.count})
                </SidebarNavButton>
              ))}
            </div>
          ) : null}

          <nav aria-label="Navegacion CRM" className="flex flex-col gap-0.5">
            {ROLE_NAV[roleId].map((item, idx) => {
              if (item.section) {
                return (
                  <span
                    key={`sec-${idx}`}
                    className="mt-3 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {item.section}
                  </span>
                );
              }
              const isActive =
                activeView === item.id ||
                (item.id === "team" && (activeView === "team" || activeView.startsWith("walker-")));
              return (
                <React.Fragment key={item.id}>
                  <SidebarNavButton
                    isActive={isActive}
                    onClick={() => { setSidebarOpen(false); item.openModule ? onOpenModule(item.openModule) : setActiveView(item.id); }}
                    icon={item.icon}
                  >
                    {item.label}
                  </SidebarNavButton>
                  {item.id === "team" && roleId === "manager"
                    ? walkers.map((w) => (
                        <SidebarNavButton
                          key={`walker-nav-${w.id}`}
                          isActive={activeView === `walker-${w.id}`}
                          onClick={() => {
                            setSidebarOpen(false);
                            setActiveWalker(w.id);
                            setActiveView(`walker-${w.id}`);
                          }}
                          indented
                          trailing={w.count}
                        >
                          {w.name}
                        </SidebarNavButton>
                      ))
                    : null}
                </React.Fragment>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 space-y-5 p-6">
          <CrmPageHeader
            activeView={activeView}
            roleId={roleId}
          />

          {activeView === "contacts" ? (
            <ContactsProjectsView
              locals={visibleLocals}
              activeWalker={activeWalker}
              walkers={walkers}
              onOpenLocal={(localId) => {
                setSelectedLocalId(localId);
                setActiveView("local");
                loadNotesForLocal(localId);
              }}
            />
          ) : null}

          {roleId === "walker" && activeView === "dashboard" ? (
            <WalkerDashboard
              columns={kanbanColumns}
              locals={visibleLocals}
              summary={dashboardSummary}
              profile={profile}
              draggedCardId={draggedCardId}
              onCardDragStart={setDraggedCardId}
              onCardDrop={moveCard}
              onOpenLocal={(localId) => {
                setSelectedLocalId(localId);
                setActiveView("local");
                loadNotesForLocal(localId);
              }}
            />
          ) : null}

          {activeView === "local" && selectedLocal ? (
            <LocalProfile
              draftNote={draftNote}
              local={selectedLocal}
              notes={localNotes}
              extraContacts={[...(extraContacts[selectedLocal.id] ?? []), ...selectedLocal.contacts]}
              walkers={walkers}
              roleId={roleId}
              developers={developers}
              onAssignWalker={async (walkerName) => {
                setLocalsData((prev) => prev.map((l) => l.id === selectedLocal.id ? { ...l, walkerName } : l));
                try { await updateLocalWalkerName(selectedLocal.id, walkerName); } catch {}
              }}
              onAddContact={(contact) => setExtraContacts((prev) => ({
                ...prev,
                [selectedLocal.id]: [contact, ...(prev[selectedLocal.id] ?? [])],
              }))}
              onDraftNoteChange={setDraftNote}
              onOpenOnFive={(moduleKey) => {
                setActiveOnFiveModule(moduleKey);
                setActiveView("execution");
              }}
              onPublishNote={publishNote}
              onUpdateAccountCode={async (newCode) => {
                setLocalsData((prev) => prev.map((l) => l.id === selectedLocal.id ? { ...l, accountCode: newCode, accountCodePending: false } : l));
                try { await updateLocalAccountCode(selectedLocal.id, newCode); } catch {}
              }}
            />
          ) : null}

          {activeView === "execution" && roleId === "walker" && !selectedLocal ? (
            <article className="crm-card" style={{ padding: "32px", textAlign: "center", color: "#9CA3AF" }}>
              <p style={{ fontSize: "0.9rem", marginBottom: "10px" }}>Selecciona una cuenta primero para abrir On Five.</p>
              <button className="crm-nav__item" style={{ margin: "0 auto", border: "0.5px solid #E5E7EB", borderRadius: "6px", padding: "0 16px", color: "#374151" }} onClick={() => setActiveView("contacts")}>
                Ver cuentas →
              </button>
            </article>
          ) : null}
          {activeView === "execution" && roleId === "walker" && selectedLocal ? (
            <ExecutionWorkspace
              activeModuleKey={activeOnFiveModule}
              activeUserName={profile?.full_name ?? role.name}
              local={selectedLocal}
              developers={developers}
              onSelectModule={setActiveOnFiveModule}
              onUpdatePillar={(pillarKey, data) => updateLocalPillar(selectedLocal.id, pillarKey, data)}
              assortmentConfig={assortmentConfig}
              assortmentAudit={assortmentAudits[selectedLocal.id] ?? null}
              onSaveAssortmentAudit={async (checkedIds, segmentIds) => {
                const audit = await persistAssortmentAudit(selectedLocal.id, checkedIds, profile?.full_name ?? role.name, segmentIds);
                setAssortmentAudits((prev) => ({ ...prev, [selectedLocal.id]: audit }));
              }}
              executionNotes={extraNotes[selectedLocal.id] ?? []}
              onPublishNote={(note) => publishNote(selectedLocal.id, note)}
            />
          ) : null}

          {roleId === "cpa" && activeView === "dashboard"         ? <CpaDashboard locals={visibleLocals} walkers={walkers} /> : null}
          {roleId === "cpa" && activeView === "solicitudes"        ? <CpaSolicitudesView locals={visibleLocals} /> : null}
          {roleId === "cpa" && activeView === "kpi-walkers"        ? <CpaKpiWalkersView locals={visibleLocals} walkers={walkers} /> : null}
          {roleId === "cpa" && activeView === "share"              ? <CpaPlaceholder icon="📊" title="Análisis de Share" desc="Evolución de participación de mercado por categoría, marca y canal." tag="En desarrollo" /> : null}
          {roleId === "cpa" && activeView === "kpi-comercial"      ? <CpaPlaceholder icon="📈" title="KPIs Comerciales" desc="Cobertura de acuerdos, sell out, distribución numérica y evolución por zona walker." tag="En desarrollo" /> : null}
          {roleId === "cpa" && activeView === "aacc"               ? <CpaPlaceholder icon="💰" title="Acuerdos Comerciales" desc="P&L por acuerdo comercial, contribución marginal y simulador de escenarios." tag="En desarrollo" /> : null}
          {roleId === "cpa" && activeView === "po"                 ? <CpaPlaceholder icon="📋" title="PO Management" desc="Gestión de Purchase Orders: creación, estado, aprobación, historial y cierre." tag="En desarrollo" /> : null}
          {roleId === "cpa" && activeView === "forecast"           ? <CpaPlaceholder icon="📅" title="Forecast" desc="Proyección de volumen y valor vs plan por SKU, canal y zona. Actualización mensual." tag="En desarrollo" /> : null}
          {roleId === "cpa" && activeView === "budget"             ? <CpaPlaceholder icon="💼" title="Gestión de Presupuesto" desc="Control de gasto real vs presupuesto. Alertas de desviación y proyección de cierre." tag="En desarrollo" /> : null}
          {roleId === "cpa" && activeView === "branding-requests"  ? <BrandingRequestsBoard /> : null}
          {roleId === "cpa" && activeView === "config" ? (
            <ConfigView
              excelMeta={excelMeta}
              excelError={excelError}
              onUpload={handleOnFiveWorkbookUpload}
              onClearBase={handleClearBase}
              localsData={localsData}
              setLocalsData={setLocalsData}
              walkers={walkers}
              onAddManualLocal={addManualLocal}
              assortmentConfig={assortmentConfig}
              onSaveAssortmentConfig={setAssortmentConfig}
              onUpdateAccount={(localId, updates) =>
                setLocalsData((current) => current.map((l) => l.id === localId ? { ...l, ...updates } : l))
              }
              pendingExcelResult={pendingExcelResult}
              onSaveToSupabase={handleSaveExcelToSupabase}
              uploadSaving={uploadSaving}
              uploadSavedAt={uploadSavedAt}
              uploadSupabaseError={uploadSupabaseError}
              developers={developers}
              onDevelopersChange={setDevelopers}
            />
          ) : null}

          {roleId === "manager" && activeView === "dashboard"     ? <ManagerDashboard locals={visibleLocals} walkers={walkers} /> : null}
          {roleId === "manager" && activeView === "team"          ? <ManagerTeamView walkers={walkers} locals={visibleLocals} /> : null}
          {roleId === "manager" && activeView === "share"         ? <CpaPlaceholder icon="🥧" title="Análisis de Share" desc="Evolución de participación de mercado por categoría, marca y canal." tag="En desarrollo" /> : null}
          {roleId === "manager" && activeView === "kpi-comercial" ? <CpaPlaceholder icon="📈" title="KPIs Comerciales" desc="Cobertura de acuerdos, sell out, distribución numérica y evolución por zona walker." tag="En desarrollo" /> : null}
          {roleId === "manager" && activeView === "aacc"          ? <CpaPlaceholder icon="💰" title="Acuerdos Comerciales" desc="Este módulo se está construyendo desde cero. Aquí irá el P&L por acuerdo, ROI, vencimientos y simulador de escenarios." tag="En desarrollo" /> : null}
        </main>
      </div>
    </section>
  );
}

function SidebarNavButton({ children, icon, indented = false, isActive, onClick, trailing }) {
  const base =
    "flex h-8 items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-medium leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 focus-visible:ring-offset-white";
  const active = isActive
    ? "bg-slate-900 text-white"
    : "text-slate-600 hover:bg-slate-100 active:bg-slate-200";
  const indent = indented ? "ml-3" : "";
  return (
    <button type="button" onClick={onClick} className={`${base} ${active} ${indent}`}>
      {icon ? (
        <span aria-hidden="true" className="text-[11px] opacity-80">
          {icon}
        </span>
      ) : null}
      <span className="flex-1">{children}</span>
      {trailing != null ? (
        <span className="text-[11px] opacity-70">{trailing}</span>
      ) : null}
    </button>
  );
}

function CrmPageHeader({ activeView, roleId }) {
  const titles = {
    cpa: {
      contacts:          "Cuentas / PDV",
      dashboard:         "Dashboard CP&A",
      local:             "Perfil de cuenta",
      solicitudes:       "Solicitudes walkers",
      "kpi-walkers":     "KPIs walkers",
      commercial:        "Consulta comercial",
      share:             "Análisis de Share",
      "kpi-comercial":   "KPIs comerciales",
      aacc:              "Rentabilidad AACC",
      po:                "PO Management",
      forecast:          "Forecast",
      budget:            "Gestión de presupuesto",
      "branding-requests": "Solicitudes branding",
      config:            "Configuración",
    },
    manager: {
      contacts: "Cuentas",
      dashboard: "Direccion On Trade",
      local: "Perfil de cuenta",
      team: "Performance del equipo",
    },
    walker: {
      contacts:  "Cuentas",
      dashboard: "Guia semanal del Walker",
      execution: "On Five",
      local:     "Perfil de cuenta",
    },
  };

  return (
    <section className="flex flex-col gap-1 border-b border-slate-200 pb-4">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">BARRA</span>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        {titles[roleId]?.[activeView] ?? "CRM On Trade"}
      </h1>
      <p className="max-w-3xl text-[12px] leading-relaxed text-slate-500">
        {activeView === "contacts"
          ? "Lista limpia de cuentas, contactos y proyectos activos para priorizar el trabajo de ejecucion."
          : activeView === "local"
          ? "Ficha accionable para preparar la visita, registrar avances y desarrollar la cuenta."
          : activeView === "config"
          ? "Administracion de la cartera: carga del maestro de cuentas y asignacion por Walker."
          : "Tareas, misiones, ejecucion y performance conectadas en una sola rutina comercial."}
      </p>
    </section>
  );
}

function ExcelUploadView({ excelMeta, excelError, onUpload }) {
  return (
    <div style={{ display: "grid", gap: "16px", maxWidth: 680 }}>
      <article className="crm-card" style={{ padding: "28px 32px", display: "grid", gap: "20px" }}>
        <div>
          <span className="crm-eyebrow">Paso 1</span>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 740, margin: "4px 0 6px", letterSpacing: "-.02em" }}>Sube el Excel maestro de cuentas</h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.86rem", lineHeight: 1.55 }}>
            Hoja "Cuentas" con columnas: <strong>Nombre Cuenta</strong>, <em>ID Distribuidor</em>, <em>Segmento</em>, <em>Outlet</em>, <em>Dirección</em>, <em>Comuna</em>, <em>Desarrollador</em>, <em>AACC</em>. La columna <strong>Walker</strong> es opcional — puede ir en blanco y asignarse desde el perfil de cada cuenta.
          </p>
        </div>

        <label style={{ display: "block", cursor: "pointer" }}>
          <div style={{
            border: "2px dashed var(--border-md)",
            borderRadius: "var(--radius-card)",
            padding: "32px",
            textAlign: "center",
            background: "var(--canvas)",
            transition: "border-color .15s",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📂</div>
            <strong style={{ fontSize: "0.95rem", display: "block" }}>
              {excelMeta ? `✓ ${excelMeta.fileName}` : "Arrastra o haz click para seleccionar"}
            </strong>
            <small style={{ color: "var(--text-3)", fontSize: "0.78rem", marginTop: "4px", display: "block" }}>
              {excelMeta ? `${excelMeta.count} cuentas cargadas desde hoja "${excelMeta.sheetName}"` : "Formatos .xlsx o .xls"}
            </small>
          </div>
          <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onUpload} />
        </label>

        {excelError ? (
          <div style={{ background: "var(--red-100,#fef2f2)", border: "1px solid var(--red-200,#fecaca)", borderRadius: "8px", padding: "12px 14px", color: "#dc2626", fontSize: "0.84rem", fontWeight: 600 }}>
            ⚠️ {excelError}
          </div>
        ) : null}

        {excelMeta ? (
          <div style={{ background: "var(--accent-lt)", border: "1px solid var(--accent-mid)", borderRadius: "8px", padding: "12px 14px", color: "var(--accent)", fontSize: "0.84rem", fontWeight: 600 }}>
            ✓ {excelMeta.count} cuentas importadas — usa el menú lateral para navegar
          </div>
        ) : null}
      </article>

      <article className="crm-card" style={{ padding: "18px 24px" }}>
        <span className="crm-eyebrow">Columnas esperadas</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginTop: "10px" }}>
          {[
            ["CLIENTE ID", "Clave única de la cuenta"],
            ["Nombre Fantasía", "Nombre comercial del local"],
            ["Razón Social", "Nombre legal"],
            ["Segmento", "Trendsetter / Reserve / etc"],
            ["SUBCANAL", "Late Night / Dining / etc"],
            ["Comuna", "Ubicación geográfica"],
            ["Desarrollador Sell Out", "Walker asignado"],
            ["Acuerdo Comercial Vigente", "Tipo de AACC"],
            ["Fecha de Termino Acuerdo Comercial", "Vencimiento AACC"],
            ["Tropical Gin", "SI / NO"],
            ["CA c/ Whisky", "SI / NO"],
            ["CA c/ Gin", "SI / NO"],
            ["JW + Coca Cola", "SI / NO (naming correcto)"],
            ["Gin & Tonic", "SI / NO"],
            ["Whisky Sour", "SI / NO"],
            ["Glassware", "SI / NO"],
            ["Neones y otros", "SI / NO"],
            ["Always On", "SI / NO"],
            ["Foto de Éxito", "4/4 u otro"],
            ["Visitas", "Fecha última visita"],
            ["SKU's", "Lista de SKUs"],
            ["Observación", "Notas libres"],
          ].map(([col, hint]) => (
            <div key={col} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
              <code style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent)", flex: 1, fontFamily: "var(--mono,monospace)" }}>{col}</code>
              <span style={{ fontSize: "0.74rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>{hint}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function ContactsProjectsView({ locals, onOpenLocal }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const filters = [
    { id: "all",      label: "Todas" },
    { id: "aacc",     label: "Con AACC" },
    { id: "risk",     label: "Con riesgo" },
    { id: "menu_gap", label: "Gap en Menú" },
  ];

  const filteredLocals = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = locals.filter((local) => {
      const text = [
        local.name, local.legalName, local.district, local.segment,
        local.subchannel, local.developer, local.accountCode, local.address,
      ].join(" ").toLowerCase();
      const matchesQuery = !q || text.includes(q);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "aacc"     && local.hasAacc) ||
        (activeFilter === "risk"     && local.healthScore < 68) ||
        (activeFilter === "menu_gap" && local.pillars.menu.score !== "Completado");
      return matchesQuery && matchesFilter;
    });

    result = [...result].sort((a, b) => {
      let va, vb;
      if (sortBy === "name")        { va = a.name;          vb = b.name; }
      else if (sortBy === "health") { va = a.healthScore;   vb = b.healthScore; }
      else if (sortBy === "segment"){ va = a.segment;       vb = b.segment; }
      else if (sortBy === "menu")   { va = a.pillars.menu.summary; vb = b.pillars.menu.summary; }
      else { va = a.name; vb = b.name; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [activeFilter, locals, query, sortBy, sortDir]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  function SortTh({ col, children }) {
    const active = sortBy === col;
    return (
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className="flex select-none items-center gap-1 text-left transition hover:text-slate-900"
      >
        {children}
        <span className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  }

  function pillarDot(score) {
    const tone =
      score === "Completado" ? "bg-emerald-500" : score === "Pendiente" ? "bg-amber-500" : "bg-slate-400";
    return <span title={score} className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone}`} />;
  }

  if (locals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center text-slate-500">
        <span className="text-3xl" aria-hidden="true">📂</span>
        <strong className="text-base text-slate-900">Sin cuentas cargadas</strong>
        <p className="text-[13px]">
          Solicita al CP&A que cargue el Excel maestro desde Configuración para ver tu cartera aquí.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Cartera cargada desde Excel
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Cuentas · {filteredLocals.length === locals.length ? locals.length : `${filteredLocals.length} de ${locals.length}`}
          </h2>
        </div>
        <label className="flex flex-col gap-1 sm:w-80">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Buscar</span>
          <input
            placeholder="Nombre, cliente ID, comuna, segmento, SKU, walker..."
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard compact label="Cuentas totales" value={locals.length} note="cartera completa" />
        <MetricCard
          compact
          label="Con AACC Diageo"
          value={locals.filter((l) => l.hasAacc).length}
          note="acuerdos vigentes"
        />
        <MetricCard
          compact
          label="Gaps en Menú"
          value={locals.filter((l) => l.pillars.menu.score !== "Completado").length}
          note="KPIs incompletos"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr_1fr_1.2fr_0.6fr] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
          <SortTh col="name">Cuenta</SortTh>
          <SortTh col="segment">Segmento</SortTh>
          <span>Subcanal</span>
          <span>Comuna</span>
          <span>Desarrollador</span>
          <span>AACC</span>
          <span>Foto Éxito</span>
          <SortTh col="menu">On Five</SortTh>
          <SortTh col="health">Health</SortTh>
        </div>

        {filteredLocals.map((local) => {
          const healthTone =
            local.healthScore >= 76
              ? "text-emerald-600"
              : local.healthScore >= 68
              ? "text-amber-600"
              : "text-rose-600";
          const pillarsArr = ["staff", "assortment", "menu", "branding", "activation"];
          const assortment = local.pillars.assortment?.summary ?? "—";
          const assortLabel = assortment
            .replace("Foto de Exito: ", "")
            .replace("Pendiente foto de exito por segmento", "Pendiente");
          const assortHighlight = assortment.includes("4/4");

          return (
            <button
              key={local.id}
              type="button"
              onClick={() => onOpenLocal(local.id)}
              className="grid w-full grid-cols-1 items-center gap-2 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr_1fr_1.2fr_0.6fr] lg:gap-3"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                  {initials(local.name)}
                </span>
                <span className="flex flex-col">
                  <strong className="text-[13px] font-semibold text-slate-900">{local.name}</strong>
                  <small className="text-[11px] text-slate-500">{local.accountCode}</small>
                </span>
              </span>
              <span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {local.segment || "—"}
                </span>
              </span>
              <span className="hidden text-[12px] text-slate-600 lg:inline">{local.subchannel || "—"}</span>
              <span className="hidden text-[12px] text-slate-600 lg:inline">{local.district || "—"}</span>
              <span className="hidden truncate text-[12px] text-slate-600 lg:inline">{local.developer || "—"}</span>
              <span>
                {local.hasAacc ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Diageo
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    Sin AC
                  </span>
                )}
              </span>
              <span
                className={`hidden text-[12px] lg:inline ${
                  assortHighlight ? "font-bold text-emerald-600" : "text-slate-600"
                }`}
              >
                {assortLabel}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {pillarsArr.map((key) => (
                  <span key={key} className="flex items-center gap-1">
                    {pillarDot(local.pillars[key]?.score)}
                    <span className="text-[10px] font-medium text-slate-500">{key.slice(0, 2).toUpperCase()}</span>
                  </span>
                ))}
              </span>
              <span className={`text-right text-[14px] font-bold ${healthTone}`}>{local.healthScore}</span>
            </button>
          );
        })}

        {filteredLocals.length === 0 ? (
          <div className="px-4 py-7 text-center text-[13px] text-slate-500">
            Sin resultados para &quot;{query}&quot;
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-slate-500">
        <span className="font-semibold uppercase tracking-wide text-slate-600">On Five:</span>
        {[["ST", "Staff"], ["AS", "Assortment"], ["ME", "Menú"], ["BR", "Branding"], ["AC", "Activation"]].map(
          ([code, label]) => (
            <span key={code}>
              <strong className="text-slate-700">{code}</strong> {label}
            </span>
          ),
        )}
        {[
          ["bg-emerald-500", "Completado"],
          ["bg-amber-500", "Pendiente"],
          ["bg-slate-400", "Sin registro"],
        ].map(([tone, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function WalkerDashboard({ columns, locals, summary, profile, draggedCardId, onCardDragStart, onCardDrop, onOpenLocal }) {
  if (!locals || locals.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <article className="max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">🗺️</span>
            <div>
              <strong className="block text-[15px] font-semibold text-slate-900">
                {profile?.ruta ? `Ruta "${profile.ruta}" sin cuentas asignadas` : "Sin ruta asignada aún"}
              </strong>
              <p className="mt-1 text-[13px] text-slate-500">
                {profile?.ruta
                  ? "Tu CP&A está asignando las cuentas a esta ruta. Vuelve en unos minutos."
                  : "Tu CP&A te asignará una ruta con tus cuentas. No necesitas hacer nada por ahora."}
              </p>
            </div>
          </div>
        </article>
      </div>
    );
  }

  const total = locals.length;
  const pct = (n) => Math.round((n / total) * 100);
  const withVisit = locals.filter((l) => l.pillars.staff.score === "Completado").length;
  const withFoto  = locals.filter((l) => l.pillars.assortment.score === "Completado").length;
  const auditados = locals.filter((l) => l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)).length;
  const pctCobertura = total > 0 ? Math.round((auditados / total) * 100) : 0;
  const atRisk = [...locals].sort((a, b) => a.healthScore - b.healthScore).slice(0, 6);
  const onFiveScore = Math.round(
    ["staff","assortment","menu","branding","activation"].reduce((sum, key) => {
      const ok = locals.filter((l) => l.pillars?.[key]?.score === "Completado").length;
      return sum + (total > 0 ? (ok / total) * 100 : 0);
    }, 0) / 5
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          color="blue"
          icon="📊"
          question="¿Dónde estamos?"
          label="Cobertura On Five"
          value={`${pctCobertura}%`}
          progress={pctCobertura}
          note={`${auditados} de ${total} cuentas auditadas`}
        />
        <KpiCard
          color="green"
          icon="✅"
          question="¿Qué completé?"
          label="Staff e Assortment OK"
          value={withVisit}
          note={`${pct(withVisit)}% del portafolio completado`}
        />
        <KpiCard
          color="amber"
          icon="⚠️"
          question="¿Qué me falta?"
          label="Cuentas sin auditoría"
          value={total - auditados}
          note="requieren visita On Five"
        />
        <KpiCard
          color="purple"
          icon="📈"
          question="¿Cómo voy?"
          label="On Five score promedio"
          value={`${onFiveScore}%`}
          progress={onFiveScore}
          trend={onFiveScore >= 70 ? " ↑ En meta" : " ↓ Bajo meta"}
        />
      </section>

      <PillarSummaryGrid locals={locals} />

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="On Five" title="Avance por pilar" />
          <div className="flex flex-col gap-3">
            <ProgressRow label="Staff — visitas registradas" value={pct(withVisit)} />
            <ProgressRow label="Assortment — foto de exito" value={pct(withFoto)} />
            <ProgressRow label="Menu — cocktails y drink strategy" value={pct(summary.menuOk)} />
            <ProgressRow label="Branding — glassware y neon" value={pct(summary.brandingOk)} />
            <ProgressRow label="Activacion — Always On" value={pct(summary.activationOk)} />
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="Accion requerida" title="Cuentas con menor avance" />
          <div className="mt-2 flex flex-col gap-1.5">
            {atRisk.map((local) => {
              const tone =
                local.healthScore < 50
                  ? "text-rose-600"
                  : local.healthScore < 70
                  ? "text-amber-600"
                  : "text-slate-700";
              return (
                <button
                  key={local.id}
                  type="button"
                  onClick={() => onOpenLocal(local.id)}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
                >
                  <div className="flex flex-col">
                    <strong className="text-[13px] font-semibold text-slate-900">{local.name}</strong>
                    <small className="text-[11px] text-slate-500">
                      {local.district} · {local.walkerName}
                    </small>
                  </div>
                  <span className={`min-w-[2rem] text-right text-[14px] font-bold ${tone}`}>
                    {local.healthScore}
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle
          kicker="Operacion semanal"
          title="Tablero de tareas"
          description="Arrastra una tarjeta para cambiar su estado."
        />
        <KanbanBoard
          columns={columns}
          draggedCardId={draggedCardId}
          onCardDragStart={onCardDragStart}
          onCardDrop={onCardDrop}
          onOpenLocal={onOpenLocal}
        />
      </section>
    </div>
  );
}

function LocalProfile({ draftNote, developers = [], extraContacts, local, notes, onAddContact, onDraftNoteChange, onOpenOnFive, onPublishNote, walkers = [], roleId, onAssignWalker, onUpdateAccountCode }) {
  const healthTone =
    local.healthScore >= 76
      ? "text-emerald-600"
      : local.healthScore >= 68
      ? "text-amber-600"
      : "text-rose-600";

  const [editingCode, setEditingCode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeSaving, setCodeSaving] = useState(false);

  function startEditCode() {
    setCodeInput(local.accountCode || "");
    setEditingCode(true);
  }

  async function saveCode() {
    if (!codeInput.trim()) return;
    setCodeSaving(true);
    await onUpdateAccountCode?.(codeInput.trim());
    setCodeSaving(false);
    setEditingCode(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
              {initials(local.name)}
            </span>
            <div className="flex flex-1 flex-col">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{local.name}</h2>
              <p className="text-[12px] text-slate-500">{local.address}</p>
            </div>
            <strong className={`text-2xl font-bold ${healthTone}`}>{local.healthScore}</strong>
          </div>

          {roleId === "cpa" && (
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Walker</span>
              <select
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none"
                value={local.walkerName ?? ""}
                onChange={(e) => onAssignWalker?.(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {walkers.map((w) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
          {roleId !== "cpa" && local.walkerName && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Walker — </span>
              <span className="text-[12px] text-slate-600">{local.walkerName}</span>
            </div>
          )}

          {/* Código de cuenta — editable por Walker o CP&A */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Código cliente</span>
            {editingCode ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none"
                  placeholder="Ej: 501000123"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveCode(); if (e.key === "Escape") setEditingCode(false); }}
                />
                <button
                  type="button"
                  disabled={codeSaving || !codeInput.trim()}
                  onClick={saveCode}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {codeSaving ? "…" : "Guardar"}
                </button>
                <button type="button" onClick={() => setEditingCode(false)} className="text-[12px] text-slate-400 hover:text-slate-600">Cancelar</button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                {local.accountCodePending || !local.accountCode ? (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-700">Pendiente</span>
                ) : (
                  <span className="text-[13px] font-mono text-slate-700">{local.accountCode}</span>
                )}
                <button type="button" onClick={startEditCode} className="text-[11px] text-slate-400 underline hover:text-slate-700">
                  Editar
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[local.segment, local.occasion, ...local.tags].map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {local.kpis.filter((item) => item.label !== "Acuerdo").map((item) => (
              <MetricCard key={item.label} compact label={item.label} note={item.note} value={item.value} />
            ))}
            <MetricCard
              compact
              label="Acuerdo comercial"
              note={local.hasAacc ? "AACC vigente" : "Sin AACC"}
              tone={local.hasAacc ? "good" : "warning"}
              value={local.agreement || (local.hasAacc ? "Vigente" : "No")}
            />
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="Relacion" title="Contactos clave" />
          <KeyContacts contacts={extraContacts ?? local.contacts} onAdd={onAddContact} developerCode={local.developer} developers={developers} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="Performance" title="Ventas mensuales vs AA" />
          <MiniLineChart
            series={local.monthlySales}
            seed={local.accountCode ? parseInt(local.accountCode.toString().slice(-3), 10) : 7}
          />
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Desarrollo de cuenta" title="Misiones recomendadas" />
        <MissionGrid missions={local.missions} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle
          kicker="Estrategia en local"
          title="On Five"
          description="Resumen de los 5 modulos de desarrollo de cuenta. Entra a cada uno para accionar y registrar avances."
        />
        <ExecutionPillars local={local} onSelectPillar={onOpenOnFive} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Muro del local" title="Minuta y seguimiento" />
        <VisitWall
          draftNote={draftNote}
          notes={notes}
          onDraftNoteChange={onDraftNoteChange}
          onPublishNote={onPublishNote}
        />
      </section>
    </div>
  );
}

function ExecutionWorkspace({ activeModuleKey, activeUserName, developers = [], executionNotes = [], local, onPublishNote, onSelectModule, onUpdatePillar, assortmentConfig, assortmentAudit, onSaveAssortmentAudit }) {
  const activeModule = ON_FIVE_MODULES.find((module) => module.key === activeModuleKey) ?? ON_FIVE_MODULES[0];
  const activePillar = local.pillars[activeModule.key];

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle
          kicker="On Five"
          title={`Plan de desarrollo - ${local.name}`}
          description="On Five resume y ordena los 5 modulos de ejecucion. Cada modulo tiene acciones, evidencia, registros y bitacora propia."
        />
        <ExecutionPillars activeKey={activeModule.key} local={local} onSelectPillar={onSelectModule} />
      </section>

      <section>
        <OnFiveModuleDetail
          activeUserName={activeUserName}
          developers={developers}
          executionNotes={executionNotes}
          local={local}
          module={activeModule}
          pillar={activePillar}
          onUpdatePillar={onUpdatePillar}
          onPublishNote={onPublishNote}
          assortmentConfig={assortmentConfig}
          assortmentAudit={assortmentAudit}
          onSaveAssortmentAudit={onSaveAssortmentAudit}
        />
      </section>
    </div>
  );
}

function ChecklistList({ items }) {
  return (
    <ul className="flex flex-col gap-2 text-[13px] text-slate-700">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function VisitPlaybook({ local }) {
  const mainMission = local.missions[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Objetivo" title={`Visita a ${local.name}`} />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <strong className="block text-[13px] font-semibold text-slate-900">
            {mainMission?.title ?? "Revisar oportunidades del local"}
          </strong>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
            {mainMission?.reason ?? "Preparar conversacion comercial segun perfil y estado de ejecucion."}
          </p>
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Conversacion" title="Preguntas sugeridas" />
        <ChecklistList
          items={[
            "Que producto esta rotando mejor esta semana?",
            "Que etiqueta falta para cerrar el assortment objetivo?",
            "Que apoyo necesita el staff para vender mejor?",
            "Que activacion tiene sentido para el proximo fin de semana?",
          ]}
        />
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Cierre" title="Checklist de salida" />
        <ChecklistList
          items={[
            "Registrar minuta de visita.",
            "Actualizar estado de misiones.",
            "Subir evidencia de branding o activacion.",
            "Definir proxima accion con fecha.",
          ]}
        />
      </article>
    </div>
  );
}

function CpaDashboard({ locals = [], walkers = [] }) {
  const totalLocals   = locals.length;
  const auditados     = locals.filter((l) => l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)).length;
  const pctAuditados  = totalLocals > 0 ? Math.round((auditados / totalLocals) * 100) : 0;
  const solicitudes   = CPA_REQUESTS.length;
  const enRevision    = CPA_REQUESTS.filter((r) => r.status === "En revision").length;

  // On Five score promedio por pilar (de los locales auditados)
  const pilarScores = ["staff","assortment","menu","branding","activation"].map((key) => {
    const conDato = locals.filter((l) => l.pillars?.[key]?.score && l.pillars[key].score !== "Sin registro");
    const ok      = conDato.filter((l) => l.pillars[key].score === "Completado").length;
    const pct     = conDato.length > 0 ? Math.round((ok / conDato.length) * 100) : 0;
    return { key, label: key.charAt(0).toUpperCase() + key.slice(1), pct };
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          color="blue"
          icon="📊"
          question="¿Dónde está el canal?"
          label="Cobertura auditoría On Five"
          value={`${pctAuditados}%`}
          progress={pctAuditados}
          note={`${auditados} de ${totalLocals} cuentas auditadas`}
        />
        <KpiCard
          color="green"
          icon="📋"
          question="¿Qué gestionar?"
          label="Solicitudes walkers abiertas"
          value={solicitudes}
          note={`${enRevision} en revisión ahora`}
        />
        <KpiCard
          color="amber"
          icon="⚠️"
          question="¿Qué nos frena?"
          label="Cuentas sin ninguna auditoría"
          value={totalLocals - auditados}
          note="requieren primera visita On Five"
        />
        <KpiCard
          color="purple"
          icon="👥"
          question="¿Cómo va el equipo?"
          label="Walkers activos en terreno"
          value={walkers.length}
          note="con cartera de cuentas asignada"
        />
      </section>

      <PillarSummaryGrid locals={locals} />

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="Backoffice" title="Solicitudes recientes" />
          <RequestList requests={CPA_REQUESTS} />
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="On Five" title="Ejecución por pilar" />
          <div className="flex flex-col gap-3">
            {pilarScores.map(({ key, label, pct }) => (
              <ProgressRow key={key} label={label} value={pct} />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function CpaExecutionBoard() {
  const STATUSES = ["Solicitado", "En revision", "Aprobado", "Enviado", "Instalado"];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle
        kicker="CP&A"
        title="Solicitudes de visibilidad"
        description="Vista inicial para coordinar material POP, activos, aprobaciones y seguimiento de instalacion."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <strong className="text-[12px] font-semibold uppercase tracking-wide text-slate-700">{status}</strong>
            {CPA_REQUESTS.filter((request) => request.status === status).map((request) => (
              <article
                key={request.id}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {request.local}
                </span>
                <p className="text-[13px] font-semibold text-slate-900">{request.type}</p>
                <small className="text-[11px] text-slate-500">{request.owner}</small>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function CpaPlaceholder({ icon = "🔧", title, desc, tag = "En desarrollo" }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
      <div className="text-5xl" aria-hidden="true">{icon}</div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="max-w-md text-[13px] leading-relaxed text-slate-500">{desc}</p>
      <small className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
        {tag}
      </small>
    </div>
  );
}

/* ── Solicitudes walkers → CP&A inbox ───────────────────────
   Los walkers crean solicitudes desde terreno.
   CP&A las gestiona acá: revisar, aprobar, rechazar.
────────────────────────────────────────────────────────────── */
function CpaSolicitudesView({ locals = [] }) {
  const STATUSES = ["Solicitado", "En revision", "Aprobado", "Rechazado"];
  const STATUS_TONE = {
    Solicitado: "bg-blue-50 text-blue-700",
    "En revision": "bg-amber-50 text-amber-700",
    Aprobado: "bg-emerald-50 text-emerald-700",
    Rechazado: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATUSES.map((s) => {
          const n = CPA_REQUESTS.filter((r) => r.status === s).length;
          return <MetricCard key={s} compact label={s} value={n} />;
        })}
      </section>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Walker → CP&A" title="Solicitudes recibidas" />
        <div className="flex flex-col gap-2">
          {CPA_REQUESTS.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-slate-900">{req.type}</span>
                <span className="text-[11px] text-slate-500">
                  {req.local} · {req.owner}
                </span>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[req.status] ?? "bg-slate-100 text-slate-600"}`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

/* ── KPIs walkers — data real desde localsData ──────────────
   Lo que auditan los walkers en terreno (On Five) alimenta
   directo este panel. Manager y CP&A ven el mismo dato.
────────────────────────────────────────────────────────────── */
function CpaKpiWalkersView({ locals = [], walkers = [] }) {
  const PILARES = ["staff", "assortment", "menu", "branding", "activation"];

  const walkerStats = walkers.map((w) => {
    const misLocals = locals.filter((l) => l.walkerName === w.name || l.walker === w.id);
    const total     = misLocals.length;
    const auditados = misLocals.filter((l) =>
      l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)
    ).length;
    const cobertura = total > 0 ? Math.round((auditados / total) * 100) : 0;

    const pilarPcts = PILARES.map((key) => {
      const conDato = misLocals.filter((l) => l.pillars?.[key]?.score && l.pillars[key].score !== "Sin registro");
      const ok      = conDato.filter((l) => l.pillars[key].score === "Completado").length;
      return conDato.length > 0 ? Math.round((ok / conDato.length) * 100) : 0;
    });
    const onFiveScore = pilarPcts.length > 0 ? Math.round(pilarPcts.reduce((a, b) => a + b, 0) / pilarPcts.length) : 0;

    return { ...w, total, auditados, cobertura, onFiveScore };
  });

  function barColor(pct) {
    if (pct >= 70) return "bg-emerald-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-rose-500";
  }
  function valueTone(pct) {
    if (pct >= 70) return "text-emerald-600";
    if (pct >= 40) return "text-amber-600";
    return "text-rose-600";
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Walkers activos" value={walkers.length} />
        <MetricCard label="Total cuentas" value={locals.length} />
        <MetricCard
          label="Cuentas auditadas"
          value={locals.filter((l) => l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)).length}
        />
        <MetricCard
          label="On Five promedio"
          value={
            walkerStats.length > 0
              ? `${Math.round(walkerStats.reduce((a, w) => a + w.onFiveScore, 0) / walkerStats.length)}%`
              : "—"
          }
          tone="good"
        />
      </section>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle kicker="Equipo walker" title="Performance individual" />
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[1.5fr_2fr_0.6fr_0.7fr_0.7fr] items-center gap-3 border-b border-slate-200 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Walker</span>
            <span>Cobertura auditoría</span>
            <span className="text-right">Cuentas</span>
            <span className="text-right">Auditadas</span>
            <span className="text-right">On Five</span>
          </div>
          {walkerStats.map((w) => (
            <div
              key={w.id}
              className="grid min-w-[640px] grid-cols-[1.5fr_2fr_0.6fr_0.7fr_0.7fr] items-center gap-3 border-b border-slate-100 px-2 py-2.5 text-[13px]"
            >
              <span className="font-medium text-slate-900">{w.name}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${barColor(w.cobertura)}`} style={{ width: `${w.cobertura}%` }} />
                </div>
                <span className="min-w-[2rem] text-[11px] text-slate-600">{w.cobertura}%</span>
              </div>
              <span className="text-right text-slate-700">{w.total}</span>
              <span className="text-right text-slate-700">{w.auditados}</span>
              <span className={`text-right font-semibold ${valueTone(w.onFiveScore)}`}>
                {w.onFiveScore > 0 ? `${w.onFiveScore}%` : "—"}
              </span>
            </div>
          ))}
          {walkerStats.length === 0 ? (
            <p className="px-2 py-4 text-center text-[13px] text-slate-500">
              Sube el Excel de cuentas en Configuración para ver los KPIs.
            </p>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function ManagerDashboard({ locals = [], walkers = [] }) {
  const totalLocals   = locals.length;
  const auditados     = locals.filter((l) => l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)).length;
  const pctCobertura  = totalLocals > 0 ? Math.round((auditados / totalLocals) * 100) : 0;
  const enRiesgo      = locals.filter((l) => !l.pillars || Object.values(l.pillars).every((p) => !p.lastAudit)).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          color="blue"
          icon="🏪"
          question="¿Dónde está el canal?"
          label="Total cuentas en cartera"
          value={totalLocals}
          note={`${walkers.length} walkers activos`}
        />
        <KpiCard
          color="green"
          icon="✅"
          question="¿Cuánto cobrimos?"
          label="Cobertura auditoría On Five"
          value={`${pctCobertura}%`}
          progress={pctCobertura}
          note={`${auditados} cuentas con visita registrada`}
        />
        <KpiCard
          color="amber"
          icon="🔍"
          question="¿Qué revisar?"
          label="Cuentas sin auditoría"
          value={enRiesgo}
          note="sin ninguna visita On Five aún"
        />
        <KpiCard
          color="purple"
          icon="📈"
          question="¿Mejorando?"
          label="Walkers activos en terreno"
          value={walkers.length}
          trend=" ↑ en cartera"
        />
      </section>

      <PillarSummaryGrid locals={locals} />

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="Equipo" title="Performance por walker" />
          <WalkerTable walkers={walkers} locals={locals} />
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle kicker="Prioridades" title="Cuentas a revisar esta semana" />
          <VisitList visits={CRM_VISITS.slice(0, 4)} onOpenLocal={() => {}} />
        </article>
      </section>
    </div>
  );
}

function ManagerTeamView({ walkers = [], locals = [] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionTitle
        kicker="BARRA · Manager"
        title="Performance del equipo Walker"
        description="Actividad, cobertura y On Five score por zona."
      />
      <WalkerTable walkers={walkers} locals={locals} expanded />
    </section>
  );
}

const PILLAR_SUMMARY_META = [
  { key: "staff",      label: "Staff",      icon: "👥", accent: "bg-indigo-500",  tint: "bg-indigo-50 text-indigo-700",   ring: "ring-indigo-100"  },
  { key: "assortment", label: "Assortment", icon: "🍾", accent: "bg-emerald-500", tint: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-100" },
  { key: "menu",       label: "Menú",       icon: "📋", accent: "bg-violet-500",  tint: "bg-violet-50 text-violet-700",   ring: "ring-violet-100"  },
  { key: "branding",   label: "Branding",   icon: "✨", accent: "bg-amber-500",   tint: "bg-amber-50 text-amber-700",     ring: "ring-amber-100"   },
  { key: "activation", label: "Activación", icon: "🎯", accent: "bg-rose-500",    tint: "bg-rose-50 text-rose-700",       ring: "ring-rose-100"    },
];

function PillarSummaryGrid({ locals = [] }) {
  const total = locals.length;
  const stats = PILLAR_SUMMARY_META.map((meta) => {
    const completados = locals.filter((l) => l.pillars?.[meta.key]?.score === "Completado").length;
    const pendientes  = locals.filter((l) => l.pillars?.[meta.key]?.score === "Pendiente").length;
    const sinRegistro = total - completados - pendientes;
    const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
    const toneText = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-rose-600";
    return { ...meta, completados, pendientes, sinRegistro, pct, toneText };
  });

  return (
    <section aria-label="Resumen On Five por pilar" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <article
          key={s.key}
          className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ${s.ring} transition hover:shadow-md`}
        >
          <header className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.tint}`}>
              <span aria-hidden="true">{s.icon}</span>
              {s.label}
            </span>
            <strong className={`text-[20px] font-bold leading-none ${s.toneText}`}>{s.pct}%</strong>
          </header>

          <div className="flex flex-col gap-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${s.accent} transition-all`} style={{ width: `${s.pct}%` }} />
            </div>
            <small className="text-[11px] text-slate-500">
              {s.completados} de {total} {total === 1 ? "cuenta" : "cuentas"}
            </small>
          </div>

          <footer className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              ✓ {s.completados}
            </span>
            {s.pendientes > 0 && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                ! {s.pendientes}
              </span>
            )}
            {s.sinRegistro > 0 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                — {s.sinRegistro}
              </span>
            )}
          </footer>
        </article>
      ))}
    </section>
  );
}

function MetricCard({ compact = false, label, note, tone = "neutral", value }) {
  const toneStyles = {
    neutral: "border-slate-200 bg-white text-slate-900",
    positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
    good: "border-emerald-200 bg-emerald-50 text-emerald-900",
    negative: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "border-slate-900 bg-slate-900 text-white",
  };
  const labelTone = tone === "accent" ? "text-slate-300" : "text-slate-500";
  const noteTone = tone === "accent" ? "text-slate-400" : "text-slate-500";
  return (
    <article
      className={`flex flex-col gap-1 rounded-xl border p-4 shadow-sm transition hover:shadow ${
        compact ? "p-3 gap-0.5" : ""
      } ${toneStyles[tone] ?? toneStyles.neutral}`}
    >
      <span className={`text-[11px] font-medium uppercase tracking-wide ${labelTone}`}>{label}</span>
      <strong className={`${compact ? "text-base" : "text-lg"} font-semibold tracking-tight`}>{value}</strong>
      {note ? <small className={`text-[11px] ${noteTone}`}>{note}</small> : null}
    </article>
  );
}

const KPI_COLORS = {
  blue: { accent: "text-blue-700", bar: "bg-blue-500", icon: "bg-blue-50 text-blue-600" },
  green: { accent: "text-emerald-700", bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600" },
  amber: { accent: "text-amber-700", bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
  purple: { accent: "text-violet-700", bar: "bg-violet-500", icon: "bg-violet-50 text-violet-600" },
  red: { accent: "text-rose-700", bar: "bg-rose-500", icon: "bg-rose-50 text-rose-600" },
};

function KpiCard({ color = "blue", icon, question, label, value, note, progress, trend }) {
  const palette = KPI_COLORS[color] ?? KPI_COLORS.blue;
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow">
      <div className="flex items-center gap-2">
        {icon ? (
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${palette.icon}`}
          >
            {icon}
          </span>
        ) : null}
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${palette.accent}`}>{question}</span>
      </div>
      <div className="text-[12px] font-medium text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${palette.accent}`}>{value}</div>
      {progress != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${palette.bar}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      ) : null}
      {note || trend ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>{note}</span>
          {trend ? <span className={`font-medium ${palette.accent}`}>{trend}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

function SectionTitle({ description, kicker, title }) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      {kicker ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{kicker}</span>
      ) : null}
      <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
      {description ? <p className="text-[12px] text-slate-500">{description}</p> : null}
    </div>
  );
}

const TIMELINE_TONE = {
  positive: "before:bg-emerald-500",
  warning: "before:bg-amber-500",
  danger: "before:bg-rose-500",
  neutral: "before:bg-slate-400",
};

function ActivityTimeline({ activities }) {
  return (
    <div className="flex flex-col gap-3">
      {activities.map((activity) => (
        <article
          key={activity.id}
          className={`relative pl-5 before:absolute before:left-0 before:top-1.5 before:h-2 before:w-2 before:rounded-full ${
            TIMELINE_TONE[activity.tone] ?? TIMELINE_TONE.neutral
          }`}
        >
          <strong className="block text-[13px] font-semibold text-slate-900">
            {activity.title} · {activity.local}
          </strong>
          <p className="text-[12px] leading-relaxed text-slate-600">{activity.detail}</p>
          <small className="text-[11px] text-slate-500">{activity.meta}</small>
        </article>
      ))}
    </div>
  );
}

const STATUS_TONE = {
  positive: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
};

function VisitList({ visits, onOpenLocal }) {
  return (
    <div className="flex flex-col gap-2">
      {visits.map((visit) => (
        <button
          key={visit.id}
          type="button"
          onClick={() => onOpenLocal(visit.localId)}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
        >
          <span className="flex flex-1 flex-col">
            <strong className="text-[13px] font-semibold text-slate-900">{visit.local}</strong>
            <small className="text-[11px] text-slate-500">
              {visit.description} · {visit.objective}
            </small>
          </span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[visit.tone] ?? STATUS_TONE.neutral}`}>
            {visit.status}
          </span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <i className="block h-full bg-slate-900" style={{ width: `${visit.progress}%` }} />
          </span>
        </button>
      ))}
    </div>
  );
}

const PRIORITY_TONE = {
  Alta: "text-rose-600",
  Media: "text-amber-600",
  Baja: "text-slate-500",
};

function KanbanBoard({ columns, draggedCardId, onCardDragStart, onCardDrop, onOpenLocal }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {columns.map((column) => (
        <section
          key={column.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onCardDrop(column.id)}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <header className="flex items-center justify-between px-1">
            <strong className="text-[12px] font-semibold uppercase tracking-wide text-slate-700">
              {column.title}
            </strong>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {column.cards.length}
            </span>
          </header>
          <div className="flex flex-col gap-2">
            {column.cards.map((card) => (
              <article
                key={card.id}
                draggable
                onDragStart={() => onCardDragStart(card.id)}
                className={`flex flex-col gap-1 rounded-lg border bg-white p-3 shadow-sm transition hover:shadow ${
                  draggedCardId === card.id ? "border-slate-900 opacity-60" : "border-slate-200"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {card.origin}
                </span>
                <strong className="text-[13px] font-semibold text-slate-900">{card.local}</strong>
                <p className="text-[12px] leading-relaxed text-slate-600">{card.title}</p>
                <footer className="mt-1 flex items-center justify-between">
                  <b className={`text-[11px] font-bold ${PRIORITY_TONE[card.priority] ?? "text-slate-500"}`}>
                    {card.priority}
                  </b>
                  {onOpenLocal && card.localId ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLocal(card.localId);
                      }}
                      className="text-[11px] font-semibold text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
                    >
                      Ver cuenta →
                    </button>
                  ) : (
                    <em className="text-[11px] not-italic text-slate-500">{card.due}</em>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{children}</span>
  );
}

const TEXT_INPUT_CLASS =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";

function KeyContacts({ contacts, developers = [], developerCode = "", onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", cargo: "", telefono: "" });

  function handleSave() {
    const name = `${form.nombre.trim()} ${form.apellido.trim()}`.trim();
    if (!name) return;
    const phone = `56${form.telefono.replace(/\D/g, "").replace(/^0/, "")}`;
    onAdd?.({
      id: `contact-${Date.now()}`,
      name,
      role: form.cargo.trim() || "Contacto",
      note: "",
      phone,
    });
    setForm({ nombre: "", apellido: "", cargo: "", telefono: "" });
    setOpen(false);
  }

  const devInfo = developerCode
    ? developers.find((d) => d.code === developerCode || d.code === developerCode.toUpperCase())
    : null;

  return (
    <div className="flex flex-col gap-2">
      {devInfo && (
        <article className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
            {devInfo.code}
          </span>
          <div className="flex flex-1 flex-col">
            <strong className="text-[13px] font-semibold text-slate-900">
              {devInfo.first_name} {devInfo.last_name}
            </strong>
            <small className="text-[11px] text-slate-500">
              Desarrollador Sell Out
              {devInfo.email ? ` · ${devInfo.email}` : ""}
            </small>
          </div>
          {devInfo.phone ? (
            <a
              href={`https://wa.me/${devInfo.phone}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              WhatsApp
            </a>
          ) : null}
        </article>
      )}
      {contacts.filter((c) => c.role !== "Desarrollador Sell Out" || !devInfo).map((contact) => (
        <article
          key={contact.id}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
            {initials(contact.name)}
          </span>
          <div className="flex flex-1 flex-col">
            <strong className="text-[13px] font-semibold text-slate-900">{contact.name}</strong>
            <small className="text-[11px] text-slate-500">
              {contact.role}
              {contact.note ? ` · ${contact.note}` : ""}
            </small>
          </div>
          {contact.phone ? (
            <a
              href={`https://wa.me/${contact.phone}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              WhatsApp
            </a>
          ) : null}
        </article>
      ))}

      {open ? (
        <div className="flex flex-col gap-2.5 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <FieldLabel>Nombre</FieldLabel>
              <input
                className={TEXT_INPUT_CLASS}
                placeholder="Juan"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Apellido</FieldLabel>
              <input
                className={TEXT_INPUT_CLASS}
                placeholder="Pérez"
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <FieldLabel>Cargo</FieldLabel>
            <input
              className={TEXT_INPUT_CLASS}
              placeholder="Bartender, Encargado, Dueño..."
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Teléfono</FieldLabel>
            <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
              <span className="border-r border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] text-slate-600">
                +56
              </span>
              <input
                className="w-full border-none px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                placeholder="9 1234 5678"
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3.5 py-1.5 text-[12px] font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
        >
          + Agregar contacto
        </button>
      )}
    </div>
  );
}

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
// Estacionalidad on-trade Chile: verano (Dic-Feb) y fin de año son picos
const SEASON_BASE = [72, 68, 74, 65, 62, 70, 75, 67, 71, 78, 82, 88];

function buildPlaceholderSeries(seed) {
  const variance = (i) => ((seed * (i + 3)) % 17) - 8;
  const currentMonth = new Date().getMonth(); // 0-indexed
  return MONTHS_ES.map((month, i) => ({
    month,
    previous: SEASON_BASE[i] + variance(i + 1),
    current: i <= currentMonth ? SEASON_BASE[i] + variance(i) + 6 : null,
  }));
}

function MiniLineChart({ series, seed = 7 }) {
  const data = series && series.length > 0 ? series : buildPlaceholderSeries(seed);
  const withCurrent = data.filter((d) => d.current != null);
  const pointsCurrent = buildChartPoints(withCurrent, "current");
  const pointsPrevious = buildChartPoints(data, "previous");
  const isPlaceholder = !series || series.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox="0 0 360 150"
        role="img"
        aria-label="Ventas mensuales vs AA"
        className="h-32 w-full text-slate-400"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          points={pointsPrevious}
        />
        <polyline
          fill="none"
          stroke="rgb(15 23 42)"
          strokeWidth="2"
          points={pointsCurrent}
        />
        {data.map((item, index) => {
          const x = 24 + (index * 312) / Math.max(data.length - 1, 1);
          return (
            <text
              key={item.month}
              x={x}
              y="145"
              textAnchor="middle"
              fontSize="9"
              fill="rgb(100 116 139)"
            >
              {item.month}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-slate-900" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 border-t border-dashed border-slate-400" /> AA
        </span>
        {isPlaceholder ? (
          <small className="text-[11px] text-slate-400">Datos ilustrativos — conectar con Lighthouse</small>
        ) : null}
      </div>
    </div>
  );
}

function MissionGrid({ missions }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {missions.map((mission) => (
        <article
          key={mission.id}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {mission.origin}
            </span>
            <strong className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {mission.status}
            </strong>
          </div>
          <h3 className="text-[14px] font-semibold leading-tight text-slate-900">{mission.title}</h3>
          <p className="text-[12px] leading-relaxed text-slate-600">{mission.reason}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <i className="block h-full rounded-full bg-slate-900" style={{ width: `${mission.progress}%` }} />
          </div>
          <small className="text-[11px] text-slate-500">
            {mission.impact} · Próximo paso: {mission.nextStep}
          </small>
        </article>
      ))}
    </div>
  );
}

const SIDE_PHOTO_SLOTS = [
  { key: "s1", label: "Foto 1", desc: "Staff, carta, POP o promo" },
  { key: "s2", label: "Foto 2", desc: "Antes / despues" },
  { key: "s3", label: "Foto 3", desc: "Resultado o ganador" },
];

function SidePhotoPanel({ localId, moduleKey, activeUserName, onPublishNote }) {
  const [slots, setSlots] = useState({ s1: null, s2: null, s3: null });

  async function handleSlot(slotKey, file) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setSlots((p) => ({ ...p, [slotKey]: { preview, uploading: true } }));
    try {
      const url = await uploadPhoto(localId, moduleKey, file);
      URL.revokeObjectURL(preview);
      setSlots((p) => ({ ...p, [slotKey]: { url, uploading: false } }));
      const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
      onPublishNote?.({
        id: `foto-${localId}-${slotKey}-${Date.now()}`,
        author: activeUserName ?? "Walker",
        date: ts,
        type: "Evidencia",
        text: `Foto de evidencia — ${SIDE_PHOTO_SLOTS.find((s) => s.key === slotKey)?.desc ?? slotKey}`,
        nextAction: "",
        photos: [url],
      });
    } catch {
      URL.revokeObjectURL(preview);
      setSlots((p) => ({ ...p, [slotKey]: { error: true } }));
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <SectionTitle kicker="Evidencia" title="Fotos y soportes" />
      <div className="grid grid-cols-3 gap-2">
        {SIDE_PHOTO_SLOTS.map(({ key, label, desc }) => {
          const slot = slots[key];
          return (
            <label key={key} className="relative flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center transition hover:border-slate-400 hover:bg-slate-100">
              {slot?.url || slot?.preview ? (
                <>
                  <img src={slot.url ?? slot.preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
                  {slot.uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-semibold text-white">Subiendo…</span>
                  )}
                  {slot.error && (
                    <span className="absolute inset-0 flex items-center justify-center bg-rose-500/80 text-[11px] font-semibold text-white">Error</span>
                  )}
                </>
              ) : (
                <>
                  <strong className="text-[12px] font-semibold text-slate-700">📷 {label}</strong>
                  <small className="text-[10px] text-slate-500">{desc}</small>
                </>
              )}
              <input accept="image/*" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleSlot(key, e.target.files[0])} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function OnFiveModuleDetail({ activeUserName, developers = [], executionNotes = [], local, module, onPublishNote, pillar, onUpdatePillar, assortmentConfig, assortmentAudit, onSaveAssortmentAudit }) {
  const [moduleLogs, setModuleLogs] = useState([]);
  const [activeIncentives, setActiveIncentives] = useState(["Tanqueray Perfect Serve Challenge", "Smirnoff Red Staff Challenge"]);

  // Merge persisted notes for this module with local session logs (newest first)
  const persistedForModule = executionNotes.filter((n) =>
    n.type === "Registro" || n.type === module.label
  );
  const allLogs = [
    ...moduleLogs,
    ...persistedForModule.filter((pn) => !moduleLogs.some((ml) => ml.id === pn.id)),
  ];

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          On Five / {module.label}
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{module.title}</h2>
        <p className="text-[13px] leading-relaxed text-slate-600">{module.description}</p>
      </div>

      {module.key === "assortment" ? (
        <>
          <AssortmentPortfolioPanel local={local} pillar={pillar} assortmentConfig={assortmentConfig} assortmentAudit={assortmentAudit} onSaveAudit={onSaveAssortmentAudit} activeUserName={activeUserName} />
          <AssortmentPostWall activeUserName={activeUserName} pillar={pillar} onUpdatePillar={onUpdatePillar} local={local} />
        </>
      ) : module.key === "menu" ? (
        <MenuPdfScanner activeUserName={activeUserName} local={local} onUpdatePillar={onUpdatePillar} />
      ) : module.key === "branding" ? (
        <BrandingAuditPanel activeUserName={activeUserName} local={local} pillar={pillar} onUpdatePillar={onUpdatePillar} />
      ) : module.key === "activation" ? (
        <ActivationPanel activeUserName={activeUserName} local={local} pillar={pillar} onUpdatePillar={onUpdatePillar} />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <div>
              <OnFiveRegisterPanel
                localId={local.id}
                module={module}
                activeIncentives={activeIncentives}
                onSave={(record) => {
                  const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
                  const noteId = `reg-${local.id}-${Date.now()}`;
                  const enriched = { ...record, id: noteId };
                  setModuleLogs((current) => [enriched, ...current]);
                  // Persistir en Supabase notes table
                  onPublishNote?.({
                    id: noteId,
                    author: activeUserName ?? "Walker",
                    date: ts,
                    type: module.label,
                    text: record.text ?? "",
                    nextAction: "",
                    photos: record.photos ?? [],
                  });
                  if (module.key === "staff" && onUpdatePillar) {
                    onUpdatePillar("staff", {
                      score: "Completado",
                      summary: `Visita registrada ${ts}`,
                      nextAction: "Programar proxima visita",
                    });
                    if (record?.registerType === "newIncentive" && record?.incentiveName) {
                      setActiveIncentives((prev) => [...prev, record.incentiveName]);
                    }
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-3">
              {module.key === "staff" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle kicker="Contactos clave" title="Equipo de la cuenta" />
                  <KeyContacts contacts={local.contacts} developerCode={local.developer} developers={developers} />
                </div>
              ) : null}
              <SidePhotoPanel localId={local.id} moduleKey={module.key} activeUserName={activeUserName} onPublishNote={onPublishNote} />
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionTitle kicker="Bitácora" title="Registros recientes" />
            {allLogs.length === 0 ? (
              <p className="py-2 text-[13px] text-slate-500">
                Sin registros aún. Completa el formulario y guarda para ver los registros aquí.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {allLogs.map((record, i) => {
                  const ts = record.date ?? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
                  const text = typeof record === "string" ? record : record.text ?? "";
                  const photos = Array.isArray(record.photos) ? record.photos.filter(Boolean) : [];
                  return (
                    <article key={record.id ?? i} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {initials(record.author ?? activeUserName ?? "W")}
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <header className="flex items-center justify-between gap-2">
                          <strong className="text-[13px] font-semibold text-slate-900">{record.author ?? activeUserName ?? "Walker"}</strong>
                          <span className="text-[11px] text-slate-500">{ts}</span>
                        </header>
                        {text && <p className="text-[12px] leading-relaxed text-slate-700">{text}</p>}
                        {photos.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {photos.map((url, pi) => (
                              <a key={pi} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`Foto ${pi + 1}`} className="h-16 w-16 rounded-lg border border-slate-200 object-cover shadow-sm hover:opacity-90" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function OnFiveAccountCard({ local }) {
  const contacts = local.contacts?.slice(0, 3) ?? [];

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cuenta</span>
      <strong className="text-[14px] font-semibold text-slate-900">{local.name}</strong>
      <small className="text-[11px] text-slate-500">
        {local.segment} · {local.district}
      </small>
      <div className="mt-2 flex flex-col gap-2" aria-label="Contactos clave">
        {contacts.map((contact) => (
          <a
            key={contact.id}
            aria-label={`Abrir WhatsApp de ${contact.name}`}
            href={`https://wa.me/${contact.phone}`}
            rel="noreferrer"
            target="_blank"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
              {initials(contact.name)}
            </span>
            <div className="flex flex-1 flex-col">
              <strong className="text-[12px] font-semibold text-slate-900">{contact.name}</strong>
              <small className="text-[10px] text-slate-500">{contact.role}</small>
            </div>
            <b className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">WPP</b>
          </a>
        ))}
      </div>
    </article>
  );
}

function AssortmentPortfolioPanel({ local, pillar, assortmentConfig, assortmentAudit, onSaveAudit, activeUserName }) {
  const outlet     = normalizeOutlet(local.subchannel, local.occasion);
  const segment    = normalizeSegment(local.segment);
  const configKey  = assortmentKey(outlet, segment);
  const cfg        = assortmentConfig ?? DEFAULT_ASSORTMENT_CONFIG;
  const requiredIds = cfg[configKey] ?? [];
  const requiredLabels = OT_LABELS.filter((l) => requiredIds.includes(l.id));

  // Estado de checkboxes en terreno
  const [checkedIds, setCheckedIds] = useState(() => assortmentAudit?.checkedIds ?? []);
  const [justSaved, setJustSaved] = useState(false);

  const present = checkedIds.filter((id) => requiredIds.includes(id)).length;
  const total = requiredLabels.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const pctTone = pct >= 100 ? "good" : pct >= 70 ? "warning" : "danger";
  const missingLabels = requiredLabels.filter((l) => !checkedIds.includes(l.id));

  // Innovaciones — informativas, no suman ni restan
  const [checkedInnovIds, setCheckedInnovIds] = useState([]);

  function toggleItem(id) {
    setCheckedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleInnov(id) {
    setCheckedInnovIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function saveTerreno() {
    onSaveAudit?.(checkedIds, requiredIds);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const byCategory = requiredLabels.reduce((acc, l) => {
    (acc[l.category] = acc[l.category] ?? []).push(l);
    return acc;
  }, {});

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          kicker="Assortment — medición en terreno"
          title="Portafolio objetivo"
          description={`${outlet} · ${segment}. Marca las etiquetas presentes en la cuenta.`}
        />
        <strong className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold ${PILLAR_TONE_STYLES[pctTone] ?? PILLAR_TONE_STYLES.neutral}`}>
          {total > 0 ? `${present}/${total} · ${pct}%` : "Sin portafolio"}
        </strong>
      </div>

      {total > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mt-3">
          <article className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Objetivo</span>
            <strong className="text-[15px] font-semibold text-slate-900">{total} etiquetas</strong>
            <small className="text-[11px] text-slate-500">{outlet} · {segment}</small>
          </article>
          <article className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Presentes</span>
            <strong className={`text-[15px] font-semibold ${pct === 100 ? "text-emerald-600" : "text-amber-600"}`}>
              {present}
            </strong>
            <small className="text-[11px] text-slate-500">marcadas hoy</small>
          </article>
          <article className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Faltantes</span>
            <strong className={`text-[15px] font-semibold ${missingLabels.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {missingLabels.length}
            </strong>
            <small className="text-[11px] text-slate-500">
              {assortmentAudit ? `Últ: ${assortmentAudit.savedAt}` : "Sin auditoría previa"}
            </small>
          </article>
        </div>
      ) : null}

      {total === 0 ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center text-[13px] text-slate-500">
          No hay portafolio configurado para el segmento <strong className="text-slate-900">{local.segment}</strong>.
          <br />
          El CP&A puede configurarlo en Configuración → Assortment.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-4">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{cat}</p>
                <div className="flex flex-col gap-1.5">
                  {items.map((item) => {
                    const checked = checkedIds.includes(item.id);
                    const wrapperTone = checked
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-rose-500 bg-rose-50";
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3 py-2 transition ${wrapperTone}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.id)}
                          className={`h-4 w-4 shrink-0 ${checked ? "accent-emerald-600" : "accent-rose-600"}`}
                        />
                        <span
                          className={`flex-1 text-[13px] ${checked ? "font-bold text-emerald-800" : "font-medium text-rose-900"}`}
                        >
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-500">{item.category}</span>
                        {checked ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ Tiene
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            ✗ No tiene
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-dashed border-slate-300 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Innovaciones <span className="font-normal normal-case tracking-normal">— informativas, no suman al portafolio</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {OT_INNOVATIONS.map((item) => {
                const checked = checkedInnovIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 opacity-90"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInnov(item.id)}
                      className="h-4 w-4 shrink-0 accent-slate-900"
                    />
                    <span className="flex-1 text-[13px] text-slate-700">{item.name}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Innovación
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <small className="text-[12px] text-slate-500">
              {assortmentAudit ? `Última auditoría: ${assortmentAudit.savedAt} · ${assortmentAudit.author}` : "Sin auditoría previa"}
            </small>
            <button
              type="button"
              onClick={saveTerreno}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700"
            >
              {justSaved ? "✓ Guardado" : "Guardar auditoría terreno"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function AssortmentPostWall({ activeUserName, pillar, onUpdatePillar, local }) {
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState(() =>
    (pillar?.details ?? []).slice(0, 2).map((detail, index) => ({
      id: `assortment-system-${index}`,
      author: "Sistema LH",
      date: "Ultima lectura",
      text: detail,
    })),
  );
  const canPublish = postText.trim().length > 0;

  function publishPost() {
    if (!canPublish) return;
    setPosts((currentPosts) => [
      {
        id: `assortment-post-${Date.now()}`,
        author: activeUserName ?? "Walker",
        date: formatPostDate(new Date()),
        text: postText.trim(),
      },
      ...currentPosts,
    ]);
    // El assortment se actualiza al guardar la auditoría en AssortmentPortfolioPanel
    setPostText("");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <SectionTitle
        kicker="Muro Assortment"
        title="Comentarios de la cuenta"
        description="Notas comerciales, acuerdos y pendientes del portafolio."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
            {initials(activeUserName ?? "Walker")}
          </span>
          <span className="text-[13px] font-medium text-slate-700">{activeUserName ?? "Walker"}</span>
        </div>
        <label className="flex flex-col gap-1">
          <FieldLabel>Comentario</FieldLabel>
          <textarea
            placeholder="Contexto que deberia ver el proximo usuario..."
            value={postText}
            onChange={(event) => setPostText(event.target.value)}
            className="min-h-[72px] resize-y rounded-lg border border-slate-200 bg-white p-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </label>
        <button
          disabled={!canPublish}
          type="button"
          onClick={publishPost}
          className="self-end rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publicar
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
              {initials(post.author)}
            </div>
            <div className="flex flex-1 flex-col">
              <header className="flex items-center justify-between gap-2">
                <strong className="text-[13px] font-semibold text-slate-900">{post.author}</strong>
                <span className="text-[11px] text-slate-500">{post.date}</span>
              </header>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{post.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MenuPdfScanner({ activeUserName, local, onUpdatePillar }) {
  const [menuEvaluations, setMenuEvaluations] = useState({});
  const [evalLogs, setEvalLogs] = useState({});
  const [justSaved, setJustSaved] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const evaluation = menuEvaluations[local.id] ?? buildDefaultMenuEvaluation(local);
  const kpis = getManualMenuKpis(evaluation);
  const gaps = getManualMenuGaps(evaluation, kpis);
  const nextGap = gaps.find((g) => g.tone === "danger") ?? gaps.find((g) => g.tone === "warning") ?? gaps[0];
  const localLogs = evalLogs[local.id] ?? [];

  function updateEvaluation(field, value) {
    setMenuEvaluations((current) => ({
      ...current,
      [local.id]: {
        ...(current[local.id] ?? buildDefaultMenuEvaluation(local)),
        [field]: value,
      },
    }));
  }

  function saveEvaluation() {
    const now = new Date();
    const timestamp = new Intl.DateTimeFormat("es-CL", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(now);
    const snap = menuEvaluations[local.id] ?? buildDefaultMenuEvaluation(local);
    const snapKpis = getManualMenuKpis(snap);
    setMenuEvaluations((current) => ({
      ...current,
      [local.id]: { ...snap, lastSaved: timestamp },
    }));
    const snapGaps = getManualMenuGaps(snap, snapKpis);
    setEvalLogs((current) => ({
      ...current,
      [local.id]: [
        {
          id: `eval-${Date.now()}`,
          date: timestamp,
          author: activeUserName ?? "Walker",
          caStatus: snapKpis.authorStatus,
          caTone: snapKpis.authorTone,
          dsStatus: snapKpis.drinkStatus,
          dsTone: snapKpis.drinkTone,
          overallTone: snapKpis.overallTone,
          gapsCount: snapGaps.length,
          kpis: snapKpis,
          gaps: snapGaps,
          snap,
        },
        ...(current[local.id] ?? []),
      ].slice(0, 12),
    }));
    // ── Actualizar pilar real de la cuenta ──
    if (onUpdatePillar) {
      const dsTotal = [snap.hasTropicalGin, snap.hasWhiscolaNaming, snap.hasTanquerayGt, snap.hasWhiskySourBlack].filter(Boolean).length;
      // "Completado" si pasa los dos KPIs, "Pendiente" si tiene al menos un gap
      const menuScore = snapKpis.overallOk ? "Completado" : "Pendiente";
      onUpdatePillar("menu", {
        score: menuScore,
        summary: `Coctelería de Autor: ${snapKpis.authorStatus} · Drink Strategy: ${dsTotal}/4`,
        nextAction: snapGaps[0]?.title ?? "Mantener ejecucion",
        lastEval: timestamp,
      });
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  return (
    <section className="flex flex-col gap-4">

      {/* Status strip */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
            {initials(local.name)}
          </span>
          <div className="flex flex-col">
            <strong className="text-[13px] font-semibold text-slate-900">{local.name}</strong>
            <small className="text-[11px] text-slate-500">{local.segment} · {local.district}</small>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${PILLAR_TONE_STYLES[kpis.authorTone === "good" ? "positive" : kpis.authorTone === "danger" ? "danger" : "neutral"] ?? PILLAR_TONE_STYLES.neutral}`}>Coctelería de Autor: {kpis.authorStatus}</span>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${PILLAR_TONE_STYLES[kpis.drinkTone === "good" ? "positive" : kpis.drinkTone === "danger" ? "danger" : "neutral"] ?? PILLAR_TONE_STYLES.neutral}`}>Drink Strategy: {kpis.drinkStatus}</span>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${PILLAR_TONE_STYLES[kpis.overallTone === "good" ? "positive" : kpis.overallTone === "warning" ? "warning" : "neutral"] ?? PILLAR_TONE_STYLES.neutral}`}>{kpis.overallStatus}</span>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Situacion comercial</span>
          <select value={evaluation.commercialStatus} onChange={(event) => updateEvaluation("commercialStatus", event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none">
            <option value="diageo">AACC Diageo</option>
            <option value="none">Sin AACC</option>
            <option value="competitor">AACC competencia</option>
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Proxima accion</span>
          {nextGap ? (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${nextGap.tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`} style={{ maxWidth: 260, whiteSpace: "normal", lineHeight: 1.3 }}>
              {nextGap.title}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">Menu alineado ✓</span>
          )}
        </div>
      </div>

      {/* KPI panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* KPI 1 */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">KPI 1</span>
            <h3 className="text-[14px] font-semibold text-slate-900">Cocteleria de Autor</h3>
            <p className="text-[12px] leading-relaxed text-slate-600">
              {evaluation.commercialStatus === "diageo"
                ? "AACC Diageo: al menos 60% de los CA debe usar nuestras marcas."
                : "Sin AACC: debe existir un CA con whisky y un CA con gin."}
            </p>
          </div>

          {evaluation.commercialStatus === "diageo" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total CA en carta</span>
                <input min="0" type="number" value={evaluation.authorCocktailsTotal}
                  onChange={(event) => updateEvaluation("authorCocktailsTotal", Number(event.target.value) || 0)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">CA con marcas Diageo</span>
                <input min="0" type="number" value={evaluation.authorCocktailsDiageo}
                  onChange={(event) => updateEvaluation("authorCocktailsDiageo", Number(event.target.value) || 0)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none" />
              </label>
              <div className="col-span-2 flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mix Diageo</span>
                <strong className="text-[18px] font-semibold text-slate-900">{kpis.authorShare}%</strong>
                <small className="text-[11px] text-slate-500">Meta minima: 60%</small>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <input checked={evaluation.hasWhiskyAuthorCocktail} type="checkbox"
                  onChange={(event) => updateEvaluation("hasWhiskyAuthorCocktail", event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900" />
                <span className="flex flex-col gap-0.5">
                  <strong className="text-[13px] font-semibold text-slate-900">CA con whisky</strong>
                  <small className="text-[11px] text-slate-500">Coctel de autor con whisky en carta</small>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <input checked={evaluation.hasGinAuthorCocktail} type="checkbox"
                  onChange={(event) => updateEvaluation("hasGinAuthorCocktail", event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900" />
                <span className="flex flex-col gap-0.5">
                  <strong className="text-[13px] font-semibold text-slate-900">CA con gin</strong>
                  <small className="text-[11px] text-slate-500">Coctel de autor con gin en carta</small>
                </span>
              </label>
            </div>
          )}

          <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-slate-200 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Foto de respaldo KPI 1</span>
            <input accept="image/*" type="file" className="text-[12px] text-slate-600" />
          </label>
        </div>

        {/* KPI 2 */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">KPI 2</span>
            <h3 className="text-[14px] font-semibold text-slate-900">Drink Strategy</h3>
            <p className="text-[12px] leading-relaxed text-slate-600">
              {evaluation.commercialStatus === "competitor"
                ? "AACC competencia: Drink Strategy es foco recomendado, no mandatorio."
                : "Serves mandatorios en carta. Whiscola debe usar naming correcto."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: "hasTropicalGin", label: "Tropical Gin", sub: "Con Tanqueray o Gordon’s" },
              { key: "hasWhiscolaNaming", label: "Whiscola Johnnie Walker Red", sub: "Naming exacto requerido en menu" },
              { key: "hasTanquerayGt", label: "Tanqueray Gin & Tonic", sub: "Serve visible en carta" },
              { key: "hasWhiskySourBlack", label: "Whisky Sour Johnnie Walker Black", sub: "Whisky Sour con JW Black" },
            ].map(({ key, label, sub }) => (
              <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <input checked={evaluation[key]} type="checkbox"
                  onChange={(event) => updateEvaluation(key, event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900" />
                <span className="flex flex-col gap-0.5">
                  <strong className="text-[13px] font-semibold text-slate-900">{label}</strong>
                  <small className="text-[11px] text-slate-500">{sub}</small>
                </span>
              </label>
            ))}
          </div>

          <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-slate-200 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Foto de respaldo KPI 2</span>
            <input accept="image/*" type="file" className="text-[12px] text-slate-600" />
          </label>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        {evaluation.lastSaved ? (
          <small className="text-[11px] text-slate-500">Ultimo guardado: {evaluation.lastSaved}</small>
        ) : (
          <small className="text-[11px] text-slate-500">Sin evaluaciones guardadas aun</small>
        )}
        <button className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700" type="button" onClick={saveEvaluation}>
          {justSaved ? "✓ Guardado" : "Guardar evaluacion"}
        </button>
      </div>

      {/* Gaps */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle kicker="Lectura comercial" title="Gaps y proxima accion" />
        <div className="mt-4 flex flex-col gap-3">
          {gaps.map((gap) => (
            <article key={gap.title} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${gap.tone === "good" ? "bg-emerald-50 text-emerald-700" : gap.tone === "danger" ? "bg-rose-50 text-rose-700" : gap.tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{gap.type}</span>
              <strong className="text-[13px] font-semibold text-slate-900">{gap.title}</strong>
              <p className="text-[12px] leading-relaxed text-slate-600">{gap.copy}</p>
            </article>
          ))}
          {gaps.length === 0 ? (
            <article className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">OK</span>
              <strong className="text-[13px] font-semibold text-slate-900">Menu alineado a los criterios mandatorios</strong>
              <p className="text-[12px] leading-relaxed text-slate-600">Defender ejecucion, precio, visibilidad y entrenamiento de staff para sostener rotacion.</p>
            </article>
          ) : null}
        </div>
      </div>

      {/* Historial de evaluaciones */}
      {localLogs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionTitle kicker="Historial" title="Evaluaciones guardadas" />
          <div className="mt-4 flex flex-col gap-3">
            {localLogs.map((log) => {
              const isOpen = expandedLogId === log.id;
              const MENU_FIELDS_DETAIL = [
                { key: "hasTropicalGin",          label: "Tropical Gin" },
                { key: "hasWhiskyAuthorCocktail", label: "Coctelería de Autor c/ Whisky" },
                { key: "hasGinAuthorCocktail",    label: "Coctelería de Autor c/ Gin" },
                { key: "hasWhiscolaNaming",       label: "JW + Coca Cola" },
                { key: "hasTanquerayGt",          label: "Gin & Tonic" },
                { key: "hasWhiskySourBlack",      label: "Whisky Sour" },
              ];
              return (
                <article key={log.id} className="overflow-hidden rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                    className="flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50 focus:outline-none"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">{initials(log.author)}</div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <header className="flex items-center gap-2">
                        <strong className="text-[13px] font-semibold text-slate-900">{log.author}</strong>
                        <span className="text-[11px] text-slate-500">{log.date}</span>
                        <span className="ml-auto text-[11px] text-slate-400">{isOpen ? "▲" : "▼"}</span>
                      </header>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${log.caTone === "good" ? "bg-emerald-50 text-emerald-700" : log.caTone === "danger" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>C. de Autor: {log.caStatus}</span>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${log.dsTone === "good" ? "bg-emerald-50 text-emerald-700" : log.dsTone === "danger" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>Drink Strategy: {log.dsStatus}</span>
                        {log.gapsCount === 0
                          ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">Sin gaps</span>
                          : <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700">{log.gapsCount} gap{log.gapsCount > 1 ? "s" : ""}</span>
                        }
                      </div>
                    </div>
                  </button>

                  {isOpen && log.snap && (
                    <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cocteleria de Autor</p>
                          <p className="text-[13px] text-slate-700">
                            <strong className="text-slate-900">{log.snap.authorCocktailsDiageo} de {log.snap.authorCocktailsTotal}</strong> cocktails son Diageo
                            {log.kpis?.authorShare != null && <span className="text-slate-500"> ({log.kpis.authorShare}%)</span>}
                          </p>
                          <p className="text-[11px] text-slate-500">{log.kpis?.authorRule}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Drink Strategy</p>
                          <p className="text-[11px] text-slate-500">{log.kpis?.drinkRule}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {MENU_FIELDS_DETAIL.map(({ key, label }) => (
                              <span key={key} className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${log.snap[key] ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {label}: {log.snap[key] ? "OK" : "No"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {log.gaps && log.gaps.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gaps detectados</p>
                          <div className="flex flex-col gap-2">
                            {log.gaps.map((gap, i) => (
                              <div key={i} className={`rounded-lg border-l-4 bg-white p-3 text-[12px] ${gap.tone === "danger" ? "border-rose-500" : "border-amber-400"}`}>
                                <strong className="block text-slate-900">{gap.title}</strong>
                                <span className="text-slate-600">{gap.copy}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Stand by */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Stand by</span>
            <strong className="text-[14px] font-semibold text-slate-900">Lectura por link QR</strong>
            <p className="text-[12px] leading-relaxed text-slate-600">Solucion escalable para Gourmedia, fu.do, Toteat y similares. Se desarrollara fuera de esta maqueta.</p>
          </div>
          <button disabled type="button" className="cursor-not-allowed self-start rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-[13px] font-semibold text-slate-400">Leer link con IA</button>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Stand by</span>
            <strong className="text-[14px] font-semibold text-slate-900">Escaneo PDF con IA</strong>
            <p className="text-[12px] leading-relaxed text-slate-600">Por ahora los KPIs se mantienen por actualizacion manual del Walker.</p>
          </div>
          <button disabled type="button" className="cursor-not-allowed self-start rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-[13px] font-semibold text-slate-400">Analizar PDF</button>
        </div>
      </div>
    </section>
  );
}

function OnFiveRegisterPanel({ localId, module, onSave, activeIncentives }) {
  const [activeRegisterType, setActiveRegisterType] = useState(STAFF_REGISTER_TYPES[0].key);
  const [formValues, setFormValues] = useState({});
  const [uploading, setUploading] = useState(false);
  const isStaffModule = module.key === "staff";

  if (!isStaffModule) {
    return (
      <>
        <SectionTitle kicker="Registro" title="Campos del modulo" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {module.fields.map((field) => (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{field}</span>
              <input placeholder="Pendiente registrar" type="text"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </label>
          ))}
        </div>
      </>
    );
  }

  const registerType = STAFF_REGISTER_TYPES.find((type) => type.key === activeRegisterType) ?? STAFF_REGISTER_TYPES[0];
  const hasValues = Object.entries(formValues).some(([key, value]) => {
    if (key === "photos") return Array.isArray(value) && value.length > 0;
    if (typeof value === "object" && value !== null) return Object.values(value).some(Boolean);
    return Boolean(value);
  });

  function selectRegisterType(typeKey) {
    setActiveRegisterType(typeKey);
    setFormValues({});
  }

  function updateValue(fieldKey, value) {
    setFormValues((current) => ({ ...current, [fieldKey]: value }));
  }

  function saveRegister() {
    const summary = buildRegisterSummary(registerType, formValues);
    const photos = (formValues.photos ?? []).filter((p) => p.url).map((p) => p.url);
    onSave?.({ text: summary, registerType: registerType.key, incentiveName: formValues.incentiveName, photos });
    setFormValues({});
  }

  // Para cierre incentivo — enriquecer con opciones dinámicas
  const resolvedFields = registerType.fields.map((f) => {
    if (f.key === "incentive" && f.options?.[0] === "__dynamic__") {
      const opts = (activeIncentives ?? []).length > 0
        ? activeIncentives
        : ["Sin incentivos activos"];
      return { ...f, options: opts };
    }
    return f;
  });

  return (
    <>
      <SectionTitle
        kicker="Registro"
        title="Que vas a registrar"
        description="Elige el tipo de actividad para capturar solo los campos que sirven en terreno."
      />
      <div className="flex flex-wrap gap-2" aria-label="Tipo de registro Staff">
        {STAFF_REGISTER_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => selectRegisterType(type.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
              type.key === registerType.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {resolvedFields.map((field) => (
          <RegisterField
            key={field.key}
            field={field}
            localId={localId}
            moduleKey={module.key}
            scope={registerType.key}
            value={formValues[field.key]}
            onChange={(value) => updateValue(field.key, value)}
            onUploadStateChange={setUploading}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!hasValues || uploading} type="button" onClick={saveRegister}>
          {uploading ? "Subiendo fotos…" : "Guardar registro"}
        </button>
        <button className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-400" disabled type="button">
          Enviar minuta por correo
        </button>
        <small className="text-[11px] text-slate-500">{hasValues ? "Quedara en la bitacora de esta cuenta." : "Completa al menos un campo para guardar."}</small>
      </div>
    </>
  );
}

function PhotoUploadField({ label, localId, moduleKey, photos = [], onChange, onUploadStateChange }) {
  const inputRef = useRef(null);

  async function handleFiles(files) {
    if (!files.length) return;

    const newEntries = Array.from(files).map((f) => ({
      _id: `${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(f),
      url: null,
      uploading: true,
      error: null,
      file: f,
    }));

    // Mostrar previews de inmediato — no usar función updater
    const withPreviews = [...photos, ...newEntries];
    onChange(withPreviews);
    onUploadStateChange?.(true);

    // Subir en paralelo
    const results = await Promise.allSettled(
      newEntries.map((entry) => uploadPhoto(localId, moduleKey, entry.file))
    );

    // Resolver desde el array capturado en closure (sin función updater → sin crash)
    const finalPhotos = withPreviews.map((p) => {
      const eIdx = newEntries.findIndex((e) => e._id === p._id);
      if (eIdx === -1) return p;
      try { URL.revokeObjectURL(p.preview); } catch {}
      const result = results[eIdx];
      return result.status === "fulfilled"
        ? { ...p, url: result.value, uploading: false, preview: null, file: null }
        : { ...p, uploading: false, error: "Error al subir", file: null };
    });

    onChange(finalPhotos);
    onUploadStateChange?.(false);
  }

  function remove(idx) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div className="col-span-full flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p._id ?? i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img
                src={p.url ?? p.preview}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {p.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-[10px] font-semibold text-white">Subiendo…</span>
                </div>
              )}
              {p.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-rose-500/80">
                  <span className="text-[10px] font-semibold text-white">Error</span>
                </div>
              )}
              {!p.uploading && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white hover:bg-black/80"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 self-start rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[12px] text-slate-600 transition hover:bg-slate-100">
        <span>📷</span>
        <span>{photos.length > 0 ? "Agregar más fotos" : "Subir fotos de evidencia"}</span>
        <input
          ref={inputRef}
          accept="image/*"
          multiple
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      <small className="text-[11px] text-slate-400">Se comprimen automáticamente antes de subir.</small>
    </div>
  );
}

function RegisterField({ field, localId, moduleKey, onChange, onUploadStateChange, scope, value }) {
  const listId = `crm-${scope}-${field.key}`;
  const inputCls = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
  const labelCls = "flex flex-col gap-1";
  const spanCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  if (field.type === "textarea") {
    return (
      <label className={`col-span-full ${labelCls}`}>
        <span className={spanCls}>{field.label}</span>
        <textarea placeholder={field.placeholder ?? "Pendiente registrar"} value={value ?? ""} onChange={(event) => onChange(event.target.value)}
          className={`min-h-[72px] resize-y ${inputCls}`} />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className={labelCls}>
        <span className={spanCls}>{field.label}</span>
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={inputCls}>
          <option value="" disabled>Seleccionar</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "datalist") {
    return (
      <label className={labelCls}>
        <span className={spanCls}>{field.label}</span>
        <input list={listId} placeholder="Buscar o agregar persona" type="text" value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={inputCls} />
        <datalist id={listId}>
          {field.options?.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>
    );
  }

  if (field.type === "dateRange") {
    return (
      <label className={`col-span-full ${labelCls}`}>
        <span className={spanCls}>{field.label}</span>
        <div className="flex gap-2">
          <input
            aria-label={`${field.label} inicio`}
            type="date"
            value={value?.start ?? ""}
            onChange={(event) => onChange({ ...(value ?? {}), start: event.target.value })}
            className={`flex-1 ${inputCls}`}
          />
          <input
            aria-label={`${field.label} termino`}
            type="date"
            value={value?.end ?? ""}
            onChange={(event) => onChange({ ...(value ?? {}), end: event.target.value })}
            className={`flex-1 ${inputCls}`}
          />
        </div>
      </label>
    );
  }

  if (field.type === "file") {
    return (
      <PhotoUploadField
        label={field.label}
        localId={localId}
        moduleKey={moduleKey}
        photos={value ?? []}
        onChange={onChange}
        onUploadStateChange={onUploadStateChange}
      />
    );
  }

  return (
    <label className={labelCls}>
      <span className={spanCls}>{field.label}</span>
      <input
        placeholder={field.placeholder ?? "Pendiente registrar"}
        type={field.type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={inputCls}
      />
    </label>
  );
}

function buildRegisterSummary(registerType, values) {
  const labelByKey = new Map(registerType.fields.map((field) => [field.key, field.label]));
  const details = Object.entries(values)
    .map(([key, value]) => {
      const parsedValue = formatRegisterValue(value);

      return parsedValue ? `${labelByKey.get(key) ?? key}: ${parsedValue}` : "";
    })
    .filter(Boolean)
    .slice(0, 3);

  return `${registerType.label} registrada${details.length ? ` - ${details.join(" / ")}` : ""}`;
}

function formatRegisterValue(value) {
  if (typeof value === "object" && value !== null) {
    return [value.start, value.end].filter(Boolean).join(" a ");
  }

  return value;
}

function formatPostDate(date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function getAssortmentAnalysis(local) {
  const portfolio = ASSORTMENT_PORTFOLIOS[local.segment] ?? ASSORTMENT_PORTFOLIOS.Mainstream;
  const presentNames = new Set(LIGHTHOUSE_ASSORTMENT_BY_LOCAL[local.id] ?? []);
  const items = portfolio.items.map((item) => ({ ...item, isPresent: presentNames.has(item.name) }));
  const missing = items.filter((item) => !item.isPresent);
  const presentCount = items.length - missing.length;
  const requiredCount = items.length;
  const compliance = Math.round((presentCount / requiredCount) * 100);
  const tone = compliance >= 90 ? "good" : compliance >= 70 ? "warning" : "danger";
  const actionTitle =
    missing.length > 0 ? `Recuperar ${missing[0].name} en proxima compra` : "Defender foto de exito completa";
  const actionCopy =
    missing.length > 0
      ? `La cuenta tiene ${presentCount}/${requiredCount} etiquetas objetivo. Prioriza los faltantes de mayor rol comercial antes de abrir nuevas condiciones.`
      : "La cuenta cumple el portafolio objetivo. En visita, enfocar en rotacion, visibilidad y trade up.";

  return {
    actionCopy,
    actionTitle,
    compliance,
    items,
    missing,
    portfolio,
    presentCount,
    requiredCount,
    tone,
  };
}

const PILLAR_TONE_STYLES = {
  positive: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
};

const PILLAR_TONE_STYLES_ACTIVE = {
  positive: "bg-emerald-500 text-white",
  warning:  "bg-rose-500 text-white",
  danger:   "bg-rose-600 text-white",
  neutral:  "bg-slate-600 text-white",
};

function pillarDisplayLabel(score = "") {
  const s = String(score).toLowerCase();
  if (!s || s === "sin registro" || s === "sin dato") return "Sin auditar";
  if (s === "pendiente" || s === "atencion" || s === "oportunidad" || s === "riesgo") return "Pendiente";
  return "Completado";
}

function ExecutionPillars({ activeKey = "", local, onSelectPillar }) {
  const pillars = ON_FIVE_MODULES.map((module) => ({
    ...module,
    ...(local.pillars[module.key] ?? {}),
  }));

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {pillars.map((pillar) => {
        const isActive = pillar.key === activeKey;
        const tone = getPillarTone(pillar.score);
        const displayLabel = pillarDisplayLabel(pillar.score);
        const badgeClass = isActive
          ? (PILLAR_TONE_STYLES_ACTIVE[tone] ?? PILLAR_TONE_STYLES_ACTIVE.neutral)
          : (PILLAR_TONE_STYLES[tone] ?? PILLAR_TONE_STYLES.neutral);
        return (
          <button
            key={pillar.key}
            type="button"
            onClick={() => onSelectPillar?.(pillar.key)}
            className={`flex flex-col gap-2 rounded-xl border p-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow"
            }`}
          >
            <header className="flex items-center justify-between gap-2">
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                {pillar.label}
              </span>
              <strong className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                {displayLabel}
              </strong>
            </header>
            <h3 className={`text-[12px] leading-relaxed ${isActive ? "text-slate-100" : "text-slate-700"}`}>
              {pillar.summary}
            </h3>
          </button>
        );
      })}
    </div>
  );
}

function OnFiveStat({ label, note, tone = "", value }) {
  const valueTone = tone ? PILLAR_TONE_STYLES[tone] ?? PILLAR_TONE_STYLES.neutral : "";
  return (
    <article className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {tone ? (
        <strong className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[12px] font-semibold ${valueTone}`}>
          {value}
        </strong>
      ) : (
        <strong className="text-[15px] font-semibold text-slate-900">{value}</strong>
      )}
      {note ? <small className="text-[11px] text-slate-500">{note}</small> : null}
    </article>
  );
}

function VisitWall({ draftNote, notes, onDraftNoteChange, onPublishNote }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <textarea
          placeholder="Escribe que viste, que se acordo y cual es el proximo paso..."
          value={draftNote}
          onChange={(event) => onDraftNoteChange(event.target.value)}
          className="min-h-[88px] resize-y rounded-lg border border-slate-200 bg-white p-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
        <button
          type="button"
          onClick={onPublishNote}
          className="self-end rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700"
        >
          Publicar minuta
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <article
            key={note.id}
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <header className="flex items-center justify-between gap-2">
              <strong className="text-[13px] font-semibold text-slate-900">{note.author}</strong>
              <span className="text-[11px] text-slate-500">{note.date}</span>
            </header>
            <small className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{note.type}</small>
            <p className="text-[13px] leading-relaxed text-slate-700">{note.text}</p>
            <footer className="mt-1 text-[11px] font-medium text-slate-500">{note.nextAction}</footer>
          </article>
        ))}
      </div>
    </div>
  );
}

const REQUEST_STATUS_TONE = {
  Solicitado: "bg-blue-50 text-blue-700",
  "En revision": "bg-amber-50 text-amber-700",
  Aprobado: "bg-emerald-50 text-emerald-700",
  Enviado: "bg-violet-50 text-violet-700",
  Instalado: "bg-slate-100 text-slate-700",
  Rechazado: "bg-rose-50 text-rose-700",
};

function RequestList({ requests }) {
  return (
    <div className="flex flex-col gap-2">
      {requests.map((request) => (
        <article
          key={request.id}
          className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <span
            className={`row-span-2 self-start rounded-md px-2 py-0.5 text-[11px] font-semibold ${REQUEST_STATUS_TONE[request.status] ?? "bg-slate-100 text-slate-600"}`}
          >
            {request.status}
          </span>
          <strong className="text-[13px] font-semibold text-slate-900">{request.local}</strong>
          <p className="text-[12px] text-slate-600">{request.type}</p>
          <small className="col-start-2 text-[11px] text-slate-500">{request.owner}</small>
        </article>
      ))}
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
      <span className="text-[12px] text-slate-700">{label}</span>
      <strong className="text-[12px] font-semibold text-slate-900">{value}%</strong>
      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <i className="block h-full rounded-full bg-slate-900" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function WalkerTable({ expanded = false, walkers = [], locals = [] }) {
  const walkerStats = walkers.map((walker) => {
    const misLocals = locals.filter((l) => l.walkerName === walker.name || l.walker === walker.id);
    const total = misLocals.length;
    const auditados = misLocals.filter(
      (l) => l.pillars && Object.values(l.pillars).some((p) => p.lastAudit),
    ).length;
    const cobertura = total > 0 ? Math.round((auditados / total) * 100) : 0;
    return { ...walker, total, auditados, cobertura };
  });

  return (
    <div className="flex flex-col">
      {walkerStats.map((walker) => {
        const tone =
          walker.cobertura >= 70
            ? "text-emerald-600"
            : walker.cobertura >= 40
            ? "text-amber-600"
            : "text-rose-600";
        return (
          <article
            key={walker.id}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-1 border-b border-slate-100 py-2.5 last:border-b-0"
          >
            <span className="flex flex-col">
              <strong className="text-[13px] font-semibold text-slate-900">{walker.name}</strong>
              {walker.area ? <small className="text-[11px] text-slate-500">{walker.area}</small> : null}
            </span>
            <span className="text-right text-[12px] text-slate-600">{walker.total} cuentas</span>
            <span className="text-right text-[12px] text-slate-600">
              {walker.auditadas ?? walker.auditados} auditadas
            </span>
            <span className={`text-right text-[13px] font-bold ${tone}`}>{walker.cobertura}%</span>
            {expanded ? (
              <small className="col-span-full text-[11px] text-slate-400">
                Cobertura de auditoría On Five
              </small>
            ) : null}
          </article>
        );
      })}
      {walkerStats.length === 0 ? (
        <p className="py-4 text-[13px] text-slate-500">
          Sin walkers asignados. Sube el Excel en Configuración.
        </p>
      ) : null}
    </div>
  );
}

function buildChartPoints(series, key) {
  const allValues = series.flatMap((item) => [item.current, item.previous]).filter((v) => v != null);
  if (allValues.length === 0) return "";
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const totalPoints = 12;

  return series
    .filter((item) => item[key] != null)
    .map((item) => {
      const globalIndex = series.indexOf(item);
      const x = 24 + (globalIndex * 312) / Math.max(totalPoints - 1, 1);
      const y = 110 - ((item[key] - min) / range) * 86;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

/* ─────────────── BRANDING ─────────────── */

const BRANDING_MATERIALS_CATALOG = [
  { code: "BRD-001", name: "Copa gin Tanqueray (x6)",          brand: "Tanqueray",       stock: 12 },
  { code: "BRD-002", name: "Copa gin Gordon's (x6)",           brand: "Gordon's",        stock: 8  },
  { code: "BRD-003", name: "Vaso highball JW (x6)",            brand: "Johnnie Walker",  stock: 15 },
  { code: "BRD-004", name: "Vaso Phoenix JW (x6)",             brand: "Johnnie Walker",  stock: 10 },
  { code: "BRD-005", name: "Catrina Don Julio (x6)",           brand: "Don Julio",       stock: 7  },
  { code: "BRD-006", name: "Shot Catrina Don Julio (x6)",      brand: "Don Julio",       stock: 9  },
  { code: "BRD-007", name: "Neon Tanqueray",                   brand: "Tanqueray",       stock: 4  },
  { code: "BRD-008", name: "Neon Johnnie Walker",              brand: "Johnnie Walker",  stock: 3  },
  { code: "BRD-009", name: "Neon Don Julio",                   brand: "Don Julio",       stock: 5  },
  { code: "BRD-010", name: "Neon Gordon's",                    brand: "Gordon's",        stock: 6  },
  { code: "BRD-011", name: "Table tent Tanqueray",             brand: "Tanqueray",       stock: 30 },
  { code: "BRD-012", name: "Table tent Johnnie Walker Black",  brand: "Johnnie Walker",  stock: 25 },
  { code: "BRD-013", name: "Glorifier Don Julio Blanco",       brand: "Don Julio",       stock: 4  },
  { code: "BRD-014", name: "Cooler Smirnoff",                  brand: "Smirnoff",        stock: 2  },
  { code: "BRD-015", name: "Backbar Johnnie Walker Blue",      brand: "Johnnie Walker",  stock: 3  },
  { code: "BRD-016", name: "Banner de barra Diageo",           brand: "Diageo",          stock: 8  },
  { code: "BRD-017", name: "Lanyards staff (x10)",             brand: "Diageo",          stock: 20 },
];

function getBrandingScore(audit) {
  const hasCristaleria =
    audit.jwHighball || audit.jwPhoenix ||
    audit.tqCopa || audit.gordCopa ||
    audit.djCatrina || audit.djShotCatrina;
  const hasNeon =
    audit.neonJw || audit.neonTq || audit.neonDj || audit.neonGord || Boolean(audit.neonOtro?.trim());
  if (hasCristaleria && hasNeon) return { score: "Completado", tone: "good" };
  if (hasCristaleria || hasNeon) return { score: "Pendiente", tone: "warning" };
  if (audit.noAplicaCristaleria && audit.noAplicaNeon) {
    return audit.noAplicaApproved
      ? { score: "Completado", tone: "good" }
      : { score: "Pendiente", tone: "warning" };
  }
  return { score: "Sin registro", tone: "soft" };
}

function BrandingAuditPanel({ activeUserName, local, pillar, onUpdatePillar }) {
  const [audit, setAudit] = useState({
    jwHighball: false, jwPhoenix: false,
    tqCopa: false, gordCopa: false,
    djCatrina: false, djShotCatrina: false,
    noAplicaCristaleria: false,
    neonJw: false, neonTq: false, neonDj: false, neonGord: false, neonOtro: "",
    noAplicaNeon: false, noAplicaApproved: false,
  });
  const [cartItems, setCartItems] = useState([]);
  const [cartMaterial, setCartMaterial] = useState("");
  const [cartQty, setCartQty] = useState(1);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [requests, setRequests] = useState([]);
  const [reqSent, setReqSent] = useState(false);
  const [logs, setLogs] = useState([]);
  const { score, tone } = getBrandingScore(audit);

  function toggle(key) {
    setAudit((a) => ({ ...a, [key]: !a[key] }));
  }

  function setField(key, value) {
    setAudit((a) => ({ ...a, [key]: value }));
  }

  function saveAudit() {
    const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
    setLogs((prev) => [{ id: `b-${Date.now()}`, date: ts, author: activeUserName ?? "Walker", score, tone }, ...prev].slice(0, 10));
    // ── Actualizar pilar real de la cuenta ──
    if (onUpdatePillar) {
      const hasCristaleria = audit.jwHighball || audit.jwPhoenix || audit.tqCopa || audit.gordCopa || audit.djCatrina || audit.djShotCatrina;
      const hasNeon = audit.neonJw || audit.neonTq || audit.neonDj || audit.neonGord || Boolean(audit.neonOtro?.trim());
      const cristSummary = hasCristaleria ? "Cristaleria OK" : "Sin cristaleria";
      const neonSummary = hasNeon ? "Neon OK" : "Sin neon";
      onUpdatePillar("branding", {
        score,
        summary: `${cristSummary} · ${neonSummary}`,
        nextAction: score === "Completado" ? "Mantener visibilidad" : "Solicitar material a CP&A",
        kpiValue: `${hasCristaleria ? 1 : 0}/${hasNeon ? 1 : 0} elementos`,
        lastAudit: ts,
      });
    }
  }

  function addToCart() {
    if (!cartMaterial) return;
    const mat = BRANDING_MATERIALS_CATALOG.find((m) => m.code === cartMaterial);
    if (!mat) return;
    setCartItems((prev) => {
      const exists = prev.find((i) => i.code === mat.code);
      if (exists) return prev.map((i) => i.code === mat.code ? { ...i, qty: i.qty + cartQty } : i);
      return [...prev, { code: mat.code, name: mat.name, qty: cartQty }];
    });
    setCartMaterial("");
    setCartQty(1);
  }

  function removeFromCart(code) {
    setCartItems((prev) => prev.filter((i) => i.code !== code));
  }

  function sendRequest() {
    if (cartItems.length === 0) return;
    const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    setRequests((prev) => [{
      id: `br-${Date.now()}`,
      items: cartItems,
      deliveryNotes,
      date: ts,
      author: activeUserName ?? "Walker",
      status: "Enviada a CP&A",
    }, ...prev]);
    setCartItems([]);
    setDeliveryNotes("");
    setReqSent(true);
    setTimeout(() => setReqSent(false), 2500);
  }

  const checkItemCls = "flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3";
  const checkboxCls = "mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-slate-900";

  return (
    <div className="flex flex-col gap-4">

      {/* Cristalería */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle kicker="Auditoria de branding" title="Cristaleria presente" />
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone === "good" ? "bg-emerald-50 text-emerald-700" : tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{score}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Johnnie Walker</legend>
            <label className={checkItemCls}>
              <input type="checkbox" checked={audit.jwHighball} onChange={() => toggle("jwHighball")} className={checkboxCls} />
              <span className="flex flex-col gap-0.5"><strong className="text-[13px] font-semibold text-slate-900">Vaso Highball</strong><small className="text-[11px] text-slate-500">Copa alta para whisky</small></span>
            </label>
            <label className={checkItemCls}>
              <input type="checkbox" checked={audit.jwPhoenix} onChange={() => toggle("jwPhoenix")} className={checkboxCls} />
              <span className="flex flex-col gap-0.5"><strong className="text-[13px] font-semibold text-slate-900">Phoenix (corto)</strong><small className="text-[11px] text-slate-500">Vaso bajo JW</small></span>
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tanqueray / Gordon&apos;s</legend>
            <label className={checkItemCls}>
              <input type="checkbox" checked={audit.tqCopa} onChange={() => toggle("tqCopa")} className={checkboxCls} />
              <span className="flex flex-col gap-0.5"><strong className="text-[13px] font-semibold text-slate-900">Copa Tanqueray</strong></span>
            </label>
            <label className={checkItemCls}>
              <input type="checkbox" checked={audit.gordCopa} onChange={() => toggle("gordCopa")} className={checkboxCls} />
              <span className="flex flex-col gap-0.5"><strong className="text-[13px] font-semibold text-slate-900">Copa Gordon&apos;s</strong></span>
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Don Julio</legend>
            <label className={checkItemCls}>
              <input type="checkbox" checked={audit.djCatrina} onChange={() => toggle("djCatrina")} className={checkboxCls} />
              <span className="flex flex-col gap-0.5"><strong className="text-[13px] font-semibold text-slate-900">Catrina</strong><small className="text-[11px] text-slate-500">Copa DJ</small></span>
            </label>
            <label className={checkItemCls}>
              <input type="checkbox" checked={audit.djShotCatrina} onChange={() => toggle("djShotCatrina")} className={checkboxCls} />
              <span className="flex flex-col gap-0.5"><strong className="text-[13px] font-semibold text-slate-900">Shot Catrina</strong><small className="text-[11px] text-slate-500">Caballito DJ</small></span>
            </label>
          </fieldset>
        </div>

        <label className={`mt-3 border-t border-slate-200 pt-3 ${checkItemCls}`}>
          <input type="checkbox" checked={audit.noAplicaCristaleria} onChange={() => toggle("noAplicaCristaleria")} className={checkboxCls} />
          <span className="flex flex-col gap-0.5">
            <strong className="text-[13px] font-semibold text-slate-900">No aplica cristaleria</strong>
            <small className="text-[11px] text-amber-600">Requiere visacion de CP&A u On Trade Manager para no contar en el pilar</small>
          </span>
        </label>
      </div>

      {/* Neon */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle kicker="Auditoria de branding" title="Neon presente" />
        <div className="mt-3 flex flex-col gap-2">
          {[
            { key: "neonJw", label: "Neon Johnnie Walker" },
            { key: "neonTq", label: "Neon Tanqueray" },
            { key: "neonDj", label: "Neon Don Julio" },
            { key: "neonGord", label: "Neon Gordon's" },
          ].map(({ key, label }) => (
            <label key={key} className={checkItemCls}>
              <input type="checkbox" checked={audit[key]} onChange={() => toggle(key)} className={checkboxCls} />
              <strong className="text-[13px] font-semibold text-slate-900">{label}</strong>
            </label>
          ))}
          <label className={checkItemCls}>
            <input type="checkbox" checked={Boolean(audit.neonOtro)} onChange={(e) => { if (!e.target.checked) setField("neonOtro", ""); }} className={checkboxCls} />
            <span className="flex flex-1 flex-col gap-1">
              <strong className="text-[13px] font-semibold text-slate-900">Otro neon</strong>
              <input
                placeholder="Especificar marca o tipo..."
                type="text"
                value={audit.neonOtro}
                onChange={(e) => setField("neonOtro", e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] focus:border-slate-900 focus:outline-none"
              />
            </span>
          </label>
        </div>

        <label className={`mt-3 border-t border-slate-200 pt-3 ${checkItemCls}`}>
          <input type="checkbox" checked={audit.noAplicaNeon} onChange={() => toggle("noAplicaNeon")} className={checkboxCls} />
          <span className="flex flex-col gap-0.5">
            <strong className="text-[13px] font-semibold text-slate-900">No aplica neon</strong>
            <small className="text-[11px] text-amber-600">Requiere visacion de CP&A u On Trade Manager</small>
          </span>
        </label>
      </div>

      {/* Foto + guardar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid sm:grid-cols-2 sm:items-end">
        <label className="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-dashed border-slate-200 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Foto de evidencia branding</span>
          <input accept="image/*" type="file" className="text-[13px] text-slate-600" />
        </label>
        <button className="rounded-lg bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700" type="button" onClick={saveAudit}>
          Guardar auditoria
        </button>
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionTitle kicker="Historial" title="Auditorias guardadas" />
          <div className="mt-4 flex flex-col gap-3">
            {logs.map((log) => (
              <article key={log.id} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">{initials(log.author)}</div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <header className="flex items-center gap-2">
                    <strong className="text-[13px] font-semibold text-slate-900">{log.author}</strong>
                    <span className="text-[11px] text-slate-500">{log.date}</span>
                  </header>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${log.tone === "good" ? "bg-emerald-50 text-emerald-700" : log.tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{log.score}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Solicitud a CP&A — multi-material */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle kicker="Solicitud a CP&A" title="Pedir material de marca" />
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          Agrega uno o más materiales. La solicitud llega al portal CP&A con todos los datos de la cuenta.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:grid sm:items-end sm:gap-2" style={{ gridTemplateColumns: "1fr 70px auto" }}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Material</span>
            <select value={cartMaterial} onChange={(e) => setCartMaterial(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] focus:border-slate-900 focus:outline-none">
              <option value="">Elegir material...</option>
              {BRANDING_MATERIALS_CATALOG.map((m) => (
                <option key={m.code} value={m.code}>{m.code} — {m.name} (Stock: {m.stock})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cant.</span>
            <input type="number" min="1" max="99" value={cartQty} onChange={(e) => setCartQty(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-[14px] focus:border-slate-900 focus:outline-none" />
          </label>
          <button type="button" onClick={addToCart} disabled={!cartMaterial}
            className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 bg-slate-900 hover:bg-slate-800 active:bg-slate-700">
            + Agregar
          </button>
        </div>

        {cartItems.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            {cartItems.map((item) => (
              <div key={item.code} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">{item.code}</code>
                <span className="flex-1 text-[13px] text-slate-900">{item.name}</span>
                <strong className="text-[13px] text-slate-900">×{item.qty}</strong>
                <button type="button" onClick={() => removeFromCart(item.code)} className="text-slate-400 hover:text-rose-500 focus:outline-none text-base leading-none">×</button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notas de entrega</span>
          <input type="text" placeholder="Ej: Dejar con el bartender de turno, entrada por Av. Italia" value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none" />
        </label>

        <button className="mt-3 rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={cartItems.length === 0} type="button" onClick={sendRequest}>
          {reqSent ? "✓ Solicitud enviada a CP&A" : `Enviar solicitud${cartItems.length > 0 ? ` (${cartItems.length} ítem${cartItems.length > 1 ? "s" : ""})` : ""}`}
        </button>

        {requests.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Solicitudes enviadas</span>
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[13px] font-semibold text-slate-900">{req.items.length} material{req.items.length > 1 ? "es" : ""} · {req.date}</strong>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">{req.status}</span>
                </div>
                {req.items.map((i) => <span key={i.code} className="text-[12px] text-slate-600">{i.code} — {i.name} ×{i.qty}</span>)}
                {req.deliveryNotes && <span className="text-[11px] text-slate-500">Notas: {req.deliveryNotes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ─────────────── ACTIVATION ─────────────── */

const ACTIVATION_TYPES = [
  { key: "hh", label: "Happy Hour" },
  { key: "table_tent", label: "Table Tent" },
  { key: "first_drink", label: "First Drink" },
  { key: "brand_night", label: "Noche de marca" },
  { key: "promo", label: "Promocion especial" },
];

const ACTIVATION_BRANDS = [
  "Tanqueray", "Tanqueray No. Ten", "Johnnie Walker Red", "Johnnie Walker Black",
  "Johnnie Walker Blue", "Don Julio Blanco", "Don Julio Reposado", "Smirnoff",
  "Gordon's", "Zacapa", "Baileys", "Bulleit", "Captain Morgan",
];

function ActivationPanel({ activeUserName, local, pillar, onUpdatePillar }) {
  const emptyForm = { type: "", brand: "", dateStart: "", dateEnd: "", mechanic: "", photo: null };
  const [form, setForm] = useState(emptyForm);
  const [activations, setActivations] = useState(
    pillar?.records
      ? pillar.records.map((r, i) => ({ id: `a-mock-${i}`, label: r, date: "Mock", author: "Sistema" }))
      : []
  );
  const [justSaved, setJustSaved] = useState(false);
  const canSave = form.type && form.brand && form.dateStart;
  const [noActivation, setNoActivation] = useState(false);
  const [resultForms, setResultForms] = useState({});

  const today = new Date().toISOString().slice(0, 10);
  const expiredNeedingResults = activations.filter(
    (a) => a.dateEnd && a.dateEnd < today && !a.results
  );

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function markNoActivation() {
    const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    setNoActivation(true);
    if (onUpdatePillar) {
      onUpdatePillar("activation", {
        score: "Pendiente",
        summary: "Sin activación en cuenta",
        nextAction: "Proponer activación en próxima visita",
        lastActivation: ts,
      });
    }
  }

  function saveActivation() {
    if (!canSave) return;
    const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    const typeLabel = ACTIVATION_TYPES.find((t) => t.key === form.type)?.label ?? form.type;
    setActivations((prev) => [
      {
        id: `act-${Date.now()}`,
        type: form.type,
        typeLabel,
        brand: form.brand,
        dateStart: form.dateStart,
        dateEnd: form.dateEnd,
        mechanic: form.mechanic,
        date: ts,
        author: activeUserName ?? "Walker",
      },
      ...prev,
    ]);
    // ── Actualizar pilar real de la cuenta ──
    if (onUpdatePillar) {
      onUpdatePillar("activation", {
        score: "Completado",
        summary: `${typeLabel} · ${form.brand}`,
        nextAction: "Medir venta incremental",
        lastActivation: ts,
      });
    }
    setNoActivation(false);
    setForm(emptyForm);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const activeNow = activations.filter((a) => a.dateEnd >= new Date().toISOString().slice(0, 10) || !a.dateEnd);

  const inputCls = "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
  const fieldLabelCls = "flex flex-col gap-1.5";
  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="flex flex-col gap-4">

      {/* Resumen activo */}
      {activeNow.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle kicker="En curso" title="Activaciones activas" />
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">{activeNow.length} activa{activeNow.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-col gap-2">
            {activeNow.slice(0, 3).map((act) => (
              <div key={act.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-violet-50 text-violet-700 shrink-0">{act.typeLabel ?? act.label}</span>
                <span className="text-[13px] font-medium text-slate-900">{act.brand ?? ""}</span>
                {act.mechanic && <span className="flex-1 text-[12px] text-slate-600">{act.mechanic}</span>}
                {act.dateEnd && <span className="ml-auto shrink-0 text-[11px] text-slate-500">Hasta {act.dateEnd}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nueva activacion */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle kicker="Registro" title="Nueva activacion" />

        <div className="mt-3 flex flex-wrap gap-2">
          {ACTIVATION_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setField("type", t.key)}
              className={`rounded-lg px-4 py-2.5 text-[14px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                form.type === t.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={fieldLabelCls}>
              <span className={eyebrowCls}>Marca</span>
              <select value={form.brand} onChange={(e) => setField("brand", e.target.value)} className={inputCls}>
                <option value="">Seleccionar marca...</option>
                {ACTIVATION_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className={fieldLabelCls}>
              <span className={eyebrowCls}>Fecha inicio</span>
              <input type="date" value={form.dateStart} onChange={(e) => setField("dateStart", e.target.value)} className={inputCls} />
            </label>
            <label className={fieldLabelCls}>
              <span className={eyebrowCls}>Fecha termino</span>
              <input type="date" value={form.dateEnd} onChange={(e) => setField("dateEnd", e.target.value)} className={inputCls} />
            </label>
          </div>

          <label className={fieldLabelCls}>
            <span className={eyebrowCls}>Mecanica</span>
            <textarea
              placeholder="Ej: 2x1 en gin tonic de lunes a jueves de 19 a 21 hrs. Con carta especial en barra."
              rows={3}
              value={form.mechanic}
              onChange={(e) => setField("mechanic", e.target.value)}
              className={`resize-y ${inputCls}`}
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-2.5 text-[14px] text-slate-600 hover:bg-slate-50">
              <input accept="image/*" style={{ display: "none" }} type="file" />
              + Adjuntar foto
            </label>
            <button
              type="button"
              onClick={markNoActivation}
              className={`rounded-lg border px-4 py-2.5 text-[14px] transition focus:outline-none ${noActivation ? "border-slate-900 bg-slate-900 font-semibold text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {noActivation ? "✓ Sin activación registrado" : "No tiene activación"}
            </button>
            <button
              className="rounded-lg bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSave}
              type="button"
              onClick={saveActivation}
            >
              {justSaved ? "✓ Guardada" : "Guardar activacion"}
            </button>
          </div>
        </div>
      </div>

      {/* Pendientes de cierre — activaciones vencidas sin resultados */}
      {expiredNeedingResults.length > 0 && (
        <div className="rounded-xl border-2 border-amber-400 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <SectionTitle kicker="Pendiente de cierre" title="Activaciones vencidas — reportar resultados" />
          </div>
          <p className="mb-4 text-[12px] leading-relaxed text-slate-600">
            Estas activaciones terminaron. Para darlas por ejecutadas debes reportar los resultados.
          </p>
          {expiredNeedingResults.map((act) => {
            const rf = resultForms[act.id] ?? { unitsSold: "", notes: "" };
            return (
              <div key={act.id} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <strong className="text-[13px] font-semibold text-slate-900">{act.typeLabel ?? act.label}</strong>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">{act.brand}</span>
                  <span className="ml-auto text-[11px] text-slate-500">Terminó {act.dateEnd}</span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <label className={fieldLabelCls}>
                    <span className={eyebrowCls}>{act.brand ? `Unidades ${act.brand} vendidas` : "Unidades vendidas"}</span>
                    <input type="number" min="0" placeholder="Ej: 24" value={rf.unitsSold}
                      onChange={(e) => setResultForms((prev) => ({ ...prev, [act.id]: { ...rf, unitsSold: e.target.value } }))}
                      className={inputCls} />
                  </label>
                  <label className={fieldLabelCls}>
                    <span className={eyebrowCls}>Notas de resultado</span>
                    <input type="text" placeholder="Ej: Buena recepción, quieren repetir" value={rf.notes}
                      onChange={(e) => setResultForms((prev) => ({ ...prev, [act.id]: { ...rf, notes: e.target.value } }))}
                      className={inputCls} />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={!rf.unitsSold}
                  onClick={() => {
                    setActivations((prev) => prev.map((a) => a.id === act.id ? { ...a, results: rf } : a));
                    if (onUpdatePillar) {
                      onUpdatePillar("activation", { score: "Completado", summary: `${act.typeLabel ?? act.brand} cerrada · ${rf.unitsSold} unid.` });
                    }
                  }}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cerrar activación
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Historial */}
      {activations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SectionTitle kicker="Historial" title="Activaciones registradas" />
          <div className="mt-4 flex flex-col gap-3">
            {activations.map((act) => (
              <article key={act.id} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">{initials(act.author ?? "W")}</div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <header className="flex items-center gap-2">
                    <strong className="text-[13px] font-semibold text-slate-900">{act.author ?? "Sistema"}</strong>
                    <span className="text-[11px] text-slate-500">{act.date}</span>
                  </header>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-violet-50 text-violet-700">{act.typeLabel ?? act.label}</span>
                    {act.brand && <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">{act.brand}</span>}
                    {act.results && <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">✓ Cerrada · {act.results.unitsSold} unid.</span>}
                    {act.dateEnd && act.dateEnd < today && !act.results && <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700">Vencida</span>}
                  </div>
                  {act.mechanic && <p className="text-[12px] text-slate-600">{act.mechanic}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function buildDefaultMenuEvaluation(local) {
  const hasDiageoAacc = Boolean(local.hasAacc);
  const seed = {
    "bar-lagarto": {
      authorCocktailsTotal: 8,
      authorCocktailsDiageo: 5,
      hasWhiskyAuthorCocktail: true,
      hasGinAuthorCocktail: true,
      hasTropicalGin: true,
      hasWhiscolaNaming: false,
      hasTanquerayGt: true,
      hasWhiskySourBlack: false,
    },
    "hotel-alvear": {
      authorCocktailsTotal: 12,
      authorCocktailsDiageo: 9,
      hasWhiskyAuthorCocktail: true,
      hasGinAuthorCocktail: true,
      hasTropicalGin: true,
      hasWhiscolaNaming: true,
      hasTanquerayGt: true,
      hasWhiskySourBlack: true,
    },
    "club-crobar": {
      authorCocktailsTotal: 4,
      authorCocktailsDiageo: 1,
      hasWhiskyAuthorCocktail: false,
      hasGinAuthorCocktail: true,
      hasTropicalGin: true,
      hasWhiscolaNaming: false,
      hasTanquerayGt: false,
      hasWhiskySourBlack: false,
    },
  }[local.id] ?? {};

  return {
    commercialStatus: hasDiageoAacc ? "diageo" : "none",
    authorCocktailsTotal: seed.authorCocktailsTotal ?? 0,
    authorCocktailsDiageo: seed.authorCocktailsDiageo ?? 0,
    hasWhiskyAuthorCocktail: seed.hasWhiskyAuthorCocktail ?? false,
    hasGinAuthorCocktail: seed.hasGinAuthorCocktail ?? false,
    hasTropicalGin: seed.hasTropicalGin ?? false,
    hasWhiscolaNaming: seed.hasWhiscolaNaming ?? false,
    hasTanquerayGt: seed.hasTanquerayGt ?? false,
    hasWhiskySourBlack: seed.hasWhiskySourBlack ?? false,
    lastSaved: null,
  };
}

function getManualMenuKpis(evaluation) {
  const authorShare = evaluation.authorCocktailsTotal
    ? Math.round((evaluation.authorCocktailsDiageo / evaluation.authorCocktailsTotal) * 100)
    : 0;
  const authorOk =
    evaluation.commercialStatus === "diageo"
      ? evaluation.authorCocktailsTotal > 0 && authorShare >= 60
      : evaluation.hasWhiskyAuthorCocktail && evaluation.hasGinAuthorCocktail;
  const drinkMandatory = evaluation.commercialStatus !== "competitor";
  const drinkOk =
    !drinkMandatory ||
    (evaluation.hasTropicalGin &&
      evaluation.hasWhiscolaNaming &&
      evaluation.hasTanquerayGt &&
      evaluation.hasWhiskySourBlack);
  const overallOk = authorOk && drinkOk;

  return {
    authorOk,
    authorShare,
    authorRule:
      evaluation.commercialStatus === "diageo"
        ? "Meta: 60% de CA con marcas Diageo"
        : "Meta: 1 CA con whisky + 1 CA con gin",
    authorStatus: authorOk ? "Cumple" : "No cumple",
    authorTone: authorOk ? "good" : "danger",
    drinkMandatory,
    drinkOk,
    drinkRule: drinkMandatory ? "4 serves mandatorios" : "No mandatorio por AACC competencia",
    drinkStatus: drinkMandatory ? (drinkOk ? "Cumple" : "No cumple") : "No mandatorio",
    drinkTone: drinkMandatory ? (drinkOk ? "good" : "danger") : "soft",
    overallStatus: overallOk ? "Menu OK" : "Requiere gestion",
    overallTone: overallOk ? "good" : "warning",
  };
}

function getManualMenuGaps(evaluation, kpis) {
  const gaps = [];

  if (!kpis.authorOk) {
    gaps.push({
      copy:
        evaluation.commercialStatus === "diageo"
          ? `Hoy la cuenta tiene ${kpis.authorShare}% de CA con marcas Diageo. Hay que subir el mix hasta al menos 60%.`
          : "La cuenta debe tener un coctel de autor con whisky y uno con gin para cumplir el criterio minimo.",
      title: "Cerrar gap de Cocteleria de Autor",
      tone: "warning",
      type: "CA",
    });
  }

  if (kpis.drinkMandatory && !evaluation.hasTropicalGin) {
    gaps.push({
      copy: "Incluir Tropical Gin usando Tanqueray o Gordon's como marca base.",
      title: "Agregar Tropical Gin",
      tone: "warning",
      type: "Drink Strategy",
    });
  }

  if (kpis.drinkMandatory && !evaluation.hasWhiscolaNaming) {
    gaps.push({
      copy: "Corregir la carta para que el naming diga exactamente Whiscola Johnnie Walker Red.",
      title: "Corregir naming de Whiscola",
      tone: "danger",
      type: "Naming",
    });
  }

  if (kpis.drinkMandatory && !evaluation.hasTanquerayGt) {
    gaps.push({
      copy: "Asegurar Tanqueray Gin & Tonic visible como serve de gin en la carta.",
      title: "Agregar Tanqueray Gin & Tonic",
      tone: "warning",
      type: "Drink Strategy",
    });
  }

  if (kpis.drinkMandatory && !evaluation.hasWhiskySourBlack) {
    gaps.push({
      copy: "Incluir Whisky Sour con Johnnie Walker Black para completar el set mandatorio.",
      title: "Agregar Whisky Sour JW Black",
      tone: "warning",
      type: "Drink Strategy",
    });
  }

  if (!kpis.drinkMandatory) {
    gaps.push({
      copy: "No se exige como mandatorio por AACC competencia, pero conviene monitorear oportunidades de entrada cuando cambie la carta.",
      title: "Drink Strategy queda como foco recomendado",
      tone: "soft",
      type: "No mandatorio",
    });
  }

  return gaps.slice(0, 5);
}

function getMenuStats(items) {
  const total = items.length;
  const diageoCount = items.filter((item) => item.owner === "Diageo").length;
  const averagePrice = total ? sumBy(items, (item) => item.price) / total : 0;
  const averageConfidence = total ? Math.round((sumBy(items, (item) => item.confidence) / total) * 100) : 0;

  return {
    averageConfidence,
    averagePrice,
    diageoCount,
    diageoShare: total ? Math.round((diageoCount / total) * 100) : 0,
    total,
  };
}

function getMenuOpportunities(items, local) {
  const categories = new Set(items.map((item) => item.category));
  const diageoItems = items.filter((item) => item.owner === "Diageo");
  const competitorItems = items.filter((item) => item.owner === "Competencia");
  const opportunities = [];

  if (competitorItems.length > diageoItems.length) {
    opportunities.push({
      copy: "La competencia tiene mas presencia que Diageo en esta carta. Priorizar incorporacion de un cocktail hero y una marca core.",
      title: "Recuperar presencia de marca",
      tone: "warning",
      type: "Share",
    });
  } else {
    opportunities.push({
      copy: "Diageo aparece con buena presencia. La oportunidad es defender precio, visibilidad y trade up por categoria.",
      title: "Defender presencia y subir mix",
      tone: "good",
      type: "Share",
    });
  }

  if (!categories.has("Tequila") && ["Trendsetter", "Reserve"].includes(local.segment)) {
    opportunities.push({
      copy: "Para este perfil de local deberia existir una propuesta visible de tequila premium, idealmente Don Julio.",
      title: "Agregar propuesta de tequila",
      tone: "warning",
      type: "Gap",
    });
  }

  if (!categories.has("Gin")) {
    opportunities.push({
      copy: "No se detecto gin en carta. Es una oportunidad para instalar un serve simple y medible.",
      title: "Instalar gin en carta",
      tone: "warning",
      type: "Gap",
    });
  }

  opportunities.push({
    copy: "Guardar esta lectura permite comparar cambios de carta por fecha y medir si la negociacion se traduce en presencia real.",
    title: "Registrar lectura como linea base",
    tone: "soft",
    type: "Seguimiento",
  });

  return opportunities.slice(0, 3);
}

function formatFileSize(size) {
  if (!size) {
    return "0 KB";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMenuPrice(value) {
  return `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatCurrency(value) {
  return `US$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)}`;
}

function sumBy(items, getValue) {
  return items.reduce((total, item) => total + (getValue(item) ?? 0), 0);
}

function getPillarTone(score = "") {
  const s = String(score).toLowerCase();
  if (s === "completado") return "good";
  if (s === "pendiente")  return "warning";
  if (s === "sin registro" || s === "sin dato" || s === "") return "soft";
  // legacy fallback
  if (s.includes("riesgo") || s.includes("bloque")) return "danger";
  if (s.includes("atencion") || s.includes("oportunidad")) return "warning";
  if (s.includes("bueno") || s.includes("fuerte") || s.includes("curso")) return "good";
  return "soft";
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const BRANDING_REQUESTS_MOCK = [
  { id: "br1", local: "Bar Lagarto", address: "Av. Italia 123, Providencia", walker: "Ana Garcia", contact: "Juan Pérez - Bartender", items: [{ code: "BRD-011", name: "Table tent Tanqueray", qty: 2 }], status: "Pendiente", date: "02 may 2026", deliveryNotes: "Dejar en barra principal, preguntar por Juan" },
  { id: "br2", local: "Hotel Las Condes", address: "El Bosque Norte 0440, Las Condes", walker: "Marcos Ruiz", contact: "Pedro Salas - Encargado", items: [{ code: "BRD-015", name: "Backbar Johnnie Walker Blue", qty: 1 }], status: "En tránsito", date: "01 may 2026", deliveryNotes: "Reposición de botellero dañado" },
  { id: "br3", local: "Bar Lagarto", address: "Av. Italia 123, Providencia", walker: "Ana Garcia", contact: "Juan Pérez - Bartender", items: [{ code: "BRD-014", name: "Cooler Smirnoff", qty: 1 }, { code: "BRD-016", name: "Banner de barra Diageo", qty: 2 }], status: "Entregado", date: "28 abr 2026", deliveryNotes: "Entrada del bar, a la derecha" },
  { id: "br4", local: "Club Crobar", address: "Marchant Pereira 145, Providencia", walker: "Lucas Prima", contact: "Sofía Mora - Gerente", items: [{ code: "BRD-017", name: "Lanyards staff (x10)", qty: 2 }], status: "Entregado", date: "25 abr 2026", deliveryNotes: "20 lanyards para temporada de verano" },
];

const REQUEST_STATUS_STYLE = {
  "Pendiente":   "warning",
  "En tránsito": "soft",
  "Entregado":   "good",
};

function BrandingRequestsBoard() {
  const [requests, setRequests] = useState(BRANDING_REQUESTS_MOCK);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("En tránsito");

  function updateStatus(id, nextStatus) {
    setRequests((current) => current.map((r) => r.id === id ? { ...r, status: nextStatus } : r));
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => prev.size === requests.length ? new Set() : new Set(requests.map((r) => r.id)));
  }

  function applyBulk() {
    setRequests((current) => current.map((r) => selected.has(r.id) ? { ...r, status: bulkStatus } : r));
    setSelected(new Set());
  }

  function exportExcel() {
    const rows = requests.map((r) => ({
      Cuenta: r.local,
      Dirección: r.address,
      Walker: r.walker,
      Contacto: r.contact,
      Materiales: r.items.map((i) => `${i.name} (x${i.qty})`).join(" | "),
      Códigos: r.items.map((i) => i.code).join(" | "),
      "Notas de entrega": r.deliveryNotes,
      Fecha: r.date,
      Estado: r.status,
    }));
    const header = Object.keys(rows[0]).join("\t");
    const body = rows.map((row) => Object.values(row).join("\t")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "solicitudes_branding.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  const pending = requests.filter((r) => r.status === "Pendiente").length;
  const statusSelectCls = (status) => status === "Entregado"
    ? "bg-emerald-50 text-emerald-700 font-semibold"
    : status === "En tránsito"
    ? "bg-blue-50 text-blue-700 font-semibold"
    : "bg-amber-50 text-amber-700 font-semibold";

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">CP&A · Branding</span>
          <h2 className="text-[16px] font-bold text-slate-900">Solicitudes de materiales</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending > 0 && <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700">{pending} pendiente{pending > 1 ? "s" : ""}</span>}
          <button onClick={exportExcel} type="button" className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1">
            ↓ Exportar Excel
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-blue-700">{selected.size} seleccionadas</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-[13px] focus:outline-none">
            {["Pendiente", "En tránsito", "Entregado"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={applyBulk} type="button" className="rounded-lg bg-blue-600 px-3 py-1 text-[13px] font-semibold text-white hover:bg-blue-700 focus:outline-none">
            Aplicar
          </button>
          <button onClick={() => setSelected(new Set())} type="button" className="ml-auto rounded-lg border border-blue-200 bg-white px-3 py-1 text-[13px] text-slate-600 hover:bg-slate-50 focus:outline-none">
            Cancelar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="w-9 border-b border-slate-200 p-3">
                  <input type="checkbox" checked={selected.size === requests.length} onChange={toggleAll} className="cursor-pointer" />
                </th>
                {["Cuenta", "Materiales", "Contacto", "Notas de entrega", "Fecha", "Estado"].map((h) => (
                  <th key={h} className="border-b border-slate-200 p-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className={`border-b border-slate-100 last:border-b-0 ${selected.has(req.id) ? "bg-blue-50" : "bg-white"}`}>
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(req.id)} onChange={() => toggleSelect(req.id)} className="cursor-pointer" />
                  </td>
                  <td className="p-3">
                    <strong className="block text-[13px] font-semibold text-slate-900">{req.local}</strong>
                    <span className="text-[11px] text-slate-500">{req.address}</span>
                    <span className="block text-[11px] text-slate-500">Walker: {req.walker}</span>
                  </td>
                  <td className="p-3">
                    {req.items.map((item) => (
                      <div key={item.code} className="mb-1 flex items-center gap-2 last:mb-0">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">{item.code}</code>
                        <span className="text-[12px] text-slate-700">{item.name}</span>
                        <strong className="text-[12px] text-slate-900">×{item.qty}</strong>
                      </div>
                    ))}
                  </td>
                  <td className="p-3 text-[12px] text-slate-700">{req.contact}</td>
                  <td className="max-w-[180px] p-3 text-[12px] text-slate-600">{req.deliveryNotes}</td>
                  <td className="p-3 text-[11px] text-slate-500">{req.date}</td>
                  <td className="p-3">
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req.id, e.target.value)}
                      className={`w-full cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-[12px] focus:outline-none ${statusSelectCls(req.status)}`}
                    >
                      {["Pendiente", "En tránsito", "Entregado"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const CONFIG_WALKERS_MOCK = [
  { id: "w1", name: "Ana Garcia", ruta: "Ruta Oriente", locals: ["Bar Lagarto", "Vitacura Club", "Sushi Osaka Las Condes"] },
  { id: "w2", name: "Marcos Ruiz", ruta: "Ruta Centro-Sur", locals: ["Hotel Las Condes", "Clandestino", "Bar Nacional"] },
  { id: "w3", name: "Lucas Prima", ruta: "Ruta Centro-Norte", locals: ["Club Crobar", "Liguria", "The Clinic Bar"] },
];

function MaestroSection({ excelMeta, excelError, onUpload, onClearBase, pendingExcelResult, onSaveToSupabase, uploadSaving, uploadSavedAt, uploadSupabaseError }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  function downloadTemplate() {
    const headers = [
      "Nombre Cuenta", "Razón Social", "ID Distribuidor", "ID Diageo",
      "Segmento", "Outlet", "Dirección", "Comuna", "Desarrollador", "AACC", "Walker", "Ruta",
    ];
    const example1 = [
      "Bar La Terraza", "Inversiones La Terraza SpA", "501000001", "",
      "PREMIUM CORE", "BAR", "Av. Providencia 1234", "Providencia", "CL55", "AACC", "Luis Felipe Cruz", "Ruta Norte",
    ];
    const example2 = [
      "Club Nocturno", "", "501000002", "",
      "NIGHTLIFE", "DISCO", "Calle Estado 45", "Santiago", "CL56", "Sin AACC", "", "",
    ];
    const example3 = [
      "Restaurante Centro", "Gastronomía Centro Ltda", "501000003", "",
      "RESERVE", "DINING", "Nueva de Lyon 89", "Providencia", "CL55", "Sin AACC", "", "",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2, example3]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cuentas");
    XLSX.writeFile(wb, "plantilla_maestro_cuentas.xlsx");
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className={eyebrowCls}>CP&A · Administración</span>
          <h2 className="mt-1 text-[16px] font-bold text-slate-900">Maestro de cuentas</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Solo CP&A puede cargar o actualizar la cartera. Los Walkers ven la data lista al ingresar.
          </p>
        </div>
        {excelMeta ? (
          <span className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700">
            ✓ {excelMeta.count} cuentas · {excelMeta.fileName}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">Sin datos cargados</span>
        )}
      </div>

      <label className="cursor-pointer">
        <div className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-6 transition ${excelMeta ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <span className="shrink-0 text-3xl">{excelMeta ? "✅" : "📂"}</span>
          <div>
            <strong className={`block text-[14px] font-semibold ${excelMeta ? "text-emerald-700" : "text-slate-900"}`}>
              {excelMeta ? `BASE — ${excelMeta.count} cuentas importadas` : "Arrastra o haz click para cargar el Excel"}
            </strong>
            <small className="text-[11px] text-slate-500">
              {excelMeta ? "Haz click para reemplazar con un archivo nuevo" : "Formato .xlsx con las columnas de la plantilla"}
            </small>
          </div>
        </div>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onUpload} />
      </label>

      {excelError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          {excelError.split("\n").map((line, i) =>
            line.trim().startsWith("ALTER") ? (
              <code key={i} className="mt-1 block rounded bg-rose-100 px-2 py-1 font-mono text-[11px] text-rose-800 select-all break-all">{line}</code>
            ) : (
              <p key={i} className={`text-[13px] ${i === 0 ? "font-semibold text-rose-700" : "mt-1 text-rose-600"}`}>{line}</p>
            )
          )}
        </div>
      )}

      {pendingExcelResult && (
        <div className="rounded-xl border-2 border-slate-900 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[14px] font-bold text-slate-900">
                {pendingExcelResult.locals.length} cuentas listas para guardar
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Los datos ya están en la app. Haz click en <strong>Guardar</strong> para que queden disponibles para todos los usuarios.
              </p>
            </div>
            <button
              type="button"
              disabled={uploadSaving}
              onClick={onSaveToSupabase}
              className="shrink-0 rounded-lg bg-slate-900 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-slate-700 focus:outline-none disabled:opacity-50"
            >
              {uploadSaving
                ? uploadProgress
                  ? `Guardando ${uploadProgress.done}/${uploadProgress.total}…`
                  : "Guardando…"
                : "Guardar"}
            </button>
          </div>
          {uploadSupabaseError && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              {uploadSupabaseError.split("\n").map((line, i) =>
                line.trim().startsWith("ALTER") ? (
                  <code key={i} className="mt-1 block rounded bg-rose-100 px-2 py-1 font-mono text-[11px] text-rose-800 select-all break-all">{line}</code>
                ) : (
                  <p key={i} className={`text-[13px] ${i === 0 ? "font-semibold text-rose-700" : "mt-1 text-rose-600"}`}>{line}</p>
                )
              )}
            </div>
          )}
        </div>
      )}

      {uploadSavedAt && !pendingExcelResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-emerald-700">
            ✓ Guardado — {uploadSavedAt.toLocaleTimeString("es-CL")}
          </p>
          <p className="mt-0.5 text-[12px] text-emerald-600">Los walkers verán las cuentas al iniciar sesión.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none"
        >
          Descargar plantilla Excel
        </button>
        {excelMeta && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none"
          >
            Eliminar base actual
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-slate-900">Eliminar base de cuentas</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Esto eliminará las <strong>{excelMeta?.count ?? 0} cuentas</strong> cargadas actualmente.
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] hover:bg-slate-50 focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { onClearBase?.(); setShowConfirm(false); }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-700 focus:outline-none"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function ConfigView({ excelMeta, excelError, onUpload, onClearBase, localsData, setLocalsData, walkers, onAddManualLocal, assortmentConfig, onSaveAssortmentConfig, onUpdateAccount, pendingExcelResult, onSaveToSupabase, uploadSaving, uploadSavedAt, uploadSupabaseError, developers = [], onDevelopersChange }) {
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [routes, setRoutes] = useState([]);

  function loadTeam() {
    return fetchProfilesFromAdmin().then(setTeamProfiles).catch(() => {});
  }

  useEffect(() => {
    loadTeam();
    fetchRoutes().then(setRoutes).catch(() => {});
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const emptyForm = {
    nombre: "", razonSocial: "", segmento: "PREMIUM CORE", subcanal: "DINING",
    comuna: "", region: "07. Metropolitana", direccion: "", walkerName: "",
    acuerdo: "Sin AACC", fechaTermino: "", skus: "", observacion: "",
    menuUrl: "", accountCode: "",
  };
  const [form, setForm] = useState(emptyForm);

  const walkerStats = useMemo(() =>
    (walkers || []).map((w) => {
      const accounts = localsData.filter((l) => l.walkerName === w.id || l.walkerName === w.name);
      return {
        ...w,
        accounts,
        gapsCount: accounts.filter((a) => a.pillars.menu.score !== "Completado").length,
        aaccCount: accounts.filter((a) => a.hasAacc).length,
        avgHealth: accounts.length ? Math.round(accounts.reduce((s,a) => s + a.healthScore, 0) / accounts.length) : 0,
      };
    }),
    [walkers, localsData]
  );

  const manualAccounts = localsData.filter((l) => l.isManual);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (!form.nombre.trim()) return;
    const newLocal = buildManualLocal({ ...form, walkerName: form.walkerName || "Sin asignar" });
    onAddManualLocal?.(newLocal);
    setJustAdded(form.nombre);
    setForm(emptyForm);
    setShowForm(false);
    setTimeout(() => setJustAdded(null), 4000);
  }

  const SEGMENTOS = ["PREMIUM CORE", "RESERVE", "MAINSTREAM", "TRENDSETTER", "NIGHTLIFE"];
  const SUBCANALES = ["DINING", "DISCO", "BAR", "HOTEL", "RESTAURANT", "CAFE", "LATE NIGHT", "OTRO"];
  const ACUERDOS = ["Sin AACC", "Diageo", "Tanqueray", "Johnnie Walker", "Don Julio", "Smirnoff", "Mixto"];

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
  const labelCls = "flex flex-col gap-1";
  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  const CONFIG_SECTIONS = [
    { id: "maestro",        label: "Maestro de cuentas",   icon: "📂", desc: "Carga del Excel maestro" },
    { id: "walkers",        label: "Equipo",               icon: "👥", desc: "Walkers y Managers" },
    { id: "desarrolladores",label: "Desarrolladores",      icon: "🏢", desc: "Equipo Andina" },
    { id: "rutas",          label: "Rutas",                icon: "🗺️", desc: "Rutas del equipo" },
    { id: "carga-masiva",   label: "Carga masiva locales", icon: "📋", desc: "Importar locales por Walker" },
    { id: "assortment",     label: "Portafolio Assortment",icon: "🍾", desc: "Portafolio por segmento" },
    { id: "weights",        label: "Pesos On Five",        icon: "⚖️", desc: "Ponderación del score" },
    { id: "cuentas",        label: "Segmento por cuenta",  icon: "🏪", desc: "Segmento y tipo de outlet" },
    { id: "manual",         label: "Agregar cuenta manual",icon: "➕", desc: "Alta manual de PDV" },
  ];
  const [configSection, setConfigSection] = useState("maestro");

  return (
    <div className="flex min-h-[600px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white md:grid" style={{ gridTemplateColumns: "220px 1fr" }}>

      {/* ── Panel izquierdo — lista de secciones ── */}
      <div className="border-b border-slate-200 py-2 md:border-b-0 md:border-r">
        <div className="px-5 pb-3 pt-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">BARRA · CP&A</span>
          <h2 className="text-[16px] font-bold text-slate-900">Configuración</h2>
        </div>
        <nav className="flex flex-wrap gap-1 px-2 pb-2 md:flex-col md:gap-0.5 md:pb-0">
          {CONFIG_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setConfigSection(s.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                configSection === s.id
                  ? "bg-slate-100 font-semibold text-slate-900"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="opacity-80">{s.icon}</span>
              <span className="flex-1">{s.label}</span>
              {configSection === s.id && <span className="hidden text-[11px] text-slate-400 md:inline">›</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Panel derecho — contenido de la sección activa ── */}
      <div className="overflow-y-auto p-4 md:p-8">

      {configSection === "maestro" && (<>
      {/* ── Carga del Excel ── */}
      <MaestroSection
        excelMeta={excelMeta}
        excelError={excelError}
        onUpload={onUpload}
        onClearBase={onClearBase}
        pendingExcelResult={pendingExcelResult}
        onSaveToSupabase={onSaveToSupabase}
        uploadSaving={uploadSaving}
        uploadSavedAt={uploadSavedAt}
        uploadSupabaseError={uploadSupabaseError}
      />

      {/* ── Asignación por Walker ── */}
      {walkerStats.length > 0 ? (
        <article className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <span className={eyebrowCls}>Carteras cargadas</span>
            <h2 className="mt-1 text-[16px] font-bold text-slate-900">{walkerStats.length} Walkers · {localsData.length} cuentas totales</h2>
            <p className="mt-1 text-[13px] text-slate-600">
              Cada hoja del Excel corresponde a un Walker. Los filtros en el sidebar permiten ver la cartera individual.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {walkerStats.map((w) => {
              const healthCls = w.avgHealth >= 76 ? "text-emerald-600" : w.avgHealth >= 60 ? "text-amber-600" : "text-rose-600";
              return (
                <div key={w.id} className="grid items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                    {initials(w.name)}
                  </span>
                  <div>
                    <strong className="block text-[14px] font-semibold text-slate-900">{w.name}</strong>
                    <span className="text-[11px] text-slate-500">
                      {w.count} cuentas · {w.aaccCount} AACC · {w.gapsCount} gaps Menú · Health prom.{" "}
                      <strong className={healthCls}>{w.avgHealth}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">{w.count} cuentas</span>
                    {w.aaccCount > 0 && <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700">{w.aaccCount} AACC</span>}
                    {w.gapsCount > 0 && <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700">{w.gapsCount} gaps</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ) : (
        <article className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-2 text-3xl">👆</div>
          <strong className="block text-[14px] text-slate-900">Carga el Excel para ver la asignación por Walker</strong>
          <p className="mt-1 text-[12px] text-slate-500">La cartera se distribuirá automáticamente según el campo "Desarrollador Sell Out".</p>
        </article>
      )}

      </>)}

      {configSection === "walkers" && (
        <UserRolesSection
          teamProfiles={teamProfiles}
          routes={routes}
          onRefresh={loadTeam}
        />
      )}
      {configSection === "desarrolladores" && (
        <DevelopersSection
          developers={developers}
          onRefresh={() => fetchDevelopers().then((d) => { onDevelopersChange?.(d); }).catch(() => {})}
        />
      )}
      {configSection === "rutas" && (
        <RoutesSection
          routes={routes}
          localsData={localsData}
          setLocalsData={setLocalsData}
          walkerProfiles={teamProfiles.filter((p) => p.role === "walker")}
          onRefresh={() => Promise.all([fetchRoutes().then(setRoutes), loadTeam()]).catch(() => {})}
          onAssignWalkerToRoute={async (userId, ruta) => {
            await updateWalkerRuta(userId, ruta);
            await loadTeam();
          }}
        />
      )}
      {configSection === "carga-masiva" && (
        <BulkLocalsUploadSection
          walkerProfiles={teamProfiles.filter((p) => p.role === "walker")}
          localsData={localsData}
          setLocalsData={setLocalsData}
        />
      )}
      {configSection === "weights" && <OnFiveWeightsSection />}
      {configSection === "assortment" && (
        <AssortmentConfigSection
          assortmentConfig={assortmentConfig ?? DEFAULT_ASSORTMENT_CONFIG}
          onSave={onSaveAssortmentConfig}
        />
      )}
      {configSection === "cuentas" && (
        <AccountSegmentSection localsData={localsData} walkers={walkers} onUpdateAccount={onUpdateAccount} />
      )}
      {configSection === "manual" && (<>
        <div className="mb-5">
          <h2 className="text-[16px] font-bold text-slate-900">Agregar cuenta manual</h2>
          <p className="mt-1 text-[13px] text-slate-600">Da de alta un PDV que no está en el Excel maestro.</p>
        </div>
        <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {justAdded && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
              ✓ &ldquo;{justAdded}&rdquo; agregada a la cartera
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}><span className={eyebrowCls}>Nombre fantasía *</span>
              <input className={inputCls} placeholder="Ej: Bar El Patrón" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} /></label>
            <label className={labelCls}><span className={eyebrowCls}>Razón social</span>
              <input className={inputCls} placeholder="Ej: Sociedad Gastronómica..." value={form.razonSocial} onChange={(e) => setField("razonSocial", e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className={labelCls}><span className={eyebrowCls}>Segmento</span>
              <select className={inputCls} value={form.segmento} onChange={(e) => setField("segmento", e.target.value)}>
                {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label className={labelCls}><span className={eyebrowCls}>Subcanal</span>
              <select className={inputCls} value={form.subcanal} onChange={(e) => setField("subcanal", e.target.value)}>
                {SUBCANALES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label className={labelCls}><span className={eyebrowCls}>Walker asignado</span>
              <input className={inputCls} placeholder="Nombre del walker" value={form.walkerName} onChange={(e) => setField("walkerName", e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}><span className={eyebrowCls}>Comuna</span>
              <input className={inputCls} placeholder="Ej: Providencia" value={form.comuna} onChange={(e) => setField("comuna", e.target.value)} /></label>
            <label className={labelCls}><span className={eyebrowCls}>Dirección</span>
              <input className={inputCls} placeholder="Ej: Av. Italia 123" value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} /></label>
          </div>
          <label className={labelCls}><span className={eyebrowCls}>AACC</span>
            <select className={inputCls} value={form.acuerdo} onChange={(e) => setField("acuerdo", e.target.value)}>
              {ACUERDOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select></label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setForm(emptyForm)} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none">Limpiar</button>
            <button type="button" onClick={handleSave} disabled={!form.nombre.trim()}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
              Guardar cuenta
            </button>
          </div>
          {manualAccounts.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
              <span className={eyebrowCls}>{manualAccounts.length} cuenta{manualAccounts.length > 1 ? "s" : ""} manual{manualAccounts.length > 1 ? "es" : ""}</span>
              {manualAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">{initials(acc.name)}</span>
                  <div className="flex-1">
                    <strong className="block text-[13px] font-semibold text-slate-900">{acc.name}</strong>
                    <span className="text-[11px] text-slate-500">{acc.segment} · {acc.district} · {acc.walkerName}</span>
                  </div>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">Manual</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </>)}

      </div>
    </div>
  );
}

function AccountSegmentSection({ localsData, walkers, onUpdateAccount }) {
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState({});
  // Local edits before saving: { [localId]: { segment, subcanal } }
  const [edits, setEdits] = useState({});

  const SEGMENTOS = ["Reserve", "Premium Core Gold", "Premium Core Silver", "Premium Core Bronze", "Mainstream"];
  const SUBCANALES = ["DINING", "DISCO", "BAR", "HOTEL", "RESTAURANT", "CAFE", "LATE NIGHT", "OTRO"];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return localsData;
    return localsData.filter((l) =>
      l.name?.toLowerCase().includes(q) ||
      l.district?.toLowerCase().includes(q) ||
      l.walkerName?.toLowerCase().includes(q)
    );
  }, [localsData, search]);

  function getEdit(local, field) {
    return edits[local.id]?.[field] ?? local[field] ?? "";
  }

  function setEdit(localId, field, value) {
    setEdits((prev) => ({ ...prev, [localId]: { ...(prev[localId] ?? {}), [field]: value } }));
  }

  function saveRow(localId) {
    if (!edits[localId]) return;
    onUpdateAccount?.(localId, edits[localId]);
    setSavedIds((prev) => ({ ...prev, [localId]: true }));
    setTimeout(() => setSavedIds((prev) => ({ ...prev, [localId]: false })), 2000);
  }

  function isDirty(local) {
    const e = edits[local.id];
    if (!e) return false;
    return (e.segment && e.segment !== local.segment) || (e.subcanal && e.subcanal !== local.subcanal);
  }

  const selectCls = "cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] focus:border-slate-900 focus:outline-none";

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">CP&A · Cartera</span>
          <h2 className="mt-1 text-[16px] font-bold text-slate-900">Segmento y tipo de outlet por cuenta</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Define el segmento y outlet de cada cuenta. Esto determina el portafolio de assortment que se le exige.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center self-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
          {localsData.length} cuentas
        </span>
      </div>

      <input
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        placeholder="Buscar por nombre, comuna o walker…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-slate-500">
          Sin resultados. Carga el Excel o agrega cuentas manuales primero.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid items-center gap-2 px-2.5" style={{ gridTemplateColumns: "1fr 160px 160px 72px" }}>
            {["Cuenta", "Segmento", "Outlet", ""].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</span>
            ))}
          </div>

          {filtered.map((local) => {
            const dirty = isDirty(local);
            const saved = savedIds[local.id];
            return (
              <div key={local.id} className={`grid items-center gap-2 rounded-lg border px-2.5 py-2 transition ${dirty ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}
                style={{ gridTemplateColumns: "1fr 160px 160px 72px" }}>
                <div className="min-w-0">
                  <strong className="block truncate text-[13px] font-semibold text-slate-900">{local.name}</strong>
                  <span className="text-[11px] text-slate-500">{local.district} · {local.walkerName}</span>
                </div>

                <select className={selectCls} value={getEdit(local, "segment")} onChange={(e) => setEdit(local.id, "segment", e.target.value)}>
                  <option value="">Sin segmento</option>
                  {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <select className={selectCls} value={getEdit(local, "subcanal")} onChange={(e) => setEdit(local.id, "subcanal", e.target.value)}>
                  <option value="">Sin outlet</option>
                  {SUBCANALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <button
                  type="button"
                  disabled={!dirty && !saved}
                  onClick={() => saveRow(local.id)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition focus:outline-none ${
                    saved ? "bg-emerald-600 text-white" : dirty ? "bg-slate-900 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-100 text-slate-400"
                  }`}
                >
                  {saved ? "✓" : "Guardar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function DevelopersSection({ developers = [], onRefresh }) {
  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
  const inputCls   = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";

  const [rows, setRows]     = useState({});
  const [saved, setSaved]   = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    const init = {};
    developers.forEach((d) => {
      init[d.id] = { firstName: d.first_name, lastName: d.last_name, phone: d.phone, email: d.email };
    });
    setRows(init);
  }, [developers]);

  function setField(id, key, value) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
    setSaved((prev) => ({ ...prev, [id]: false }));
  }

  async function handleSave(dev) {
    setSaving((prev) => ({ ...prev, [dev.id]: true }));
    try {
      await updateDeveloper(dev.id, rows[dev.id]);
      await onRefresh?.();
      setSaved((prev) => ({ ...prev, [dev.id]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [dev.id]: false })), 2000);
    } catch {
      // error silenciado — el usuario puede reintentar
    } finally {
      setSaving((prev) => ({ ...prev, [dev.id]: false }));
    }
  }

  const isDirty = (dev) => {
    const r = rows[dev.id];
    if (!r) return false;
    return r.firstName !== dev.first_name || r.lastName !== dev.last_name ||
           r.phone !== dev.phone || r.email !== dev.email;
  };

  return (
    <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <span className={eyebrowCls}>Andina · Equipo</span>
        <h2 className="mt-1 text-[16px] font-bold text-slate-900">Desarrolladores</h2>
        <p className="mt-0.5 text-[13px] text-slate-600">
          El código CL es fijo. Actualiza nombre, teléfono o correo cuando cambie el responsable.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {developers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <p className="text-[14px] text-slate-500">Cargando desarrolladores…</p>
          </div>
        )}
        {developers.map((dev) => {
          const r = rows[dev.id] ?? {};
          const isSaving = saving[dev.id];
          const isSaved  = saved[dev.id];
          const dirty    = isDirty(dev);
          return (
            <div key={dev.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[12px] font-bold text-white tracking-wide">
                  {dev.code}
                </span>
                <span className="text-[13px] font-semibold text-slate-700">
                  {dev.first_name} {dev.last_name}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["firstName", "Nombre"],
                  ["lastName",  "Apellido"],
                  ["phone",     "Teléfono"],
                  ["email",     "Correo"],
                ].map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className={eyebrowCls}>{label}</span>
                    <input
                      className={inputCls}
                      value={r[key] ?? ""}
                      onChange={(e) => setField(dev.id, key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSave(dev)}
                  disabled={isSaving}
                  className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition focus:outline-none disabled:opacity-40 ${
                    isSaved
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {isSaving ? "Guardando…" : isSaved ? "✓ Guardado" : "Guardar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function UserRolesSection({ teamProfiles = [], routes = [], onRefresh }) {
  const [showForm, setShowForm]       = useState(false);
  const [formRole, setFormRole]       = useState("walker");
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");
  const [copiedId, setCopiedId]       = useState(null);
  const [changingRole, setChangingRole] = useState(null);

  const emptyForm = { fullName: "", rut: "", phone: "", email: "", password: "", ruta: "" };
  const [form, setForm] = useState(emptyForm);

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
  const labelCls = "flex flex-col gap-1.5";
  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  const walkerList  = teamProfiles.filter((p) => p.role === "walker");
  const managerList = teamProfiles.filter((p) => p.role === "manager");

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  async function handleCreate() {
    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError("Nombre y email son obligatorios.");
      return;
    }
    const password = form.password.trim() || generatePassword();
    setSaving(true);
    setFormError("");
    try {
      await createUserFromAdmin({
        email: form.email.trim(),
        password,
        role: formRole,
        fullName: form.fullName.trim(),
        rut: form.rut.trim(),
        phone: form.phone.trim(),
        ruta: formRole === "walker" ? form.ruta : "",
        walkerName: formRole === "walker" ? form.fullName.trim() : "",
      });
      await onRefresh?.();
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message ?? "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  function copyInfo(w) {
    const lines = [`Acceso BARRA On Trade`, `Nombre: ${w.full_name}`, `Rol: ${w.role === "manager" ? "OT Manager" : "Walker"}`];
    if (w.phone) lines.push(`Teléfono: ${w.phone}`);
    if (w.ruta) lines.push(`Ruta: ${w.ruta}`);
    lines.push(`Ingresa con tu email en barra-ontrade.vercel.app`);
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(w.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const ROLE_LABELS = { walker: "Walker", manager: "OT Manager" };
  const ROLE_COLORS = { walker: "bg-blue-50 text-blue-700", manager: "bg-violet-50 text-violet-700" };

  async function handleRoleChange(w) {
    const newRole = w.role === "walker" ? "manager" : "walker";
    setChangingRole(w.id);
    try {
      await updateUserRole(w.id, newRole);
      await onRefresh?.();
    } catch {
      // silently ignore — user stays as is
    } finally {
      setChangingRole(null);
    }
  }

  function renderCard(w) {
    const isChanging = changingRole === w.id;
    const toggleLabel = w.role === "walker" ? "→ OT Manager" : "→ Walker";
    return (
      <div
        key={w.id}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
      >
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white">
            {(w.full_name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div>
            <strong className="block text-[14px] font-semibold text-slate-900">{w.full_name}</strong>
            <span className="text-[12px] text-slate-500">{w.ruta || (w.role === "walker" ? "Sin ruta" : "Vista global")}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-center">
          {w.phone && <span className="text-[12px] text-slate-500">{w.phone}</span>}
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ROLE_COLORS[w.role] ?? "bg-slate-100 text-slate-600"}`}>
            {ROLE_LABELS[w.role] ?? w.role}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Acceso activo
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => handleRoleChange(w)}
            disabled={isChanging}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none disabled:opacity-50"
          >
            {isChanging ? "Cambiando…" : toggleLabel}
          </button>
          <button
            type="button"
            onClick={() => copyInfo(w)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none"
          >
            {copiedId === w.id ? "✓ Copiado" : "Copiar info"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <span className={eyebrowCls}>CP&A · Administración</span>
        <h2 className="mt-1 text-[16px] font-bold text-slate-900">Equipo — Acceso al portal</h2>
        <p className="mt-0.5 text-[13px] text-slate-600">
          Crea cuentas para walkers y managers. Cada usuario ingresa con su email y contraseña.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <strong className="text-[14px] font-semibold text-slate-900">Equipo</strong>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {teamProfiles.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            className="rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none"
          >
            + Agregar usuario
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <strong className="mb-3 block text-[13px] font-semibold text-slate-900">Nuevo usuario</strong>
            {formError && (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{formError}</p>
            )}

            <div className="mb-3 flex gap-2">
              {[["walker", "Walker"], ["manager", "OT Manager"]].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFormRole(val)}
                  className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition focus:outline-none ${
                    formRole === val
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["fullName", "Nombre completo", "text",     "Juan Pérez"],
                ["phone",    "Teléfono",        "text",     "+56 9 1234 5678"],
                ["email",    "Email de acceso", "email",    "juan@diageo.com"],
                ["password", "Contraseña (vacío = auto)", "password", "mínimo 8 caracteres"],
              ].map(([k, l, t, ph]) => (
                <label key={k} className={labelCls}>
                  <span className={eyebrowCls}>{l}</span>
                  <input
                    className={inputCls}
                    placeholder={ph}
                    value={form[k]}
                    type={t}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  />
                </label>
              ))}
              {formRole === "walker" && (
                <label className={labelCls}>
                  <span className={eyebrowCls}>Ruta asignada</span>
                  <select
                    className={inputCls}
                    value={form.ruta}
                    onChange={(e) => setForm((f) => ({ ...f, ruta: e.target.value }))}
                  >
                    <option value="">Sin ruta asignada</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] hover:bg-slate-50 focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 focus:outline-none disabled:opacity-60"
              >
                {saving ? "Creando…" : `Crear ${formRole === "manager" ? "Manager" : "Walker"}`}
              </button>
            </div>
          </div>
        )}

        {managerList.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="mt-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Managers</span>
            {managerList.map(renderCard)}
          </div>
        )}

        {walkerList.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="mt-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Walkers</span>
            {walkerList.map(renderCard)}
          </div>
        )}

        {teamProfiles.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <p className="text-[14px] text-slate-500">No hay usuarios registrados. Agrega el primero.</p>
          </div>
        )}
      </div>
    </article>
  );
}

function RoutesSection({ routes = [], localsData = [], setLocalsData, walkerProfiles = [], onRefresh, onAssignWalkerToRoute }) {
  const [newName, setNewName]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [search, setSearch]               = useState("");
  const [savedRoutes, setSavedRoutes]     = useState({});
  const [assigningWalker, setAssigningWalker] = useState({});
  const [batchSaving, setBatchSaving]     = useState({});
  const [globalSaving, setGlobalSaving]   = useState(false);
  const [globalSaved, setGlobalSaved]     = useState(false);

  const inputCls   = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";
  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  const localsByRoute = useMemo(() => {
    const map = {};
    for (const r of routes) map[r.name] = localsData.filter((l) => l.ruta === r.name);
    return map;
  }, [routes, localsData]);

  const searchResults = useMemo(() => {
    if (!search.trim() || !expandedRoute) return [];
    const q = search.toLowerCase();
    return localsData
      .filter((l) => l.ruta !== expandedRoute)
      .filter((l) =>
        (l.name ?? "").toLowerCase().includes(q) ||
        (l.district ?? "").toLowerCase().includes(q) ||
        (l.address ?? "").toLowerCase().includes(q) ||
        (l.accountCode ?? "").toLowerCase().includes(q) ||
        (l.segment ?? "").toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [search, localsData, expandedRoute]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addRoute(newName.trim());
      setNewName("");
      await onRefresh?.();
    } catch (err) {
      setError(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteRoute(id);
      await onRefresh?.();
    } catch (err) {
      setError(err.message ?? "Error al eliminar");
    }
  }

  function flashSaved(routeName) {
    setSavedRoutes((prev) => ({ ...prev, [routeName]: true }));
    setTimeout(() => setSavedRoutes((prev) => ({ ...prev, [routeName]: false })), 2000);
  }

  function handleRouteError(err) {
    const msg = err.message ?? "";
    setError(msg.includes("ruta") || msg.includes("column")
      ? "Columna 'ruta' no existe. Ejecuta en Supabase SQL Editor: ALTER TABLE locals ADD COLUMN IF NOT EXISTS ruta text default '';"
      : msg || "Error de Supabase");
  }

  function assignToRoute(localId, routeName) {
    setLocalsData((prev) => prev.map((l) => l.id === localId ? { ...l, ruta: routeName } : l));
    updateLocalRoute(localId, routeName)
      .then(() => flashSaved(routeName))
      .catch(handleRouteError);
    setSearch("");
  }

  function removeFromRoute(localId, routeName) {
    setLocalsData((prev) => prev.map((l) => l.id === localId ? { ...l, ruta: "" } : l));
    updateLocalRoute(localId, "")
      .then(() => flashSaved(routeName))
      .catch(handleRouteError);
  }

  async function batchSaveRoute(routeName, accounts) {
    setBatchSaving((prev) => ({ ...prev, [routeName]: true }));
    setError("");
    try {
      await Promise.all(accounts.map((l) => updateLocalRoute(l.id, routeName)));
      flashSaved(routeName);
    } catch (err) {
      const msg = err.message ?? "";
      setError(msg.includes("ruta") || msg.includes("column")
        ? "Columna 'ruta' no existe en Supabase. Corre: ALTER TABLE locals ADD COLUMN IF NOT EXISTS ruta text default '';"
        : msg || "Error al guardar asignaciones");
    } finally {
      setBatchSaving((prev) => ({ ...prev, [routeName]: false }));
    }
  }

  async function saveAllAssignments() {
    const withRuta = localsData.filter((l) => l.ruta);
    if (!withRuta.length) return;
    setGlobalSaving(true);
    setError("");
    try {
      await Promise.all(withRuta.map((l) => updateLocalRoute(l.id, l.ruta)));
      setGlobalSaved(true);
      setTimeout(() => setGlobalSaved(false), 3000);
    } catch (err) {
      const msg = err.message ?? "";
      setError(msg.includes("ruta") || msg.includes("column")
        ? "Columna 'ruta' no existe. Ejecuta en Supabase SQL Editor: ALTER TABLE locals ADD COLUMN IF NOT EXISTS ruta text default '';"
        : msg || "Error al guardar asignaciones");
    } finally {
      setGlobalSaving(false);
    }
  }

  async function handleAssignWalker(routeName, userId) {
    setAssigningWalker((prev) => ({ ...prev, [routeName]: true }));
    try {
      await onAssignWalkerToRoute?.(userId || null, userId ? routeName : "");
      flashSaved(routeName);
    } catch {}
    finally { setAssigningWalker((prev) => ({ ...prev, [routeName]: false })); }
  }

  return (
    <article className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={eyebrowCls}>CP&A · Configuración</span>
          <h2 className="mt-1 text-[16px] font-bold text-slate-900">Rutas del equipo</h2>
          <p className="mt-0.5 text-[13px] text-slate-600">
            Define las rutas y asigna cuentas. Después haz click en{" "}
            <strong>Guardar asignaciones</strong> para que los walkers las vean.
          </p>
        </div>
        {localsData.some((l) => l.ruta) && (
          <button
            type="button"
            disabled={globalSaving}
            onClick={saveAllAssignments}
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
          >
            {globalSaving ? "Guardando…" : globalSaved ? "✓ Guardado" : `Guardar ${localsData.filter((l) => l.ruta).length} asignaciones`}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="Nombre de la ruta, ej: Ruta Norte"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 focus:outline-none disabled:opacity-50"
        >
          {saving ? "…" : "Agregar"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-[12px] font-semibold text-rose-700">Error</p>
          <p className="mt-0.5 font-mono text-[11px] text-rose-600 break-all">{error}</p>
          <button type="button" onClick={() => setError("")} className="mt-1 text-[11px] text-rose-500 underline">Cerrar</button>
        </div>
      )}

      {routes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
          <p className="text-[14px] text-slate-500">No hay rutas. Agrega la primera arriba.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((r) => {
            const assigned = localsByRoute[r.name] ?? [];
            const isExpanded = expandedRoute === r.name;
            const isSaved = savedRoutes[r.name];
            const assignedWalker = walkerProfiles.find((w) => w.ruta === r.name);

            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50">
                {/* ── Header siempre visible ── */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-slate-900">{r.name}</span>
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {assigned.length} cuentas
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        className="rounded-lg px-2 py-1 text-[12px] text-rose-500 hover:bg-rose-50 hover:text-rose-700 focus:outline-none"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Walker siempre visible */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 shrink-0 w-14">Walker</span>
                    <select
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none"
                      value={assignedWalker?.id ?? ""}
                      disabled={assigningWalker[r.name]}
                      onChange={(e) => handleAssignWalker(r.name, e.target.value)}
                    >
                      <option value="">Sin walker asignado</option>
                      {walkerProfiles.map((w) => (
                        <option key={w.id} value={w.id}>{w.full_name}</option>
                      ))}
                    </select>
                    {isSaved
                      ? <span className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">✓ Guardado</span>
                      : assigningWalker[r.name]
                      ? <span className="shrink-0 text-[12px] text-slate-400">Guardando…</span>
                      : null}
                  </div>

                  {/* Expandir para gestionar cuentas */}
                  <button
                    type="button"
                    onClick={() => { setExpandedRoute(isExpanded ? null : r.name); setSearch(""); }}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 focus:outline-none"
                  >
                    <span>{isExpanded ? "Cerrar cuentas" : `Gestionar cuentas (${assigned.length})`}</span>
                    <span className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-white p-4">

                    <div className="relative">
                      <input
                        className={inputCls}
                        placeholder="Buscar cuenta por nombre, comuna, segmento..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                          {searchResults.map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => assignToRoute(l.id, r.name)}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-slate-50"
                            >
                              <div>
                                <strong className="block text-[13px] font-semibold text-slate-900">{l.name}</strong>
                                <span className="text-[11px] text-slate-500">
                                  {[l.district, l.segment, l.subchannel].filter(Boolean).join(" · ")}
                                  {l.ruta ? ` — ${l.ruta}` : ""}
                                </span>
                              </div>
                              <span className="shrink-0 text-[11px] font-semibold text-emerald-600">+ Agregar</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {search.trim() && searchResults.length === 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-lg">
                          <p className="text-[13px] text-slate-500">No se encontraron cuentas para "{search}"</p>
                        </div>
                      )}
                    </div>

                    {assigned.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-1">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Cuentas en esta ruta
                          </span>
                          <button
                            type="button"
                            disabled={batchSaving[r.name]}
                            onClick={() => batchSaveRoute(r.name, assigned)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-slate-800 focus:outline-none disabled:opacity-50"
                          >
                            {batchSaving[r.name] ? "Guardando…" : `Guardar ${assigned.length} asignaciones`}
                          </button>
                        </div>
                        {assigned.map((l) => (
                          <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                            <div>
                              <strong className="text-[13px] font-medium text-slate-900">{l.name}</strong>
                              <span className="ml-2 text-[11px] text-slate-400">
                                {[l.district, l.segment].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromRoute(l.id, r.name)}
                              className="shrink-0 rounded px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-50 focus:outline-none"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-center text-[13px] text-slate-400">
                        Sin cuentas asignadas. Usa el buscador para agregar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function BulkLocalsUploadSection({ walkerProfiles = [], localsData = [], setLocalsData }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const eyebrowCls = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
  const thCls = "border-b border-slate-200 bg-slate-50 p-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500";
  const tdCls = "border-b border-slate-100 p-2.5 text-[13px]";

  const SEGMENTOS = ["PREMIUM CORE", "RESERVE", "MAINSTREAM", "TRENDSETTER", "NIGHTLIFE"];
  const SUBCANALES = ["DINING", "BAR", "DISCO", "HOTEL", "RESTAURANT", "CAFE", "LATE NIGHT", "OTRO"];

  function parseCsvToRows(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).filter((l) => l.trim()).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
  }

  function buildLocalsFromRows(rows) {
    return rows.map((row, idx) => {
      const walkerName = row.walker || row.walker_asignado || "Sin asignar";
      return buildManualLocal({
        nombre: row.nombre || row.name || `Local ${idx + 1}`,
        razonSocial: row.razon_social || row.nombre || "",
        direccion: row.direccion || row.direccion || "",
        comuna: row.comuna || "",
        region: row.region || "07. Metropolitana",
        segmento: (SEGMENTOS.find((s) => s === (row.segmento || "").toUpperCase())) || "PREMIUM CORE",
        subcanal: (SUBCANALES.find((s) => s === (row.subcanal || "").toUpperCase())) || "BAR",
        walkerName,
        acuerdo: row.acuerdo || "Sin AACC",
        accountCode: row.codigo || row.account_code || `BULK-${Date.now()}-${idx}`,
        skus: "",
        observacion: row.observacion || "",
        menuUrl: "",
        fechaTermino: "",
      });
    });
  }

  function handleFileRead(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvText(text);
      const rows = parseCsvToRows(text);
      setPreview(rows);
      setSaved(false);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleFileInput(e) {
    handleFileRead(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) handleFileRead(file);
  }

  function handleImport() {
    if (!preview?.length) return;
    const newLocals = buildLocalsFromRows(preview);
    setLocalsData?.((prev) => {
      const existingCodes = new Set(prev.map((l) => l.accountCode));
      const toAdd = newLocals.filter((l) => !existingCodes.has(l.accountCode));
      return [...prev, ...toAdd];
    });
    setSaved(true);
    setPreview(null);
    setCsvText("");
  }

  function downloadTemplate() {
    const walkerNames = walkerProfiles.map((w) => w.full_name).join(" / ") || "Nombre Walker";
    const header = "nombre,razon_social,direccion,comuna,region,segmento,subcanal,walker,acuerdo,codigo,observacion";
    const walkerEjemplo1 = walkerProfiles[0]?.full_name ?? "Nombre Walker 1";
    const walkerEjemplo2 = walkerProfiles[1]?.full_name ?? "Nombre Walker 2";
    const example1 = `Bar Ejemplo,Razón Social SpA,Av. Ejemplo 1234,Providencia,07. Metropolitana,PREMIUM CORE,BAR,${walkerEjemplo1},Sin AACC,PDV-001,`;
    const example2 = `Club Ejemplo,Club SpA,Calle Ejemplo 45,Santiago,07. Metropolitana,NIGHTLIFE,DISCO,${walkerEjemplo2},Diageo,PDV-002,Observación opcional`;
    const csv = [header, example1, example2].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_locales_barra.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className={eyebrowCls}>CP&A · Carga masiva</span>
            <h2 className="mt-1 text-[16px] font-bold text-slate-900">Importar locales por CSV</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Carga múltiples locales de una vez asignándolos a un Walker. Usa la plantilla para asegurarte del formato correcto.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none"
          >
            Descargar plantilla CSV
          </button>
        </div>

        {/* Drop zone */}
        <label
          className={`cursor-pointer`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-6 transition ${
            dragOver ? "border-slate-900 bg-slate-50" : preview ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
          }`}>
            <span className="shrink-0 text-3xl">{preview ? "✅" : "📋"}</span>
            <div>
              <strong className={`block text-[14px] font-semibold ${preview ? "text-emerald-700" : "text-slate-900"}`}>
                {preview ? `${preview.length} locales listos para importar` : "Arrastra el CSV o haz click para seleccionar"}
              </strong>
              <small className="text-[11px] text-slate-500">
                {preview ? "Revisa la vista previa abajo antes de confirmar" : "Formato .csv — columnas: nombre, dirección, walker, segmento, etc."}
              </small>
            </div>
          </div>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </label>

        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
            ✓ Locales importados correctamente a la cartera
          </div>
        )}
      </article>

      {/* Walkers en sistema */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-[14px] font-semibold text-slate-900">Walkers registrados (asignar en el CSV)</h3>
        {walkerProfiles.length === 0 ? (
          <p className="text-[13px] text-slate-500">Agrega walkers en la sección "Walkers" primero.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {walkerProfiles.map((w) => (
              <div key={w.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                <span className="text-[13px] font-medium text-slate-900">{w.full_name}</span>
                {w.ruta && <span className="text-[11px] text-slate-400">— {w.ruta}</span>}
              </div>
            ))}
          </div>
        )}
      </article>

      {/* Preview table */}
      {preview?.length > 0 && (
        <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Vista previa — {preview.length} locales</h3>
              <p className="text-[12px] text-slate-500">Verifica que los datos sean correctos antes de importar.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreview(null); setCsvText(""); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] hover:bg-slate-50 focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 focus:outline-none"
              >
                Confirmar importación
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  {["Nombre", "Walker", "Segmento", "Subcanal", "Comuna", "Código"].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row, i) => (
                  <tr key={i} className="last:border-b-0">
                    <td className={`${tdCls} font-medium text-slate-900`}>{row.nombre || row.name || "—"}</td>
                    <td className={tdCls}>{row.walker || row.walker_asignado || "—"}</td>
                    <td className={tdCls}>{(row.segmento || "").toUpperCase() || "—"}</td>
                    <td className={tdCls}>{(row.subcanal || "").toUpperCase() || "—"}</td>
                    <td className={tdCls}>{row.comuna || "—"}</td>
                    <td className={tdCls}>{row.codigo || row.account_code || "—"}</td>
                  </tr>
                ))}
                {preview.length > 20 && (
                  <tr>
                    <td colSpan={6} className="p-2.5 text-center text-[12px] text-slate-400">
                      … y {preview.length - 20} locales más
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </div>
  );
}

const DEFAULT_ON_FIVE_WEIGHTS = {
  staff:      { label: "Staff",      weight: 20 },
  assortment: { label: "Assortment", weight: 25 },
  menu:       { label: "Menú",       weight: 25 },
  branding:   { label: "Branding",   weight: 15 },
  activation: { label: "Activation", weight: 15 },
};

function OnFiveWeightsSection() {
  const [weights, setWeights] = useState(DEFAULT_ON_FIVE_WEIGHTS);
  const [justSaved, setJustSaved] = useState(false);
  const total = Object.values(weights).reduce((s, v) => s + Number(v.weight), 0);
  const valid = total === 100;

  function save() {
    if (!valid) return;
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">CP&A · Configuración</span>
        <h2 className="mt-1 text-[16px] font-bold text-slate-900">Pesos ponderados On Five Score</h2>
        <p className="mt-0.5 text-[13px] text-slate-600">
          Define qué porcentaje aporta cada pilar al Health Score final de cada cuenta. Deben sumar exactamente 100%.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(weights).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{val.label}</label>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              <input
                type="number" min="0" max="100" value={val.weight}
                onChange={(e) => setWeights((prev) => ({ ...prev, [key]: { ...prev[key], weight: Number(e.target.value) } }))}
                className="w-full bg-transparent px-2.5 py-2 text-center text-[14px] font-bold text-slate-900 focus:outline-none"
              />
              <span className="border-l border-slate-200 bg-slate-50 px-2.5 py-2 text-[13px] text-slate-500">%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${val.weight}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[13px] font-semibold ${valid ? "text-emerald-600" : "text-rose-600"}`}>
          Total: {total}% {valid ? "✓ OK" : `— faltan ${100 - total}%`}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!valid}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {justSaved ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>
    </article>
  );
}

function AssortmentConfigSection({ assortmentConfig, onSave }) {
  const [localConfig, setLocalConfig] = useState(() => ({ ...DEFAULT_ASSORTMENT_CONFIG, ...assortmentConfig }));
  const [activeOutlet,  setActiveOutlet]  = useState(OT_OUTLET_TYPES[0]);
  const [activeSegment, setActiveSegment] = useState(OT_SEGMENT_TYPES[0]);
  const [justSaved, setJustSaved] = useState(false);

  const activeKey = assortmentKey(activeOutlet, activeSegment);
  const activeIds = localConfig[activeKey] ?? [];

  function toggleLabel(labelId) {
    setLocalConfig((prev) => {
      const current = prev[activeKey] ?? [];
      const next = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
      return { ...prev, [activeKey]: next };
    });
  }

  function handleSave() {
    onSave?.(localConfig);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const byCategory = OT_LABELS.reduce((acc, l) => {
    (acc[l.category] = acc[l.category] ?? []).push(l);
    return acc;
  }, {});

  return (
    <article className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">CP&A · Assortment</span>
          <h2 className="mt-1 text-[16px] font-bold text-slate-900">Portafolio objetivo por tipo de local</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">
            Define qué etiquetas debe tener cada combinación de outlet y segmento. El Walker las audita en terreno.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="shrink-0 self-center rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none"
        >
          {justSaved ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>

      {/* Selector 2 niveles: Outlet × Segmento */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Outlet</span>
          <div className="flex flex-wrap gap-2">
            {OT_OUTLET_TYPES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setActiveOutlet(o)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition focus:outline-none ${
                  activeOutlet === o
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Segmento</span>
          <div className="flex flex-wrap gap-2">
            {OT_SEGMENT_TYPES.map((s) => {
              const k = assortmentKey(activeOutlet, s);
              const count = (localConfig[k] ?? []).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSegment(s)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] transition focus:outline-none ${
                    activeSegment === s
                      ? "bg-slate-900 font-semibold text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {s} <span className="font-normal opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-500">
            Perfil activo:
          </span>
          <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            {activeOutlet} · {activeSegment}
          </span>
          <span className="text-[11px] text-slate-500">
            — {activeIds.length} etiquetas requeridas
          </span>
        </div>
      </div>

      {/* Checkboxes de etiquetas */}
      <div className="flex flex-col gap-4">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{cat}</p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {items.map((item) => {
                const active = activeIds.includes(item.id);
                return (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition ${active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={active} onChange={() => toggleLabel(item.id)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900" />
                    <span className={active ? "font-semibold text-emerald-700" : "text-slate-700"}>{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Innovaciones <span className="font-normal normal-case text-slate-400">— siempre presentes, solo informativas</span>
          </p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {OT_INNOVATIONS.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 opacity-60">
                <span className="h-4 w-4 shrink-0 rounded border border-dashed border-slate-300" />
                <span className="text-[13px] text-slate-600">{item.name}</span>
                <span className="ml-auto inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500">Innov.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function round(value) {
  return Math.round(value * 10) / 10;
}

// ── Recalcula health score a partir de los pilares actuales ──
function calcHealthScore(pillars, hasAacc = false) {
  const scoreMap = { "Fuerte": 100, "Completo": 100, "Bueno": 80, "En curso": 75,
    "Atencion": 55, "Oportunidad": 55, "No aplica": 70, "Pendiente": 30 };
  const keys = ["staff", "assortment", "menu", "branding", "activation"];
  let total = 0;
  for (const k of keys) {
    const s = pillars[k]?.score ?? "Pendiente";
    total += scoreMap[s] ?? 40;
  }
  const base = Math.round(total / keys.length);
  return hasAacc ? Math.min(100, base + 5) : base;
}

// ── Construye un local desde un form manual ──
function buildManualLocal({ nombre, razonSocial, segmento, subcanal, comuna, region, direccion,
  walkerName, acuerdo, fechaTermino, skus, observacion, menuUrl, accountCode }) {
  const id = `MANUAL-${Date.now()}-${nombre.replace(/\s+/g, "").slice(0, 8).toUpperCase()}`;
  const hasAacc = Boolean(acuerdo && acuerdo !== "Sin AACC");
  const emptyPillar = (label) => ({ score: "Pendiente", summary: `${label} por completar`, nextAction: "Auditar en primera visita", details: [], records: [] });
  return {
    id,
    accountCode: accountCode || id.slice(-8),
    walkerName,
    sheetName: "MANUAL",
    legalName: razonSocial || nombre,
    name: nombre,
    distributor: "",
    region: region || "07. Metropolitana",
    office: "",
    district: comuna,
    channel: "On Trade",
    segment: segmento,
    subchannel: subcanal,
    address: direccion,
    developer: walkerName,
    skus: skus || "",
    agreement: acuerdo || "Sin AACC",
    agreementEndDate: fechaTermino || "Sin registro",
    menuUrl: menuUrl || "",
    observation: observacion || "",
    occasion: subcanal || segmento,
    healthScore: 40,
    hasAacc,
    investment: 0,
    tags: [segmento, subcanal].filter(Boolean),
    contacts: [{ id: "dev", name: walkerName, role: "Desarrollador Sell Out", note: "", phone: "" }],
    kpis: [
      { label: "Cod. cliente", value: accountCode || "Manual", note: "ingresado manual" },
      { label: "Segmento", value: segmento, note: subcanal },
      { label: "Acuerdo", value: acuerdo || "Sin AACC", note: `Termino: ${fechaTermino || "Sin registro"}` },
      { label: "SKUs", value: skus ? skus.split(",").length : 0, note: "declarados" },
    ],
    monthlySales: [],
    missions: [
      { id: `m-${id}-1`, title: "Primera visita de terreno", origin: "Sistema", status: "Pendiente", progress: 0,
        impact: "Activar cuenta nueva", nextStep: "Agendar visita", reason: "Cuenta recién creada. Registrar contactos y auditar On Five." },
    ],
    pillars: {
      staff:      emptyPillar("Staff"),
      assortment: emptyPillar("Assortment"),
      menu:       emptyPillar("Menu"),
      branding:   emptyPillar("Branding"),
      activation: emptyPillar("Activation"),
    },
    isManual: true,
  };
}

export default OnTradeCrm;
