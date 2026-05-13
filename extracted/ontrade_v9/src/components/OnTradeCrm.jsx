import React, { useMemo, useState } from "react";
import { parseOnFiveWorkbook, summarizeOnFiveLocals } from "../utils/onFiveExcelParser.js";
import { MAESTRO_LOCALS, MAESTRO_WALKERS, MAESTRO_META } from "../data/maestroCuentas.js";
import { useLocalStorage } from "../utils/useLocalStorage.js";

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
const OT_SEGMENTS = ["Reserve", "Premium Core Gold", "Premium Core Silver", "Premium Core Bronze", "Mainstream"];

// ── Assortment por defecto — CP&A puede editarlo en Configuración ─
const DEFAULT_ASSORTMENT_CONFIG = {
  "Reserve":              ["dj1942","dj70","djrep","djanejo","djblanco","jwblack","jwgold","jwblue","tqlon","tqbossa","tqsevilla","gordons"],
  "Premium Core Gold":    ["djrep","djblanco","jwblack","jwdblack","jwgold","tqlon","tqsevilla","tqbossa","gordons","smirnoff"],
  "Premium Core Silver":  ["djblanco","jwblack","jwred","tqlon","tqsevilla","gordons","smirnoff"],
  "Premium Core Bronze":  ["djblanco","jwblack","jwred","tqlon","gordons","smirnoff"],
  "Mainstream":           ["jwred","jwblack","tqlon","gordons","smirnoff"],
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

// ── Helpers de persistencia de pillars ────────────────────────────

function getStoredOverrides(key) {
  try {
    const s = localStorage.getItem(key);
    return s !== null ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function applyPillarOverrides(locals, overrides) {
  return locals.map((local) => {
    const localOverrides = overrides[local.id];
    if (!localOverrides) return local;
    const mergedPillars = { ...local.pillars };
    for (const [key, data] of Object.entries(localOverrides)) {
      mergedPillars[key] = { ...(local.pillars[key] ?? {}), ...data };
    }
    return { ...local, pillars: mergedPillars };
  });
}

function labelForRegisterType(key) {
  return STAFF_REGISTER_TYPES.find((t) => t.key === key)?.label ?? "Registro Staff";
}

// ──────────────────────────────────────────────────────────────────

function OnTradeCrm({ onOpenModule }) {
  const [roleId, setRoleId] = useState("walker");
  const [activeView, setActiveView] = useState("dashboard");
  const [rawLocalsData, setRawLocalsData] = useState(MAESTRO_LOCALS);
  const [pillarOverrides, setPillarOverrides] = useLocalStorage("barra_pillarOverrides", {});
  const localsData = useMemo(
    () => applyPillarOverrides(rawLocalsData, pillarOverrides),
    [rawLocalsData, pillarOverrides],
  );
  const [walkers, setWalkers] = useState(MAESTRO_WALKERS);
  const [activeWalker, setActiveWalker] = useState("all");
  const [excelMeta, setExcelMeta] = useState(MAESTRO_META);
  const [excelError, setExcelError] = useState("");
  const [selectedLocalId, setSelectedLocalId] = useState(MAESTRO_LOCALS[0]?.id ?? null);
  const [kanbanColumns, setKanbanColumns] = useState(() => {
    const initOverrides = getStoredOverrides("barra_pillarOverrides");
    const initLocals = applyPillarOverrides(MAESTRO_LOCALS, initOverrides);
    return [
      { id: "todo",     title: "Pendiente",   cards: buildKanbanFromLocals(initLocals) },
      { id: "progress", title: "En progreso", cards: [] },
      { id: "done",     title: "Completado",  cards: [] },
    ];
  });
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [extraNotes, setExtraNotes] = useLocalStorage("barra_extraNotes", {});
  const [extraContacts, setExtraContacts] = useLocalStorage("barra_extraContacts", {});
  const [activeOnFiveModule, setActiveOnFiveModule] = useState("staff");
  const [assortmentConfig, setAssortmentConfig] = useState(DEFAULT_ASSORTMENT_CONFIG);
  const [assortmentAudits, setAssortmentAudits] = useLocalStorage("barra_assortmentAudits", {});

  const role = CRM_ROLES.find((item) => item.id === roleId) ?? CRM_ROLES[0];

  // ── Actualiza un pilar real de una cuenta y lo persiste en localStorage ──
  function updateLocalPillar(localId, pillarKey, pillarData) {
    setPillarOverrides((prev) => ({
      ...prev,
      [localId]: {
        ...(prev[localId] ?? {}),
        [pillarKey]: {
          ...(prev[localId]?.[pillarKey] ?? {}),
          ...pillarData,
        },
      },
    }));
  }

  // ── Guarda una auditoría de assortment en terreno ──
  function saveAssortmentAudit(localId, checkedIds, author, segmentIds) {
    const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
    const total = segmentIds.length;
    const present = checkedIds.filter((id) => segmentIds.includes(id)).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    const score = total === 0 ? "Sin registro" : present === total ? "Completado" : present > 0 ? "Pendiente" : "Sin registro";
    setAssortmentAudits((prev) => ({
      ...prev,
      [localId]: { checkedIds, savedAt: ts, author, present, total, pct },
    }));
    updateLocalPillar(localId, "assortment", {
      score,
      summary: total > 0 ? `${present}/${total} etiquetas · ${pct}% cumplimiento` : "Sin portafolio configurado",
      nextAction: present < total ? `Recuperar ${total - present} etiqueta${total - present > 1 ? "s" : ""}` : "Defender foto de éxito",
      lastAudit: ts,
    });
  }

  // ── Agrega una cuenta manual creada desde Config CP&A ──
  function addManualLocal(newLocal) {
    setRawLocalsData((current) => [newLocal, ...current]);
  }

  // Cuentas filtradas por Walker activo (columna WALKER del Excel)
  const visibleLocals = useMemo(() =>
    activeWalker === "all" ? localsData : localsData.filter((l) => l.walkerName === activeWalker),
    [localsData, activeWalker]
  );

  const selectedLocal = visibleLocals.find((item) => item.id === selectedLocalId) ?? visibleLocals[0] ?? null;
  const localNotes = selectedLocal ? [...(extraNotes[selectedLocal.id] ?? []), ...(selectedLocal.notes ?? [])] : [];
  const dashboardSummary = useMemo(() => summarizeOnFiveLocals(visibleLocals), [visibleLocals]);

  async function handleOnFiveWorkbookUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setExcelError("");
    try {
      const result = await parseOnFiveWorkbook(file);
      setRawLocalsData(result.locals);
      setWalkers(result.walkers);
      setActiveWalker("all");
      setSelectedLocalId(result.locals[0]?.id ?? null);
      setExcelMeta({ fileName: result.fileName, count: result.locals.length, walkerCount: result.walkers.length });
      setKanbanColumns([
        { id: "todo",     title: "Pendiente",   cards: buildKanbanFromLocals(result.locals) },
        { id: "progress", title: "En progreso", cards: [] },
        { id: "done",     title: "Completado",  cards: [] },
      ]);
      setActiveView("dashboard");
    } catch (error) {
      setExcelError(error.message || "No pude leer el Excel. Verifica que tenga la columna CLIENTE ID.");
    } finally {
      event.target.value = "";
    }
  }

  function handleRoleChange(nextRoleId) {
    setRoleId(nextRoleId);
    setActiveView("contacts");
  }

  function moveCard(targetColumnId) {
    if (!draggedCardId) {
      return;
    }

    setKanbanColumns((currentColumns) => {
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

    if (!noteText) {
      return;
    }

    const note = {
      id: `note-${Date.now()}`,
      author: role.name,
      date: "Ahora",
      nextAction: "Definir siguiente paso desde el playbook.",
      text: noteText,
      type: "Minuta",
    };

    setExtraNotes((current) => ({
      ...current,
      [selectedLocal.id]: [note, ...(current[selectedLocal.id] ?? [])],
    }));
    setDraftNote("");
  }

  return (
    <section className="crm-shell" aria-label="BARRA · On Trade Execution">
      <header className="crm-topbar">
        <div className="crm-brand">
          <span className="crm-brand__mark">🪩</span>
          <div>
            <strong>BARRA</strong>
            <small>On Trade Execution · Diageo Chile</small>
          </div>
        </div>

        <div className="crm-role-switcher" aria-label="Selector de rol">
          {CRM_ROLES.map((item) => (
            <button
              key={item.id}
              className={roleId === item.id ? "crm-role-button crm-role-button--active" : "crm-role-button"}
              type="button"
              onClick={() => handleRoleChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="crm-layout">
        <aside className="crm-sidebar">
          <div className="crm-user-card">
            <span>{role.label}</span>
            <strong>{role.name}</strong>
            <small>{excelMeta ? `${excelMeta.count} cuentas · ${excelMeta.walkerCount} walkers` : role.subtitle}</small>
          </div>

          {/* Walker filter — solo visible para Walker cuando hay datos cargados */}
          {roleId === "walker" && walkers.length > 0 ? (
            <div className="crm-sidebar__section">
              <span>Walker</span>
              <button
                className={activeWalker === "all" ? "crm-nav__item crm-nav__item--active" : "crm-nav__item"}
                type="button"
                onClick={() => setActiveWalker("all")}
              >
                Todos ({localsData.length})
              </button>
              {walkers.map((w) => (
                <button
                  key={w.id}
                  className={activeWalker === w.id ? "crm-nav__item crm-nav__item--active" : "crm-nav__item"}
                  type="button"
                  onClick={() => { setActiveWalker(w.id); setSelectedLocalId(null); setActiveView("contacts"); }}
                >
                  {w.name} ({w.count})
                </button>
              ))}
            </div>
          ) : null}

          <nav className="crm-nav" aria-label="Navegacion CRM">
            {ROLE_NAV[roleId].map((item, idx) => {
              if (item.section) {
                return <span key={`sec-${idx}`} className="crm-nav__section-label">{item.section}</span>;
              }
              const isActive = activeView === item.id || (item.id === "team" && (activeView === "team" || activeView.startsWith("walker-")));
              return (
                <React.Fragment key={item.id}>
                  <button
                    className={isActive ? "crm-nav__item crm-nav__item--active" : "crm-nav__item"}
                    type="button"
                    onClick={() => item.openModule ? onOpenModule(item.openModule) : setActiveView(item.id)}
                  >
                    {item.icon && <span style={{ fontSize: "0.78rem", opacity: 0.8 }} aria-hidden="true">{item.icon}</span>}
                    {item.label}
                  </button>
                  {/* Walkers individuales — inmediatamente después de "Equipo Walkers" */}
                  {item.id === "team" && roleId === "manager" && walkers.map((w) => (
                    <button
                      key={`walker-nav-${w.id}`}
                      className={activeView === `walker-${w.id}` ? "crm-nav__item crm-nav__item--sub crm-nav__item--active" : "crm-nav__item crm-nav__item--sub"}
                      type="button"
                      onClick={() => { setActiveWalker(w.id); setActiveView(`walker-${w.id}`); }}
                    >
                      {w.name}
                      <span style={{ marginLeft: "auto", fontSize: "0.7rem", opacity: 0.6 }}>{w.count}</span>
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
          </nav>

          {/* legacy modules section eliminada — items integrados en ROLE_NAV */}
        </aside>

        <main className="crm-main">
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
              }}
            />
          ) : null}

          {roleId === "walker" && activeView === "dashboard" ? (
            <WalkerDashboard
              columns={kanbanColumns}
              locals={visibleLocals}
              summary={dashboardSummary}
              excelMeta={excelMeta}
              excelError={excelError}
              draggedCardId={draggedCardId}
              onCardDragStart={setDraggedCardId}
              onCardDrop={moveCard}
              onUpload={handleOnFiveWorkbookUpload}
              onOpenLocal={(localId) => {
                setSelectedLocalId(localId);
                setActiveView("local");
              }}
            />
          ) : null}

          {activeView === "local" && selectedLocal ? (
            <LocalProfile
              draftNote={draftNote}
              local={selectedLocal}
              notes={localNotes}
              extraContacts={[...(extraContacts[selectedLocal.id] ?? []), ...selectedLocal.contacts]}
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
              activeUserName={role.name}
              local={selectedLocal}
              onSelectModule={setActiveOnFiveModule}
              onUpdatePillar={(pillarKey, data) => updateLocalPillar(selectedLocal.id, pillarKey, data)}
              assortmentConfig={assortmentConfig}
              assortmentAudit={assortmentAudits[selectedLocal.id] ?? null}
              onSaveAssortmentAudit={(checkedIds, segmentIds) => saveAssortmentAudit(selectedLocal.id, checkedIds, role.name, segmentIds)}
              onAddNote={(note) => setExtraNotes((curr) => ({
                ...curr,
                [selectedLocal.id]: [note, ...(curr[selectedLocal.id] ?? [])],
              }))}
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
              localsData={localsData}
              walkers={walkers}
              onAddManualLocal={addManualLocal}
              assortmentConfig={assortmentConfig}
              onSaveAssortmentConfig={setAssortmentConfig}
              onUpdateAccount={(localId, updates) =>
                setRawLocalsData((current) => current.map((l) => l.id === localId ? { ...l, ...updates } : l))
              }
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
    <section className="crm-page-header">
      <div>
        <span className="crm-eyebrow">BARRA</span>
        <h1>{titles[roleId]?.[activeView] ?? "CRM On Trade"}</h1>
        <p>
          {activeView === "contacts"
            ? "Lista limpia de cuentas, contactos y proyectos activos para priorizar el trabajo de ejecucion."
            : activeView === "local"
            ? "Ficha accionable para preparar la visita, registrar avances y desarrollar la cuenta."
            : activeView === "config"
            ? "Administracion de la cartera: carga del maestro de cuentas y asignacion por Walker."
            : "Tareas, misiones, ejecucion y performance conectadas en una sola rutina comercial."}
        </p>
      </div>

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
            El archivo debe tener una hoja con los headers <strong>CLIENTE ID</strong>, <em>Nombre Fantasía</em>, <em>Segmento</em>, <em>Comuna</em>, <em>Acuerdo Comercial Vigente</em>, <em>Tropical Gin</em>, <em>CA c/ Whisky</em>, <em>CA c/ Gin</em>, <em>JW + Coca Cola</em>, <em>Gin & Tonic</em>, <em>Whisky Sour</em>, entre otras.
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
      <span
        style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
        onClick={() => toggleSort(col)}
      >
        {children}
        <span style={{ opacity: active ? 1 : 0.3, fontSize: "0.7rem" }}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    );
  }

  function pillarDot(score) {
    const c = score === "Completado" ? "#16a34a" : score === "Pendiente" ? "#d97706" : "#9ca3af";
    return <span title={score} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />;
  }

  if (locals.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>📂</div>
        <strong style={{ fontSize: "1rem", display: "block" }}>Sin cuentas cargadas</strong>
        <p style={{ fontSize: "0.84rem", marginTop: 6 }}>Solicita al CP&A que cargue el Excel maestro desde Configuración para ver tu cartera aquí.</p>
      </div>
    );
  }

  return (
    <section className="crm-directory">
      <div className="crm-directory__toolbar">
        <div>
          <span className="crm-eyebrow">Cartera cargada desde Excel</span>
          <h2>Cuentas · {filteredLocals.length === locals.length ? locals.length : `${filteredLocals.length} de ${locals.length}`}</h2>
        </div>
        <label className="crm-directory__search">
          <span>Buscar</span>
          <input
            placeholder="Nombre, cliente ID, comuna, segmento, SKU, walker..."
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="crm-pill-row">
        {filters.map((f) => (
          <button key={f.id} className={activeFilter === f.id ? "crm-pill crm-pill--active" : "crm-pill"} type="button" onClick={() => setActiveFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="crm-directory__summary">
        <MetricCard compact label="Cuentas totales"  value={locals.length}                                                                         note="cartera completa" />
        <MetricCard compact label="Con AACC Diageo"  value={locals.filter((l) => l.hasAacc).length}                                               note="acuerdos vigentes" />
        <MetricCard compact label="Gaps en Menú"     value={locals.filter((l) => l.pillars.menu.score !== "Completado").length} note="KPIs incompletos" />
      </div>

      {/* ── Tabla / Cards ── */}
      <div className="crm-account-table">
        {/* Header — solo desktop */}
        <div className="crm-account-table__head">
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
          const healthTone = local.healthScore >= 76 ? "#16a34a" : local.healthScore >= 68 ? "#d97706" : "#dc2626";
          const pillarsArr = ["staff","assortment","menu","branding","activation"];
          const assortment = local.pillars.assortment?.summary ?? "—";
          const assortLabel = assortment.replace("Foto de Exito: ","").replace("Pendiente foto de exito por segmento","Pendiente");

          return (
            <button key={local.id} type="button" className="crm-account-row" onClick={() => onOpenLocal(local.id)}>
              {/* Cuenta */}
              <span className="crm-account-row__name">
                <span className="crm-avatar crm-avatar--sm">{initials(local.name)}</span>
                <span>
                  <strong>{local.name}</strong>
                  <small>{local.accountCode}</small>
                </span>
              </span>
              {/* Segmento */}
              <span className="crm-account-row__segment"><span className="crm-chip" style={{ fontSize: "0.72rem" }}>{local.segment || "—"}</span></span>
              {/* Subcanal */}
              <span className="crm-account-row__col--hide-mobile" style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{local.subchannel || "—"}</span>
              {/* Comuna */}
              <span className="crm-account-row__col--hide-mobile" style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{local.district || "—"}</span>
              {/* Desarrollador */}
              <span className="crm-account-row__col--hide-mobile" style={{ fontSize: "0.78rem", color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{local.developer || "—"}</span>
              {/* AACC */}
              <span className="crm-account-row__aacc">
                {local.hasAacc
                  ? <span className="crm-pill crm-pill--gold" style={{ fontSize: "0.7rem" }}>Diageo</span>
                  : <span className="crm-pill" style={{ fontSize: "0.7rem", opacity: .6 }}>Sin AC</span>}
              </span>
              {/* Foto Éxito */}
              <span className="crm-account-row__col--hide-mobile" style={{ fontSize: "0.78rem", color: assortment.includes("4/4") ? "#16a34a" : "var(--text-2)", fontWeight: assortment.includes("4/4") ? 700 : 400 }}>
                {assortLabel}
              </span>
              {/* On Five dots */}
              <span className="crm-account-row__onfive">
                {pillarsArr.map((key) => (
                  <span key={key} className="crm-account-row__dot-col">
                    {pillarDot(local.pillars[key]?.score)}
                    <span>{key.slice(0,2).toUpperCase()}</span>
                  </span>
                ))}
              </span>
              {/* Health */}
              <span className="crm-account-row__health" style={{ color: healthTone }}>{local.healthScore}</span>
            </button>
          );
        })}

        {filteredLocals.length === 0 && (
          <div style={{ padding: "28px", textAlign: "center", color: "var(--text-3)", fontSize: "0.84rem" }}>
            Sin resultados para "{query}"
          </div>
        )}
      </div>

      {/* Leyenda On Five */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "8px 2px" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>On Five:</span>
        {[["ST","Staff"],["AS","Assortment"],["ME","Menú"],["BR","Branding"],["AC","Activation"]].map(([code, label]) => (
          <span key={code} style={{ fontSize: "0.72rem", color: "var(--text-3)" }}><strong>{code}</strong> {label}</span>
        ))}
        {[["#16a34a","Completado"],["#d97706","Pendiente"],["#9ca3af","Sin registro"]].map(([color, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--text-3)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />{label}
          </span>
        ))}
      </div>
    </section>
  );
}

function WalkerDashboard({ columns, locals, summary, excelMeta, excelError, draggedCardId, onCardDragStart, onCardDrop, onOpenLocal, onUpload }) {
  if (!locals || locals.length === 0) {
    return (
      <div className="crm-stack">
        <article className="crm-card" style={{ padding: "40px 36px", maxWidth: 600 }}>
          <SectionTitle kicker="Sin datos" title="Carga el Excel maestro para ver tu dashboard" description="Sube el archivo Maestro de Cuentas DBA para activar los KPIs de On Five, avance por pilar y cuentas en atencion." />
          <label style={{ display: "block", cursor: "pointer", marginTop: 20 }}>
            <div style={{ border: "2px dashed var(--border-md)", borderRadius: "var(--radius-card)", padding: "32px", textAlign: "center", background: "var(--canvas)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📂</div>
              <strong style={{ fontSize: "0.95rem", display: "block" }}>Arrastra o haz click para seleccionar</strong>
              <small style={{ color: "var(--text-3)", fontSize: "0.78rem", marginTop: 4, display: "block" }}>Maestro de Cuentas DBA .xlsx</small>
            </div>
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onUpload} />
          </label>
          {excelError ? (
            <div style={{ marginTop: 12, background: "var(--red-100,#fef2f2)", border: "1px solid var(--red-200,#fecaca)", borderRadius: 8, padding: "12px 14px", color: "#dc2626", fontSize: "0.84rem", fontWeight: 600 }}>
              {excelError}
            </div>
          ) : null}
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
    <div className="crm-stack">
      {/* KPI cards — mismo patrón que el dashboard de referencia */}
      <section className="crm-metrics-grid crm-metrics-grid--four">
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

      <section className="crm-dashboard-grid">
        <article className="crm-card">
          <SectionTitle kicker="On Five" title="Avance por pilar" />
          <div className="crm-progress-list">
            <ProgressRow label="Staff — visitas registradas" value={pct(withVisit)} />
            <ProgressRow label="Assortment — foto de exito" value={pct(withFoto)} />
            <ProgressRow label="Menu — cocktails y drink strategy" value={pct(summary.menuOk)} />
            <ProgressRow label="Branding — glassware y neon" value={pct(summary.brandingOk)} />
            <ProgressRow label="Activacion — Always On" value={pct(summary.activationOk)} />
          </div>
        </article>

        <article className="crm-card">
          <SectionTitle kicker="Accion requerida" title="Cuentas con menor avance" />
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {atRisk.map((local) => (
              <button
                key={local.id}
                type="button"
                onClick={() => onOpenLocal(local.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: "8px 16px",
                  padding: "10px 14px",
                  background: "var(--canvas)",
                  border: "1px solid var(--border-sm)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.875rem", display: "block" }}>{local.name}</strong>
                  <small style={{ color: "var(--text-3)", fontSize: "0.76rem" }}>{local.district} · {local.walkerName}</small>
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: local.healthScore < 50 ? "#dc2626" : local.healthScore < 70 ? "#d97706" : "var(--text-2)",
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {local.healthScore}
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="crm-card">
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

function LocalProfile({ draftNote, extraContacts, local, notes, onAddContact, onDraftNoteChange, onOpenOnFive, onPublishNote }) {
  return (
    <div className="crm-stack">
      <section className="crm-local-grid">
        <article className="crm-card crm-local-hero">
          <div className="crm-local-identity">
            <span className="crm-avatar">{initials(local.name)}</span>
            <div>
              <h2>{local.name}</h2>
              <p>{local.address}</p>
            </div>
            <strong className="crm-health">{local.healthScore}</strong>
          </div>
          <div className="crm-chip-row">
            {[local.segment, local.occasion, ...local.tags].map((tag) => (
              <span key={tag} className="crm-chip">
                {tag}
              </span>
            ))}
          </div>
          <div className="crm-kpi-grid">
            {local.kpis.map((item) => (
              <MetricCard key={item.label} compact label={item.label} note={item.note} value={item.value} />
            ))}
            <MetricCard
              compact
              label="Acuerdo comercial"
              note={local.hasAacc ? "AACC vigente" : "Sin AACC"}
              tone={local.hasAacc ? "good" : "warning"}
              value={local.hasAacc ? formatCurrency(local.investment) : "No"}
            />
          </div>
        </article>

        <article className="crm-card">
          <SectionTitle kicker="Relacion" title="Contactos clave" />
          <KeyContacts contacts={extraContacts ?? local.contacts} onAdd={onAddContact} />
        </article>

        <article className="crm-card">
          <SectionTitle kicker="Performance" title="Ventas mensuales vs AA" />
          <MiniLineChart series={local.monthlySales} seed={local.accountCode ? parseInt(local.accountCode.toString().slice(-3), 10) : 7} />
        </article>
      </section>

      <section className="crm-card">
        <SectionTitle kicker="Desarrollo de cuenta" title="Misiones recomendadas" />
        <MissionGrid missions={local.missions} />
      </section>

      <section className="crm-card">
        <SectionTitle
          kicker="Estrategia en local"
          title="On Five"
          description="Resumen de los 5 modulos de desarrollo de cuenta. Entra a cada uno para accionar y registrar avances."
        />
        <ExecutionPillars local={local} onSelectPillar={onOpenOnFive} />
      </section>

      <section className="crm-card">
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

function ExecutionWorkspace({ activeModuleKey, activeUserName, local, onSelectModule, onUpdatePillar, assortmentConfig, assortmentAudit, onSaveAssortmentAudit, onAddNote }) {
  const activeModule = ON_FIVE_MODULES.find((module) => module.key === activeModuleKey) ?? ON_FIVE_MODULES[0];
  const activePillar = local.pillars[activeModule.key];

  return (
    <div className="crm-stack">
      <section className="crm-card crm-onfive-map">
        <SectionTitle
          kicker="On Five"
          title={`Plan de desarrollo - ${local.name}`}
          description="On Five resume y ordena los 5 modulos de ejecucion. Cada modulo tiene acciones, evidencia, registros y bitacora propia."
        />
        <ExecutionPillars activeKey={activeModule.key} local={local} onSelectPillar={onSelectModule} />
      </section>

      <section className="crm-onfive-layout">
        <OnFiveModuleDetail
          activeUserName={activeUserName}
          local={local}
          module={activeModule}
          pillar={activePillar}
          onUpdatePillar={onUpdatePillar}
          assortmentConfig={assortmentConfig}
          assortmentAudit={assortmentAudit}
          onSaveAssortmentAudit={onSaveAssortmentAudit}
          onAddNote={onAddNote}
        />
      </section>
    </div>
  );
}

function VisitPlaybook({ local }) {
  const mainMission = local.missions[0];

  return (
    <div className="crm-playbook-grid">
      <article className="crm-card">
        <SectionTitle kicker="Objetivo" title={`Visita a ${local.name}`} />
        <div className="crm-playbook-focus">
          <strong>{mainMission?.title ?? "Revisar oportunidades del local"}</strong>
          <p>{mainMission?.reason ?? "Preparar conversacion comercial segun perfil y estado de ejecucion."}</p>
        </div>
      </article>

      <article className="crm-card">
        <SectionTitle kicker="Conversacion" title="Preguntas sugeridas" />
        <ul className="crm-checklist">
          <li>Que producto esta rotando mejor esta semana?</li>
          <li>Que etiqueta falta para cerrar el assortment objetivo?</li>
          <li>Que apoyo necesita el staff para vender mejor?</li>
          <li>Que activacion tiene sentido para el proximo fin de semana?</li>
        </ul>
      </article>

      <article className="crm-card">
        <SectionTitle kicker="Cierre" title="Checklist de salida" />
        <ul className="crm-checklist">
          <li>Registrar minuta de visita.</li>
          <li>Actualizar estado de misiones.</li>
          <li>Subir evidencia de branding o activacion.</li>
          <li>Definir proxima accion con fecha.</li>
        </ul>
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
    <div className="crm-stack">
      <section className="crm-metrics-grid crm-metrics-grid--four">
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

      <section className="crm-dashboard-grid">
        <article className="crm-card">
          <SectionTitle kicker="Backoffice" title="Solicitudes recientes" />
          <RequestList requests={CPA_REQUESTS} />
        </article>
        <article className="crm-card">
          <SectionTitle kicker="On Five" title="Ejecución por pilar" />
          <div className="crm-progress-list">
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
  return (
    <section className="crm-card">
      <SectionTitle
        kicker="CP&A"
        title="Solicitudes de visibilidad"
        description="Vista inicial para coordinar material POP, activos, aprobaciones y seguimiento de instalacion."
      />
      <div className="crm-request-board">
        {["Solicitado", "En revision", "Aprobado", "Enviado", "Instalado"].map((status) => (
          <div key={status} className="crm-request-column">
            <strong>{status}</strong>
            {CPA_REQUESTS.filter((request) => request.status === status).map((request) => (
              <article key={request.id} className="crm-request-card">
                <span>{request.local}</span>
                <p>{request.type}</p>
                <small>{request.owner}</small>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Placeholder genérico para módulos CP&A en desarrollo ─── */
function CpaPlaceholder({ icon = "🔧", title, desc, tag = "En desarrollo" }) {
  return (
    <div className="crm-placeholder">
      <div className="crm-placeholder__icon">{icon}</div>
      <h2>{title}</h2>
      <p>{desc}</p>
      <small>{tag}</small>
    </div>
  );
}

/* ── Solicitudes walkers → CP&A inbox ───────────────────────
   Los walkers crean solicitudes desde terreno.
   CP&A las gestiona acá: revisar, aprobar, rechazar.
────────────────────────────────────────────────────────────── */
function CpaSolicitudesView({ locals = [] }) {
  const STATUSES = ["Solicitado", "En revision", "Aprobado", "Rechazado"];
  const STATUS_COLOR = {
    "Solicitado":  "crm-badge--blue",
    "En revision": "crm-badge--amber",
    "Aprobado":    "crm-badge--green",
    "Rechazado":   "crm-badge--red",
  };
  return (
    <div className="crm-stack">
      <section className="crm-metrics-grid">
        {STATUSES.map((s) => {
          const n = CPA_REQUESTS.filter((r) => r.status === s).length;
          return <MetricCard key={s} label={s} value={n} compact />;
        })}
      </section>
      <article className="crm-card">
        <SectionTitle kicker="Walker → CP&A" title="Solicitudes recibidas" />
        <div>
          {CPA_REQUESTS.map((req) => (
            <div key={req.id} className="crm-solicitudes-item">
              <div>
                <div className="crm-solicitudes-item__title">{req.type}</div>
                <div className="crm-solicitudes-item__meta">
                  {req.local} &nbsp;·&nbsp; {req.owner}
                </div>
              </div>
              <div className="crm-solicitudes-item__status">
                <span className={`crm-badge ${STATUS_COLOR[req.status] ?? "crm-badge--gray"}`}>
                  {req.status}
                </span>
              </div>
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
    if (pct >= 70) return "";
    if (pct >= 40) return "crm-bar__fill--warn";
    return "crm-bar__fill--danger";
  }

  return (
    <div className="crm-stack">
      <section className="crm-metrics-grid crm-metrics-grid--four">
        <MetricCard label="Walkers activos"    value={walkers.length} />
        <MetricCard label="Total cuentas"      value={locals.length} />
        <MetricCard label="Cuentas auditadas"  value={locals.filter((l) => l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)).length} />
        <MetricCard
          label="On Five promedio"
          value={walkerStats.length > 0 ? `${Math.round(walkerStats.reduce((a, w) => a + w.onFiveScore, 0) / walkerStats.length)}%` : "—"}
          tone="good"
        />
      </section>

      <article className="crm-card">
        <SectionTitle kicker="Equipo walker" title="Performance individual" />
        <div>
          {/* Header */}
          <div className="crm-walker-kpi-row" style={{ fontWeight: 600, fontSize: "0.72rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Walker</span>
            <span>Cobertura auditoría</span>
            <span style={{ textAlign: "right" }}>Cuentas</span>
            <span style={{ textAlign: "right" }}>Auditadas</span>
            <span style={{ textAlign: "right" }}>On Five</span>
          </div>
          {walkerStats.map((w) => (
            <div key={w.id} className="crm-walker-kpi-row">
              <span className="crm-walker-kpi-row__name">{w.name}</span>
              <div className="crm-walker-kpi-row__bar">
                <div className="crm-bar">
                  <div
                    className={`crm-bar__fill ${barColor(w.cobertura)}`}
                    style={{ width: `${w.cobertura}%` }}
                  />
                </div>
                <span style={{ fontSize: "0.76rem", color: "#6B7280", minWidth: 30 }}>{w.cobertura}%</span>
              </div>
              <span className="crm-walker-kpi-row__val">{w.total}</span>
              <span className="crm-walker-kpi-row__val">{w.auditados}</span>
              <span className={`crm-walker-kpi-row__val ${w.onFiveScore >= 70 ? "crm-status--good" : w.onFiveScore >= 40 ? "crm-status--warning" : "crm-status--danger"}`}>
                {w.onFiveScore > 0 ? `${w.onFiveScore}%` : "—"}
              </span>
            </div>
          ))}
          {walkerStats.length === 0 && (
            <p style={{ color: "#9CA3AF", fontSize: "0.84rem", padding: "16px 0", textAlign: "center" }}>
              Sube el Excel de cuentas en Configuración para ver los KPIs.
            </p>
          )}
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
    <div className="crm-stack">
      <section className="crm-metrics-grid crm-metrics-grid--four">
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

      <section className="crm-dashboard-grid">
        <article className="crm-card">
          <SectionTitle kicker="Equipo" title="Performance por walker" />
          <WalkerTable walkers={walkers} locals={locals} />
        </article>
        <article className="crm-card">
          <SectionTitle kicker="Prioridades" title="Cuentas a revisar esta semana" />
          <VisitList visits={CRM_VISITS.slice(0, 4)} onOpenLocal={() => {}} />
        </article>
      </section>
    </div>
  );
}

function ManagerTeamView({ walkers = [], locals = [] }) {
  return (
    <section className="crm-card">
      <SectionTitle
        kicker="BARRA · Manager"
        title="Performance del equipo Walker"
        description="Actividad, cobertura y On Five score por zona."
      />
      <WalkerTable walkers={walkers} locals={locals} expanded />
    </section>
  );
}

function MetricCard({ compact = false, label, note, tone = "neutral", value }) {
  return (
    <article className={`crm-metric crm-metric--${tone} ${compact ? "crm-metric--compact" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

/* KpiCard — look and feel del dashboard de referencia:
   icon + pregunta coloreada / label gris / valor grande coloreado / barra opcional / nota */
function KpiCard({ color = "blue", icon, question, label, value, note, progress, trend }) {
  return (
    <article className={`crm-kpi-card crm-kpi-card--${color}`}>
      <div className="crm-kpi-card__header">
        {icon && <span className="crm-kpi-card__header-icon" aria-hidden="true">{icon}</span>}
        <span>{question}</span>
      </div>
      <div className="crm-kpi-card__label">{label}</div>
      <div className="crm-kpi-card__value">{value}</div>
      {progress != null && (
        <div className="crm-kpi-card__bar">
          <div className="crm-kpi-card__bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      {(note || trend) && (
        <div className="crm-kpi-card__note">
          {note}
          {trend && <span className="crm-kpi-card__trend">{trend}</span>}
        </div>
      )}
    </article>
  );
}

function SectionTitle({ description, kicker, title }) {
  return (
    <div className="crm-section-title">
      <span>{kicker}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

function ActivityTimeline({ activities }) {
  return (
    <div className="crm-timeline">
      {activities.map((activity) => (
        <article key={activity.id} className={`crm-timeline-item crm-timeline-item--${activity.tone}`}>
          <span aria-hidden="true" />
          <div>
            <strong>
              {activity.title} - {activity.local}
            </strong>
            <p>{activity.detail}</p>
            <small>{activity.meta}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function VisitList({ visits, onOpenLocal }) {
  return (
    <div className="crm-visit-list">
      {visits.map((visit) => (
        <button key={visit.id} className="crm-visit-row" type="button" onClick={() => onOpenLocal(visit.localId)}>
          <span>
            <strong>{visit.local}</strong>
            <small>
              {visit.description} - {visit.objective}
            </small>
          </span>
          <span className={`crm-status crm-status--${visit.tone}`}>{visit.status}</span>
          <span className="crm-progress">
            <i style={{ width: `${visit.progress}%` }} />
          </span>
        </button>
      ))}
    </div>
  );
}

const PRIORITY_COLOR = { Alta: "#dc2626", Media: "#d97706", Baja: "var(--text-3)" };

function KanbanBoard({ columns, draggedCardId, onCardDragStart, onCardDrop, onOpenLocal }) {
  return (
    <div className="crm-kanban">
      {columns.map((column) => (
        <section
          key={column.id}
          className="crm-kanban-column"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onCardDrop(column.id)}
        >
          <header>
            <strong>{column.title}</strong>
            <span>{column.cards.length}</span>
          </header>
          <div className="crm-kanban-column__body">
            {column.cards.map((card) => (
              <article
                key={card.id}
                className={draggedCardId === card.id ? "crm-kanban-card crm-kanban-card--dragging" : "crm-kanban-card"}
                draggable
                onDragStart={() => onCardDragStart(card.id)}
              >
                <span style={{ color: "var(--text-3)", fontSize: "0.73rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{card.origin}</span>
                <strong>{card.local}</strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text-2)", margin: "2px 0 4px", lineHeight: 1.4 }}>{card.title}</p>
                <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <b style={{ fontSize: "0.73rem", color: PRIORITY_COLOR[card.priority] ?? "var(--text-3)", fontWeight: 700 }}>{card.priority}</b>
                  {onOpenLocal && card.localId ? (
                    <button
                      type="button"
                      style={{ fontSize: "0.73rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                      onClick={(e) => { e.stopPropagation(); onOpenLocal(card.localId); }}
                    >
                      Ver cuenta →
                    </button>
                  ) : (
                    <em style={{ fontSize: "0.73rem", color: "var(--text-3)" }}>{card.due}</em>
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

function KeyContacts({ contacts, onAdd }) {
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

  return (
    <div className="crm-contact-list">
      {contacts.map((contact) => (
        <article key={contact.id} className="crm-contact-row">
          <span className="crm-contact-avatar">{initials(contact.name)}</span>
          <div>
            <strong>{contact.name}</strong>
            <small>{contact.role}{contact.note ? ` - ${contact.note}` : ""}</small>
          </div>
          {contact.phone
            ? <a className="crm-wpp-button" href={`https://wa.me/${contact.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
            : <span />}
        </article>
      ))}

      {open ? (
        <div style={{ display: "grid", gap: 10, padding: "14px 0 4px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Nombre</span>
              <input
                style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }}
                placeholder="Juan"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Apellido</span>
              <input
                style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }}
                placeholder="Pérez"
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
              />
            </label>
          </div>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Cargo</span>
            <input
              style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }}
              placeholder="Bartender, Encargado, Dueño..."
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Teléfono</span>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border-md)", borderRadius: 8, background: "var(--canvas)", overflow: "hidden" }}>
              <span style={{ padding: "7px 10px", fontSize: "0.84rem", color: "var(--text-2)", borderRight: "1px solid var(--border-md)", background: "var(--surface-1,#f4f6f5)", flexShrink: 0 }}>+56</span>
              <input
                style={{ border: "none", padding: "7px 10px", fontSize: "0.84rem", background: "transparent", outline: "none", width: "100%" }}
                placeholder="9 1234 5678"
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.82rem" }}>Cancelar</button>
            <button type="button" onClick={handleSave} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>Guardar</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--accent)", background: "none", border: "1px dashed var(--border-md)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", width: "100%" }}
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
    <div className="crm-chart-block">
      <svg className="crm-line-chart" viewBox="0 0 360 150" role="img" aria-label="Ventas mensuales vs AA">
        <polyline className="crm-line-chart__previous" fill="none" points={pointsPrevious} />
        <polyline className="crm-line-chart__current" fill="none" points={pointsCurrent} />
        {data.map((item, index) => {
          const x = 24 + (index * 312) / Math.max(data.length - 1, 1);
          return (
            <text key={item.month} x={x} y="145" textAnchor="middle">
              {item.month}
            </text>
          );
        })}
      </svg>
      <div className="crm-chart-legend">
        <span>Actual</span>
        <span>AA</span>
        {isPlaceholder && <small style={{ color: "var(--text-3)", fontSize: "0.72rem", marginLeft: 8 }}>Datos ilustrativos — conectar con Lighthouse</small>}
      </div>
    </div>
  );
}

function MissionGrid({ missions }) {
  return (
    <div className="crm-mission-grid">
      {missions.map((mission) => (
        <article key={mission.id} className="crm-mission-card">
          <div>
            <span>{mission.origin}</span>
            <strong>{mission.status}</strong>
          </div>
          <h3>{mission.title}</h3>
          <p>{mission.reason}</p>
          <div className="crm-progress crm-progress--wide">
            <i style={{ width: `${mission.progress}%` }} />
          </div>
          <small>
            {mission.impact} - Proximo paso: {mission.nextStep}
          </small>
        </article>
      ))}
    </div>
  );
}

function OnFiveModuleDetail({ activeUserName, local, module, pillar, onUpdatePillar, assortmentConfig, assortmentAudit, onSaveAssortmentAudit, onAddNote }) {
  const [moduleLogs, setModuleLogs] = useState([]);
  const [activeIncentives, setActiveIncentives] = useState(["Tanqueray Perfect Serve Challenge", "Smirnoff Red Staff Challenge"]);
  const tone = getPillarTone(pillar?.score);

  return (
    <article className="crm-card crm-onfive-detail">
      <div className="crm-onfive-hero">
        <div>
          <span className="crm-eyebrow">On Five / {module.label}</span>
          <h2>{module.title}</h2>
          <p>{module.description}</p>
        </div>
        {module.key !== "menu" ? (
          <button className="crm-onfive-primary-action" type="button">{module.primaryAction}</button>
        ) : null}
      </div>

      {module.key !== "menu" ? (
        <div className="crm-onfive-status-bar">
          <div className="crm-onfive-status-bar__account">
            <span className="crm-avatar crm-avatar--sm">{initials(local.name)}</span>
            <div>
              <strong>{local.name}</strong>
              <span>{local.segment} · {local.district}</span>
            </div>
          </div>
          <span className={`crm-pill crm-pill--${tone}`}>{pillar?.score ?? "Sin dato"}</span>
          {pillar?.summary && (
            <span className="crm-onfive-status-bar__summary">{pillar.summary}</span>
          )}
          {pillar?.nextAction && (
            <span className="crm-onfive-status-bar__action">→ {pillar.nextAction}</span>
          )}
        </div>
      ) : null}

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
          <section className="crm-onfive-content">
            <div className="crm-onfive-content__main">
              <OnFiveRegisterPanel
                module={module}
                activeIncentives={activeIncentives}
                onSave={(record) => {
                  setModuleLogs((current) => [record, ...current]);
                  if (module.key === "staff" && onUpdatePillar) {
                    const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
                    onUpdatePillar("staff", {
                      score: "Completado",
                      summary: `${labelForRegisterType(record?.registerType)} · ${ts}`,
                      nextAction: "Programar proxima visita",
                      lastAudit: ts,
                    });
                    onAddNote?.({
                      id: `note-${Date.now()}`,
                      author: activeUserName ?? "Walker",
                      date: ts,
                      text: record?.text ?? "",
                      type: labelForRegisterType(record?.registerType),
                      nextAction: "Seguimiento segun lo acordado en terreno.",
                    });
                    if (record?.registerType === "newIncentive" && record?.incentiveName) {
                      setActiveIncentives((prev) => [...prev, record.incentiveName]);
                    }
                  }
                }}
              />
            </div>
            <div className="crm-onfive-content__side">
              {module.key === "staff" && (
                <div className="crm-onfive-panel">
                  <SectionTitle kicker="Contactos clave" title="Equipo de la cuenta" />
                  <KeyContacts contacts={local.contacts} />
                </div>
              )}
              <div className="crm-onfive-panel">
                <SectionTitle kicker="Evidencia" title="Fotos y soportes" />
                <div className="crm-evidence-grid">
                  <div><strong>Foto 1</strong><small>Staff, carta, POP o promo</small></div>
                  <div><strong>Foto 2</strong><small>Antes / despues</small></div>
                  <div><strong>Foto 3</strong><small>Resultado o ganador</small></div>
                </div>
              </div>
            </div>
          </section>

          <div className="crm-onfive-panel" style={{ marginTop: 14 }}>
            <SectionTitle kicker="Bitácora" title="Registros recientes" />
            {moduleLogs.length === 0 ? (
              <p style={{ color: "var(--text-3)", fontSize: "0.84rem", padding: "8px 0" }}>
                Sin registros aun. Completa el formulario y guarda para ver los registros aqui.
              </p>
            ) : (
              <div className="crm-menu-eval-log">
                {moduleLogs.map((record, i) => {
                  const ts = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
                  const text = typeof record === "string" ? record : record.text ?? JSON.stringify(record);
                  return (
                  <article key={i} className="crm-menu-eval-post">
                    <div className="crm-menu-eval-post__avatar">{initials(activeUserName ?? "W")}</div>
                    <div className="crm-menu-eval-post__body">
                      <header><strong>{activeUserName ?? "Walker"}</strong><span>{ts}</span></header>
                      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-2)" }}>{text}</p>
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
    <article className="crm-onfive-account-card">
      <span>Cuenta</span>
      <strong>{local.name}</strong>
      <small>
        {local.segment} - {local.district}
      </small>
      <div className="crm-onfive-contact-list" aria-label="Contactos clave">
        {contacts.map((contact) => (
          <a
            key={contact.id}
            aria-label={`Abrir WhatsApp de ${contact.name}`}
            href={`https://wa.me/${contact.phone}`}
            rel="noreferrer"
            target="_blank"
          >
            <span>{initials(contact.name)}</span>
            <div>
              <strong>{contact.name}</strong>
              <small>{contact.role}</small>
            </div>
            <b>WPP</b>
          </a>
        ))}
      </div>
    </article>
  );
}

function AssortmentPortfolioPanel({ local, pillar, assortmentConfig, assortmentAudit, onSaveAudit, activeUserName }) {
  // Determinar segmento normalizado de la cuenta
  const segmentKey = OT_SEGMENTS.find((s) => local.segment?.toUpperCase().includes(s.toUpperCase().split(" ")[0])) ?? local.segment ?? "";
  const requiredIds = (assortmentConfig ?? DEFAULT_ASSORTMENT_CONFIG)[segmentKey] ?? [];
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
    <section className="crm-onfive-panel crm-assortment-panel">
      {/* Header */}
      <div className="crm-assortment-head">
        <SectionTitle
          kicker="Assortment — medición en terreno"
          title="Portafolio objetivo"
          description={`Segmento: ${segmentKey || local.segment || "Sin clasificar"}. Marca lo que está presente en la cuenta.`}
        />
        <div className="crm-assortment-head__actions">
          <strong className={`crm-pill crm-pill--${pctTone}`}>{total > 0 ? `${present}/${total} · ${pct}%` : "Sin portafolio"}</strong>
        </div>
      </div>

      {/* Métricas */}
      {total > 0 && (
        <div className="crm-assortment-metrics">
          <article>
            <span>Objetivo</span>
            <strong>{total} etiquetas</strong>
            <small>{segmentKey}</small>
          </article>
          <article>
            <span>Presentes</span>
            <strong style={{ color: pct === 100 ? "#16a34a" : "#d97706" }}>{present}</strong>
            <small>marcadas hoy</small>
          </article>
          <article>
            <span>Faltantes</span>
            <strong style={{ color: missingLabels.length > 0 ? "#dc2626" : "#16a34a" }}>{missingLabels.length}</strong>
            <small>{assortmentAudit ? `Últ: ${assortmentAudit.savedAt}` : "Sin auditoría previa"}</small>
          </article>
        </div>
      )}

      {total === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-3)", fontSize: "0.84rem" }}>
          No hay portafolio configurado para el segmento <strong>{local.segment}</strong>.<br />
          El CP&A puede configurarlo en Configuración → Assortment.
        </div>
      ) : (
        <>
          {/* Checklist por categoría */}
          <div style={{ display: "grid", gap: 14, marginTop: 8 }}>
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>{cat}</p>
                <div style={{ display: "grid", gap: 6 }}>
                  {items.map((item) => {
                    const checked = checkedIds.includes(item.id);
                    return (
                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${checked ? "#16a34a" : "#dc2626"}`, background: checked ? "#F0FDF4" : "#FEF2F2", cursor: "pointer", transition: "all .12s" }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} style={{ width: 16, height: 16, accentColor: checked ? "#16a34a" : "#dc2626", flexShrink: 0 }} />
                        <span style={{ fontWeight: checked ? 700 : 500, fontSize: "0.86rem", color: checked ? "#15803D" : "#991B1B", flex: 1 }}>{item.name}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{item.category}</span>
                        {checked
                          ? <span style={{ fontSize: "0.7rem", flexShrink: 0, padding: "2px 8px", borderRadius: 99, background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>✓ Tiene</span>
                          : <span style={{ fontSize: "0.7rem", flexShrink: 0, padding: "2px 8px", borderRadius: 99, background: "#FEE2E2", color: "#B91C1C", fontWeight: 700 }}>✗ No tiene</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Innovaciones — informativas */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border-md)" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>
              Innovaciones <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— informativas, no suman al portafolio</span>
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {OT_INNOVATIONS.map((item) => {
                const checked = checkedInnovIds.includes(item.id);
                return (
                  <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-sm)", background: "var(--canvas)", cursor: "pointer", opacity: 0.85 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleInnov(item.id)} style={{ width: 16, height: 16, accentColor: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.84rem", color: "var(--text-2)", flex: 1 }}>{item.name}</span>
                    <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.68rem" }}>Innovación</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Guardar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 12, flexWrap: "wrap" }}>
            <small style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>
              {assortmentAudit ? `Última auditoría: ${assortmentAudit.savedAt} · ${assortmentAudit.author}` : "Sin auditoría previa"}
            </small>
            <button className="crm-menu-save-button" type="button" onClick={saveTerreno}>
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
    <section className="crm-onfive-panel crm-assortment-wall">
      <SectionTitle
        kicker="Muro Assortment"
        title="Comentarios de la cuenta"
        description="Notas comerciales, acuerdos y pendientes del portafolio."
      />

      <div className="crm-assortment-composer">
        <div className="crm-assortment-composer__who">
          <span className="crm-avatar crm-avatar--sm" style={{ flexShrink: 0 }}>{initials(activeUserName ?? "Walker")}</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-2)", fontWeight: 500 }}>{activeUserName ?? "Walker"}</span>
        </div>
        <label>
          <span>Comentario</span>
          <textarea
            placeholder="Contexto que deberia ver el proximo usuario..."
            value={postText}
            onChange={(event) => setPostText(event.target.value)}
          />
        </label>
        <button disabled={!canPublish} type="button" onClick={publishPost}>
          Publicar
        </button>
      </div>

      <div className="crm-assortment-post-list">
        {posts.map((post) => (
          <article key={post.id} className="crm-assortment-post">
            <div className="crm-assortment-post__avatar">{initials(post.author)}</div>
            <div>
              <header>
                <strong>{post.author}</strong>
                <span>{post.date}</span>
              </header>
              <p>{post.text}</p>
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
    <section className="crm-menu-scanner crm-menu-kpi-workspace">

      {/* Status strip */}
      <div className="crm-menu-status-strip">
        <div className="crm-menu-status-strip__left">
          <span className="crm-avatar crm-avatar--sm" style={{ background: "var(--surface-3)", color: "var(--text-2)", fontSize: "0.7rem" }}>
            {initials(local.name)}
          </span>
          <div>
            <strong>{local.name}</strong>
            <small>{local.segment} · {local.district}</small>
          </div>
        </div>
        <div className="crm-menu-status-strip__kpis">
          <span className={`crm-pill crm-pill--${kpis.authorTone}`}>Coctelería de Autor: {kpis.authorStatus}</span>
          <span className={`crm-pill crm-pill--${kpis.drinkTone}`}>Drink Strategy: {kpis.drinkStatus}</span>
          <span className={`crm-pill crm-pill--${kpis.overallTone}`}>{kpis.overallStatus}</span>
        </div>
        <label className="crm-menu-status-strip__selector">
          <span>Situacion comercial</span>
          <select value={evaluation.commercialStatus} onChange={(event) => updateEvaluation("commercialStatus", event.target.value)}>
            <option value="diageo">AACC Diageo</option>
            <option value="none">Sin AACC</option>
            <option value="competitor">AACC competencia</option>
          </select>
        </label>
        <div className="crm-menu-status-strip__action">
          <span>Proxima accion</span>
          {nextGap ? (
            <strong className={`crm-pill crm-pill--${nextGap.tone}`} style={{ fontSize: "0.76rem", fontWeight: 600, maxWidth: 260, whiteSpace: "normal", lineHeight: 1.3, padding: "4px 9px" }}>
              {nextGap.title}
            </strong>
          ) : (
            <span className="crm-pill crm-pill--good">Menu alineado ✓</span>
          )}
        </div>
      </div>

      {/* KPI panels */}
      <div className="crm-menu-results-grid crm-menu-results-grid--manual">

        {/* KPI 1 */}
        <div className="crm-onfive-panel crm-menu-kpi-panel">
          <div className="crm-menu-kpi-panel__head">
            <span className="crm-eyebrow">KPI 1</span>
            <h3 style={{ margin: "3px 0 2px", color: "var(--text-1)", fontWeight: 680, letterSpacing: 0 }}>Cocteleria de Autor</h3>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: "0.84rem", lineHeight: 1.45 }}>
              {evaluation.commercialStatus === "diageo"
                ? "AACC Diageo: al menos 60% de los CA debe usar nuestras marcas."
                : "Sin AACC: debe existir un CA con whisky y un CA con gin."}
            </p>
          </div>

          {evaluation.commercialStatus === "diageo" ? (
            <div className="crm-menu-kpi-form-grid" style={{ marginTop: 12 }}>
              <label>
                <span>Total CA en carta</span>
                <input min="0" type="number" value={evaluation.authorCocktailsTotal}
                  onChange={(event) => updateEvaluation("authorCocktailsTotal", Number(event.target.value) || 0)} />
              </label>
              <label>
                <span>CA con marcas Diageo</span>
                <input min="0" type="number" value={evaluation.authorCocktailsDiageo}
                  onChange={(event) => updateEvaluation("authorCocktailsDiageo", Number(event.target.value) || 0)} />
              </label>
              <div className="crm-menu-ratio-box">
                <span>Mix Diageo</span>
                <strong>{kpis.authorShare}%</strong>
                <small>Meta minima: 60%</small>
              </div>
            </div>
          ) : (
            <div className="crm-menu-checklist" style={{ marginTop: 12 }}>
              <label className="crm-menu-check-item">
                <input checked={evaluation.hasWhiskyAuthorCocktail} type="checkbox"
                  onChange={(event) => updateEvaluation("hasWhiskyAuthorCocktail", event.target.checked)} />
                <span><strong>CA con whisky</strong><small>Coctel de autor con whisky en carta</small></span>
              </label>
              <label className="crm-menu-check-item">
                <input checked={evaluation.hasGinAuthorCocktail} type="checkbox"
                  onChange={(event) => updateEvaluation("hasGinAuthorCocktail", event.target.checked)} />
                <span><strong>CA con gin</strong><small>Coctel de autor con gin en carta</small></span>
              </label>
            </div>
          )}

          <label className="crm-menu-photo-slot">
            <span>Foto de respaldo KPI 1</span>
            <input accept="image/*" type="file" />
          </label>
        </div>

        {/* KPI 2 */}
        <div className="crm-onfive-panel crm-menu-kpi-panel">
          <div className="crm-menu-kpi-panel__head">
            <span className="crm-eyebrow">KPI 2</span>
            <h3 style={{ margin: "3px 0 2px", color: "var(--text-1)", fontWeight: 680, letterSpacing: 0 }}>Drink Strategy</h3>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: "0.84rem", lineHeight: 1.45 }}>
              {evaluation.commercialStatus === "competitor"
                ? "AACC competencia: Drink Strategy es foco recomendado, no mandatorio."
                : "Serves mandatorios en carta. Whiscola debe usar naming correcto."}
            </p>
          </div>
          <div className="crm-menu-checklist" style={{ marginTop: 12 }}>
            <label className="crm-menu-check-item">
              <input checked={evaluation.hasTropicalGin} type="checkbox"
                onChange={(event) => updateEvaluation("hasTropicalGin", event.target.checked)} />
              <span><strong>Tropical Gin</strong><small>Con Tanqueray o Gordon&apos;s</small></span>
            </label>
            <label className="crm-menu-check-item">
              <input checked={evaluation.hasWhiscolaNaming} type="checkbox"
                onChange={(event) => updateEvaluation("hasWhiscolaNaming", event.target.checked)} />
              <span><strong>Whiscola Johnnie Walker Red</strong><small>Naming exacto requerido en menu</small></span>
            </label>
            <label className="crm-menu-check-item">
              <input checked={evaluation.hasTanquerayGt} type="checkbox"
                onChange={(event) => updateEvaluation("hasTanquerayGt", event.target.checked)} />
              <span><strong>Tanqueray Gin &amp; Tonic</strong><small>Serve visible en carta</small></span>
            </label>
            <label className="crm-menu-check-item">
              <input checked={evaluation.hasWhiskySourBlack} type="checkbox"
                onChange={(event) => updateEvaluation("hasWhiskySourBlack", event.target.checked)} />
              <span><strong>Whisky Sour Johnnie Walker Black</strong><small>Whisky Sour con JW Black</small></span>
            </label>
          </div>

          <label className="crm-menu-photo-slot">
            <span>Foto de respaldo KPI 2</span>
            <input accept="image/*" type="file" />
          </label>
        </div>
      </div>

      {/* Save row */}
      <div className="crm-menu-save-row">
        {evaluation.lastSaved ? (
          <small>Ultimo guardado: {evaluation.lastSaved}</small>
        ) : (
          <small>Sin evaluaciones guardadas aun</small>
        )}
        <button className="crm-menu-save-button" type="button" onClick={saveEvaluation}>
          {justSaved ? "✓ Guardado" : "Guardar evaluacion"}
        </button>
      </div>

      {/* Gaps */}
      <div className="crm-onfive-panel crm-menu-action-panel">
        <SectionTitle kicker="Lectura comercial" title="Gaps y proxima accion" />
        <div className="crm-menu-gap-list">
          {gaps.map((gap) => (
            <article key={gap.title}>
              <span className={`crm-pill crm-pill--${gap.tone}`}>{gap.type}</span>
              <strong>{gap.title}</strong>
              <p>{gap.copy}</p>
            </article>
          ))}
          {gaps.length === 0 ? (
            <article>
              <span className="crm-pill crm-pill--good">OK</span>
              <strong>Menu alineado a los criterios mandatorios</strong>
              <p>Defender ejecucion, precio, visibilidad y entrenamiento de staff para sostener rotacion.</p>
            </article>
          ) : null}
        </div>
      </div>

      {/* Historial de evaluaciones */}
      {localLogs.length > 0 && (
        <div className="crm-onfive-panel">
          <SectionTitle kicker="Historial" title="Evaluaciones guardadas" />
          <div className="crm-menu-eval-log">
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
                <article key={log.id} className="crm-menu-eval-post" style={{ display: "block", padding: 0, border: "1px solid var(--border-sm)", borderRadius: 12, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                    style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    <div className="crm-menu-eval-post__avatar">{initials(log.author)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <strong style={{ fontSize: "0.875rem" }}>{log.author}</strong>
                        <span style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>{log.date}</span>
                        <span style={{ marginLeft: "auto", color: "var(--text-3)", fontSize: "0.8rem" }}>{isOpen ? "▲" : "▼"}</span>
                      </header>
                      <div className="crm-menu-eval-post__pills">
                        <span className={`crm-pill crm-pill--${log.caTone}`} style={{ fontSize: "0.74rem" }}>C. de Autor: {log.caStatus}</span>
                        <span className={`crm-pill crm-pill--${log.dsTone}`} style={{ fontSize: "0.74rem" }}>Drink Strategy: {log.dsStatus}</span>
                        {log.gapsCount === 0
                          ? <span className="crm-pill crm-pill--good" style={{ fontSize: "0.74rem" }}>Sin gaps</span>
                          : <span className="crm-pill crm-pill--warning" style={{ fontSize: "0.74rem" }}>{log.gapsCount} gap{log.gapsCount > 1 ? "s" : ""}</span>
                        }
                      </div>
                    </div>
                  </button>

                  {isOpen && log.snap && (
                    <div style={{ borderTop: "1px solid var(--border-sm)", padding: "14px 16px", background: "var(--canvas)", display: "grid", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Cocteleria de Autor</p>
                          <p style={{ fontSize: "0.84rem", marginBottom: 4 }}>
                            <strong>{log.snap.authorCocktailsDiageo} de {log.snap.authorCocktailsTotal}</strong> cocktails son Diageo
                            {log.kpis?.authorShare != null && <span style={{ color: "var(--text-3)" }}> ({log.kpis.authorShare}%)</span>}
                          </p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>{log.kpis?.authorRule}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Drink Strategy</p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: 6 }}>{log.kpis?.drinkRule}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {MENU_FIELDS_DETAIL.map(({ key, label }) => (
                              <span key={key} className={`crm-pill crm-pill--${log.snap[key] ? "good" : "danger"}`} style={{ fontSize: "0.72rem" }}>
                                {label}: {log.snap[key] ? "OK" : "No"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {log.gaps && log.gaps.length > 0 && (
                        <div>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Gaps detectados</p>
                          <div style={{ display: "grid", gap: 6 }}>
                            {log.gaps.map((gap, i) => (
                              <div key={i} style={{ fontSize: "0.82rem", padding: "8px 12px", background: "var(--surface-1,#f4f6f5)", borderRadius: 8, borderLeft: `3px solid ${gap.tone === "danger" ? "#dc2626" : "#d97706"}` }}>
                                <strong style={{ display: "block", marginBottom: 2 }}>{gap.title}</strong>
                                <span style={{ color: "var(--text-2)" }}>{gap.copy}</span>
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
      <div className="crm-menu-standby-grid">
        <div className="crm-menu-link-placeholder">
          <div>
            <span>Stand by</span>
            <strong>Lectura por link QR</strong>
            <p>Solucion escalable para Gourmedia, fu.do, Toteat y similares. Se desarrollara fuera de esta maqueta.</p>
          </div>
          <button disabled type="button">Leer link con IA</button>
        </div>
        <div className="crm-menu-link-placeholder">
          <div>
            <span>Stand by</span>
            <strong>Escaneo PDF con IA</strong>
            <p>Por ahora los KPIs se mantienen por actualizacion manual del Walker.</p>
          </div>
          <button disabled type="button">Analizar PDF</button>
        </div>
      </div>
    </section>
  );
}

function OnFiveRegisterPanel({ module, onSave, activeIncentives }) {
  const [activeRegisterType, setActiveRegisterType] = useState(STAFF_REGISTER_TYPES[0].key);
  const [formValues, setFormValues] = useState({});
  const isStaffModule = module.key === "staff";

  if (!isStaffModule) {
    return (
      <>
        <SectionTitle kicker="Registro" title="Campos del modulo" />
        <div className="crm-field-grid">
          {module.fields.map((field) => (
            <label key={field}>
              <span>{field}</span>
              <input placeholder="Pendiente registrar" type="text" />
            </label>
          ))}
        </div>
      </>
    );
  }

  const registerType = STAFF_REGISTER_TYPES.find((type) => type.key === activeRegisterType) ?? STAFF_REGISTER_TYPES[0];
  const hasValues = Object.values(formValues).some((value) => {
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some(Boolean);
    }
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
    onSave?.({ text: summary, registerType: registerType.key, incentiveName: formValues.incentiveName });
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
      <div className="crm-register-type-row" aria-label="Tipo de registro Staff">
        {STAFF_REGISTER_TYPES.map((type) => (
          <button
            key={type.key}
            className={
              type.key === registerType.key
                ? "crm-register-type-button crm-register-type-button--active"
                : "crm-register-type-button"
            }
            type="button"
            onClick={() => selectRegisterType(type.key)}
          >
            {type.label}
          </button>
        ))}
      </div>
      <div className="crm-field-grid crm-field-grid--contextual">
        {resolvedFields.map((field) => (
          <RegisterField
            key={field.key}
            field={field}
            scope={registerType.key}
            value={formValues[field.key]}
            onChange={(value) => updateValue(field.key, value)}
          />
        ))}
      </div>
      <div className="crm-register-actions">
        <button className="crm-register-save" disabled={!hasValues} type="button" onClick={saveRegister}>
          Guardar registro
        </button>
        <button className="crm-register-mail" disabled type="button">
          Enviar minuta por correo
        </button>
        <small>{hasValues ? "Quedara en la bitacora de esta cuenta." : "Completa al menos un campo para guardar."}</small>
      </div>
    </>
  );
}

function RegisterField({ field, onChange, scope, value }) {
  const listId = `crm-${scope}-${field.key}`;

  if (field.type === "textarea") {
    return (
      <label className="crm-field-grid__wide">
        <span>{field.label}</span>
        <textarea placeholder={field.placeholder ?? "Pendiente registrar"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label>
        <span>{field.label}</span>
        <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled>
            Seleccionar
          </option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "datalist") {
    return (
      <label>
        <span>{field.label}</span>
        <input list={listId} placeholder="Buscar o agregar persona" type="text" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
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
      <label className="crm-field-grid__wide">
        <span>{field.label}</span>
        <div className="crm-date-range">
          <input
            aria-label={`${field.label} inicio`}
            type="date"
            value={value?.start ?? ""}
            onChange={(event) => onChange({ ...(value ?? {}), start: event.target.value })}
          />
          <input
            aria-label={`${field.label} termino`}
            type="date"
            value={value?.end ?? ""}
            onChange={(event) => onChange({ ...(value ?? {}), end: event.target.value })}
          />
        </div>
      </label>
    );
  }

  if (field.type === "file") {
    return (
      <label className="crm-register-upload">
        <span>{field.label}</span>
        <input accept="image/*" multiple type="file" onChange={(event) => onChange(`${event.target.files?.length ?? 0} foto(s) adjuntas`)} />
        <small>Subir evidencia desde camara o galeria</small>
      </label>
    );
  }

  return (
    <label>
      <span>{field.label}</span>
      <input
        placeholder={field.placeholder ?? "Pendiente registrar"}
        type={field.type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
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

function ExecutionPillars({ activeKey = "", local, onSelectPillar }) {
  const pillars = ON_FIVE_MODULES.map((module) => ({
    ...module,
    ...(local.pillars[module.key] ?? {}),
  }));

  return (
    <div className="crm-pillar-grid">
      {pillars.map((pillar) => (
        <button
          key={pillar.key}
          className={pillar.key === activeKey ? "crm-pillar-card crm-pillar-card--active" : "crm-pillar-card"}
          type="button"
          onClick={() => onSelectPillar?.(pillar.key)}
        >
          <header>
            <span>{pillar.label}</span>
            <strong className={`crm-pill crm-pill--${getPillarTone(pillar.score)}`}>{pillar.score}</strong>
          </header>
          <h3>{pillar.summary}</h3>
        </button>
      ))}
    </div>
  );
}

function OnFiveStat({ label, note, tone = "", value }) {
  return (
    <article className="crm-onfive-stat">
      <span>{label}</span>
      {tone ? <strong className={`crm-pill crm-pill--${tone}`}>{value}</strong> : <strong>{value}</strong>}
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function VisitWall({ draftNote, notes, onDraftNoteChange, onPublishNote }) {
  return (
    <div className="crm-wall">
      <div className="crm-note-box">
        <textarea
          placeholder="Escribe que viste, que se acordo y cual es el proximo paso..."
          value={draftNote}
          onChange={(event) => onDraftNoteChange(event.target.value)}
        />
        <button type="button" onClick={onPublishNote}>
          Publicar minuta
        </button>
      </div>

      <div className="crm-note-list">
        {notes.map((note) => (
          <article key={note.id} className="crm-note">
            <header>
              <strong>{note.author}</strong>
              <span>{note.date}</span>
            </header>
            <small>{note.type}</small>
            <p>{note.text}</p>
            <footer>{note.nextAction}</footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function RequestList({ requests }) {
  return (
    <div className="crm-request-list">
      {requests.map((request) => (
        <article key={request.id} className="crm-request-row">
          <span>{request.status}</span>
          <strong>{request.local}</strong>
          <p>{request.type}</p>
          <small>{request.owner}</small>
        </article>
      ))}
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div className="crm-progress-row">
      <span>{label}</span>
      <strong>{value}%</strong>
      <div className="crm-progress crm-progress--wide">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function WalkerTable({ expanded = false, walkers = [], locals = [] }) {
  const walkerStats = walkers.map((walker) => {
    const misLocals  = locals.filter((l) => l.walkerName === walker.name || l.walker === walker.id);
    const total      = misLocals.length;
    const auditados  = misLocals.filter((l) =>
      l.pillars && Object.values(l.pillars).some((p) => p.lastAudit)
    ).length;
    const cobertura  = total > 0 ? Math.round((auditados / total) * 100) : 0;
    return { ...walker, total, auditados, cobertura };
  });

  return (
    <div className="crm-walker-table">
      {walkerStats.map((walker) => (
        <article key={walker.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "8px 16px", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid #F3F4F6" }}>
          <span>
            <strong style={{ fontSize: "0.84rem", color: "#111827" }}>{walker.name}</strong>
            {walker.area ? <small style={{ display: "block", color: "#9CA3AF", fontSize: "0.74rem" }}>{walker.area}</small> : null}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#6B7280", textAlign: "right" }}>{walker.total} cuentas</span>
          <span style={{ fontSize: "0.8rem", color: "#6B7280", textAlign: "right" }}>{walker.auditadas ?? walker.auditados} auditadas</span>
          <span style={{ fontSize: "0.84rem", fontWeight: 700, textAlign: "right", color: walker.cobertura >= 70 ? "#15803D" : walker.cobertura >= 40 ? "#B45309" : "#B91C1C" }}>
            {walker.cobertura}%
          </span>
          {expanded ? <small style={{ gridColumn: "1/-1", color: "#9CA3AF", fontSize: "0.74rem" }}>Cobertura de auditoría On Five</small> : null}
        </article>
      ))}
      {walkerStats.length === 0 && (
        <p style={{ color: "#9CA3AF", fontSize: "0.84rem", padding: "16px 0" }}>
          Sin walkers asignados. Sube el Excel en Configuración.
        </p>
      )}
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

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* Cristalería */}
      <div className="crm-onfive-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <SectionTitle kicker="Auditoria de branding" title="Cristaleria presente" />
          <span className={`crm-pill crm-pill--${tone}`}>{score}</span>
        </div>

        <div className="crm-branding-audit-grid">
          <fieldset className="crm-branding-fieldset">
            <legend>Johnnie Walker</legend>
            <label className="crm-menu-check-item">
              <input type="checkbox" checked={audit.jwHighball} onChange={() => toggle("jwHighball")} />
              <span><strong>Vaso Highball</strong><small>Copa alta para whisky</small></span>
            </label>
            <label className="crm-menu-check-item">
              <input type="checkbox" checked={audit.jwPhoenix} onChange={() => toggle("jwPhoenix")} />
              <span><strong>Phoenix (corto)</strong><small>Vaso bajo JW</small></span>
            </label>
          </fieldset>

          <fieldset className="crm-branding-fieldset">
            <legend>Tanqueray / Gordon&apos;s</legend>
            <label className="crm-menu-check-item">
              <input type="checkbox" checked={audit.tqCopa} onChange={() => toggle("tqCopa")} />
              <span><strong>Copa Tanqueray</strong></span>
            </label>
            <label className="crm-menu-check-item">
              <input type="checkbox" checked={audit.gordCopa} onChange={() => toggle("gordCopa")} />
              <span><strong>Copa Gordon&apos;s</strong></span>
            </label>
          </fieldset>

          <fieldset className="crm-branding-fieldset">
            <legend>Don Julio</legend>
            <label className="crm-menu-check-item">
              <input type="checkbox" checked={audit.djCatrina} onChange={() => toggle("djCatrina")} />
              <span><strong>Catrina</strong><small>Copa DJ</small></span>
            </label>
            <label className="crm-menu-check-item">
              <input type="checkbox" checked={audit.djShotCatrina} onChange={() => toggle("djShotCatrina")} />
              <span><strong>Shot Catrina</strong><small>Caballito DJ</small></span>
            </label>
          </fieldset>
        </div>

        <label className="crm-menu-check-item" style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <input type="checkbox" checked={audit.noAplicaCristaleria} onChange={() => toggle("noAplicaCristaleria")} />
          <span>
            <strong>No aplica cristaleria</strong>
            <small style={{ color: "var(--amber-tx)" }}>Requiere visacion de CP&A u On Trade Manager para no contar en el pilar</small>
          </span>
        </label>
      </div>

      {/* Neon */}
      <div className="crm-onfive-panel">
        <SectionTitle kicker="Auditoria de branding" title="Neon presente" />
        <div className="crm-menu-checklist" style={{ marginTop: 12 }}>
          {[
            { key: "neonJw", label: "Neon Johnnie Walker" },
            { key: "neonTq", label: "Neon Tanqueray" },
            { key: "neonDj", label: "Neon Don Julio" },
            { key: "neonGord", label: "Neon Gordon's" },
          ].map(({ key, label }) => (
            <label key={key} className="crm-menu-check-item">
              <input type="checkbox" checked={audit[key]} onChange={() => toggle(key)} />
              <span><strong>{label}</strong></span>
            </label>
          ))}
          <label className="crm-menu-check-item">
            <input type="checkbox" checked={Boolean(audit.neonOtro)} onChange={(e) => { if (!e.target.checked) setField("neonOtro", ""); }} />
            <span style={{ flex: 1 }}>
              <strong>Otro neon</strong>
              <input
                className="crm-branding-inline-input"
                placeholder="Especificar marca o tipo..."
                type="text"
                value={audit.neonOtro}
                onChange={(e) => setField("neonOtro", e.target.value)}
              />
            </span>
          </label>
        </div>

        <label className="crm-menu-check-item" style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <input type="checkbox" checked={audit.noAplicaNeon} onChange={() => toggle("noAplicaNeon")} />
          <span>
            <strong>No aplica neon</strong>
            <small style={{ color: "var(--amber-tx)" }}>Requiere visacion de CP&A u On Trade Manager</small>
          </span>
        </label>
      </div>

      {/* Foto + guardar */}
      <div className="crm-onfive-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
        <label className="crm-menu-photo-slot">
          <span>Foto de evidencia branding</span>
          <input accept="image/*" type="file" />
        </label>
        <button className="crm-menu-save-button" style={{ alignSelf: "end" }} type="button" onClick={saveAudit}>
          Guardar auditoria
        </button>
      </div>

      {/* Historial */}
      {logs.length > 0 && (
        <div className="crm-onfive-panel">
          <SectionTitle kicker="Historial" title="Auditorias guardadas" />
          <div className="crm-menu-eval-log">
            {logs.map((log) => (
              <article key={log.id} className="crm-menu-eval-post">
                <div className="crm-menu-eval-post__avatar">{initials(log.author)}</div>
                <div className="crm-menu-eval-post__body">
                  <header><strong>{log.author}</strong><span>{log.date}</span></header>
                  <div className="crm-menu-eval-post__pills">
                    <span className={`crm-pill crm-pill--${log.tone}`} style={{ fontSize: "0.74rem" }}>{log.score}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Solicitud a CP&A — multi-material */}
      <div className="crm-onfive-panel">
        <SectionTitle kicker="Solicitud a CP&A" title="Pedir material de marca" />
        <p style={{ fontSize: "0.82rem", color: "var(--text-2)", margin: "0 0 14px" }}>
          Agrega uno o más materiales. La solicitud llega al portal CP&A con todos los datos de la cuenta.
        </p>

        {/* Stock catalog + add to cart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 8, alignItems: "end", marginBottom: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Material</span>
            <select value={cartMaterial} onChange={(e) => setCartMaterial(e.target.value)} style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }}>
              <option value="">Elegir material...</option>
              {BRANDING_MATERIALS_CATALOG.map((m) => (
                <option key={m.code} value={m.code}>{m.code} — {m.name} (Stock: {m.stock})</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Cant.</span>
            <input type="number" min="1" max="99" value={cartQty} onChange={(e) => setCartQty(Number(e.target.value))}
              style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none", textAlign: "center" }} />
          </label>
          <button type="button" onClick={addToCart} disabled={!cartMaterial}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: cartMaterial ? "var(--accent)" : "#D1D5DB", color: "#fff", cursor: cartMaterial ? "pointer" : "not-allowed", fontSize: "0.84rem", fontWeight: 600, alignSelf: "end" }}>
            + Agregar
          </button>
        </div>

        {/* Cart */}
        {cartItems.length > 0 && (
          <div style={{ background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB", marginBottom: 12 }}>
            {cartItems.map((item) => (
              <div key={item.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid #F3F4F6", fontSize: "0.82rem" }}>
                <code style={{ fontSize: "0.68rem", background: "#E5E7EB", borderRadius: 4, padding: "2px 6px", fontFamily: "monospace", color: "#374151" }}>{item.code}</code>
                <span style={{ flex: 1, color: "#111827" }}>{item.name}</span>
                <strong style={{ color: "#111827" }}>×{item.qty}</strong>
                <button type="button" onClick={() => removeFromCart(item.code)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "1rem", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <label style={{ display: "grid", gap: 4, marginBottom: 12 }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Notas de entrega</span>
          <input type="text" placeholder="Ej: Dejar con el bartender de turno, entrada por Av. Italia" value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }} />
        </label>

        <button className="crm-menu-save-button" disabled={cartItems.length === 0} type="button" onClick={sendRequest}>
          {reqSent ? "✓ Solicitud enviada a CP&A" : `Enviar solicitud${cartItems.length > 0 ? ` (${cartItems.length} ítem${cartItems.length > 1 ? "s" : ""})` : ""}`}
        </button>

        {requests.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            <span className="crm-eyebrow">Solicitudes enviadas</span>
            {requests.map((req) => (
              <div key={req.id} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 0", borderTop: "1px solid var(--border)", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "var(--text-1)" }}>{req.items.length} material{req.items.length > 1 ? "es" : ""} · {req.date}</strong>
                  <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.74rem" }}>{req.status}</span>
                </div>
                {req.items.map((i) => <span key={i.code} style={{ color: "var(--text-2)", fontSize: "0.78rem" }}>{i.code} — {i.name} ×{i.qty}</span>)}
                {req.deliveryNotes && <span style={{ color: "var(--text-3)", fontSize: "0.76rem" }}>Notas: {req.deliveryNotes}</span>}
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

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* Resumen activo */}
      {activeNow.length > 0 && (
        <div className="crm-onfive-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle kicker="En curso" title="Activaciones activas" />
            <span className="crm-pill crm-pill--good">{activeNow.length} activa{activeNow.length > 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {activeNow.slice(0, 3).map((act) => (
              <div key={act.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: "0.84rem" }}>
                <span className="crm-pill crm-pill--violet" style={{ fontSize: "0.74rem", flexShrink: 0 }}>{act.typeLabel ?? act.label}</span>
                <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{act.brand ?? ""}</span>
                {act.mechanic && <span style={{ color: "var(--text-2)", fontSize: "0.78rem", flex: 1 }}>{act.mechanic}</span>}
                {act.dateEnd && <span style={{ color: "var(--text-3)", fontSize: "0.76rem", flexShrink: 0 }}>Hasta {act.dateEnd}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nueva activacion */}
      <div className="crm-onfive-panel">
        <SectionTitle kicker="Registro" title="Nueva activacion" />

        {/* Tipo — selector visual */}
        <div className="crm-activation-type-grid">
          {ACTIVATION_TYPES.map((t) => (
            <button
              key={t.key}
              className={`crm-activation-type-btn${form.type === t.key ? " crm-activation-type-btn--active" : ""}`}
              type="button"
              onClick={() => setField("type", t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="crm-field-grid crm-activation-fields">
          <div className="crm-activation-row-3">
            <label>
              <span>Marca</span>
              <select value={form.brand} onChange={(e) => setField("brand", e.target.value)}>
                <option value="">Seleccionar marca...</option>
                {ACTIVATION_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label>
              <span>Fecha inicio</span>
              <input type="date" value={form.dateStart} onChange={(e) => setField("dateStart", e.target.value)} />
            </label>
            <label>
              <span>Fecha termino</span>
              <input type="date" value={form.dateEnd} onChange={(e) => setField("dateEnd", e.target.value)} />
            </label>
          </div>

          <label>
            <span>Mecanica</span>
            <textarea
              placeholder="Ej: 2x1 en gin tonic de lunes a jueves de 19 a 21 hrs. Con carta especial en barra."
              rows={3}
              value={form.mechanic}
              onChange={(e) => setField("mechanic", e.target.value)}
            />
          </label>

          <div className="crm-activation-footer">
            <label className="crm-activation-photo-zone">
              <input accept="image/*" style={{ display: "none" }} type="file" />
              <span>+ Adjuntar foto</span>
            </label>
            <button
              type="button"
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-md)", background: noActivation ? "var(--surface-1,#f4f6f5)" : "none", cursor: "pointer", fontSize: "0.82rem", color: "var(--text-2)", fontWeight: noActivation ? 700 : 400 }}
              onClick={markNoActivation}
            >
              {noActivation ? "✓ Sin activación registrado" : "No tiene activación"}
            </button>
            <button
              className="crm-menu-save-button"
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
        <div className="crm-onfive-panel" style={{ border: "1.5px solid #F59E0B", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: "1rem" }}>⚠️</span>
            <SectionTitle kicker="Pendiente de cierre" title="Activaciones vencidas — reportar resultados" />
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-2)", marginBottom: 14 }}>
            Estas activaciones terminaron. Para darlas por ejecutadas debes reportar los resultados.
          </p>
          {expiredNeedingResults.map((act) => {
            const rf = resultForms[act.id] ?? { unitsSold: "", notes: "" };
            return (
              <div key={act.id} style={{ padding: "12px 14px", background: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{act.typeLabel ?? act.label}</strong>
                  <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.74rem" }}>{act.brand}</span>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-3)", marginLeft: "auto" }}>Terminó {act.dateEnd}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                      {act.brand ? `Unidades ${act.brand} vendidas` : "Unidades vendidas"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ej: 24"
                      value={rf.unitsSold}
                      onChange={(e) => setResultForms((prev) => ({ ...prev, [act.id]: { ...rf, unitsSold: e.target.value } }))}
                      style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Notas de resultado</span>
                    <input
                      type="text"
                      placeholder="Ej: Buena recepción, quieren repetir"
                      value={rf.notes}
                      onChange={(e) => setResultForms((prev) => ({ ...prev, [act.id]: { ...rf, notes: e.target.value } }))}
                      style={{ border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none" }}
                    />
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
                  style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: rf.unitsSold ? "#059669" : "#D1D5DB", color: "#fff", cursor: rf.unitsSold ? "pointer" : "not-allowed", fontSize: "0.82rem", fontWeight: 600 }}
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
        <div className="crm-onfive-panel">
          <SectionTitle kicker="Historial" title="Activaciones registradas" />
          <div className="crm-menu-eval-log">
            {activations.map((act) => (
              <article key={act.id} className="crm-menu-eval-post">
                <div className="crm-menu-eval-post__avatar">{initials(act.author ?? "W")}</div>
                <div className="crm-menu-eval-post__body">
                  <header>
                    <strong>{act.author ?? "Sistema"}</strong>
                    <span>{act.date}</span>
                  </header>
                  <div className="crm-menu-eval-post__pills">
                    <span className="crm-pill crm-pill--violet" style={{ fontSize: "0.74rem" }}>{act.typeLabel ?? act.label}</span>
                    {act.brand && <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.74rem" }}>{act.brand}</span>}
                    {act.results && <span className="crm-pill crm-pill--good" style={{ fontSize: "0.74rem" }}>✓ Cerrada · {act.results.unitsSold} unid.</span>}
                    {act.dateEnd && act.dateEnd < today && !act.results && <span className="crm-pill crm-pill--warning" style={{ fontSize: "0.74rem" }}>Vencida</span>}
                  </div>
                  {act.mechanic && <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-2)" }}>{act.mechanic}</p>}
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
  const colStyle = { padding: "9px 12px", fontSize: "0.8rem", verticalAlign: "middle", borderBottom: "1px solid #F3F4F6" };
  const headStyle = { padding: "8px 12px", fontSize: "0.72rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" };

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".06em" }}>CP&A · Branding</span>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "3px 0 0", color: "#111827" }}>Solicitudes de materiales</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {pending > 0 && <span className="crm-pill crm-pill--warning">{pending} pendiente{pending > 1 ? "s" : ""}</span>}
          <button onClick={exportExcel} type="button" style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 500, color: "#374151" }}>
            ↓ Exportar Excel
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#EFF6FF", borderRadius: 8, border: "1px solid #BFDBFE" }}>
          <span style={{ fontSize: "0.84rem", color: "#1D4ED8", fontWeight: 600 }}>{selected.size} seleccionadas</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} style={{ border: "1px solid #BFDBFE", borderRadius: 6, padding: "4px 8px", fontSize: "0.82rem", background: "#fff" }}>
            {["Pendiente", "En tránsito", "Entregado"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={applyBulk} type="button" style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#2563EB", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
            Aplicar
          </button>
          <button onClick={() => setSelected(new Set())} type="button" style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 6, border: "1px solid #BFDBFE", background: "none", cursor: "pointer", fontSize: "0.8rem", color: "#6B7280" }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
      <div className="crm-branding-table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...headStyle, width: 36 }}>
                <input type="checkbox" checked={selected.size === requests.length} onChange={toggleAll} style={{ cursor: "pointer" }} />
              </th>
              <th style={headStyle}>Cuenta</th>
              <th style={headStyle}>Materiales</th>
              <th style={headStyle}>Contacto</th>
              <th style={headStyle}>Notas de entrega</th>
              <th style={headStyle}>Fecha</th>
              <th style={{ ...headStyle, width: 140 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} style={{ background: selected.has(req.id) ? "#EFF6FF" : "transparent" }}>
                <td style={colStyle}>
                  <input type="checkbox" checked={selected.has(req.id)} onChange={() => toggleSelect(req.id)} style={{ cursor: "pointer" }} />
                </td>
                <td style={colStyle}>
                  <strong style={{ display: "block", fontSize: "0.84rem", color: "#111827" }}>{req.local}</strong>
                  <span style={{ fontSize: "0.76rem", color: "#6B7280" }}>{req.address}</span>
                  <span style={{ fontSize: "0.76rem", color: "#6B7280", display: "block" }}>Walker: {req.walker}</span>
                </td>
                <td style={colStyle}>
                  {req.items.map((item) => (
                    <div key={item.code} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <code style={{ fontSize: "0.68rem", background: "#F3F4F6", borderRadius: 4, padding: "1px 5px", color: "#374151", fontFamily: "monospace" }}>{item.code}</code>
                      <span style={{ fontSize: "0.8rem" }}>{item.name}</span>
                      <strong style={{ fontSize: "0.8rem", color: "#111827" }}>×{item.qty}</strong>
                    </div>
                  ))}
                </td>
                <td style={{ ...colStyle, fontSize: "0.8rem", color: "#374151" }}>{req.contact}</td>
                <td style={{ ...colStyle, fontSize: "0.8rem", color: "#6B7280", maxWidth: 180 }}>{req.deliveryNotes}</td>
                <td style={{ ...colStyle, fontSize: "0.78rem", color: "#6B7280" }}>{req.date}</td>
                <td style={colStyle}>
                  <select
                    value={req.status}
                    onChange={(e) => updateStatus(req.id, e.target.value)}
                    style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 8px", fontSize: "0.8rem", background: req.status === "Entregado" ? "#F0FDF4" : req.status === "En tránsito" ? "#EFF6FF" : "#FFFBEB", color: req.status === "Entregado" ? "#15803D" : req.status === "En tránsito" ? "#1D4ED8" : "#92400E", fontWeight: 600, cursor: "pointer" }}
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

function ConfigView({ excelMeta, excelError, onUpload, localsData, walkers, onAddManualLocal, assortmentConfig, onSaveAssortmentConfig, onUpdateAccount }) {
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

  const inputStyle = { border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none", width: "100%" };
  const labelStyle = { display: "grid", gap: 4 };
  const eyebrowStyle = { fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" };

  const CONFIG_SECTIONS = [
    { id: "maestro",     label: "Maestro de cuentas",   icon: "📂", desc: "Carga del Excel maestro" },
    { id: "walkers",     label: "Walkers y DBAs",        icon: "👥", desc: "Equipo de terreno" },
    { id: "assortment",  label: "Portafolio Assortment", icon: "🍾", desc: "Portafolio por segmento" },
    { id: "weights",     label: "Pesos On Five",         icon: "⚖️", desc: "Ponderación del score" },
    { id: "cuentas",     label: "Segmento por cuenta",   icon: "🏪", desc: "Segmento y tipo de outlet" },
    { id: "manual",      label: "Agregar cuenta manual", icon: "➕", desc: "Alta manual de PDV" },
  ];
  const [configSection, setConfigSection] = useState("maestro");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 0, background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 10, overflow: "hidden", minHeight: 600 }}>

      {/* ── Panel izquierdo — lista de secciones ── */}
      <div style={{ borderRight: "0.5px solid #E5E7EB", padding: "8px 0" }}>
        <div style={{ padding: "16px 20px 12px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".06em" }}>BARRA · CP&A</span>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: "3px 0 0" }}>Configuración</h2>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 8px" }}>
          {CONFIG_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setConfigSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 7, border: "none", cursor: "pointer", textAlign: "left",
                background: configSection === s.id ? "#F3F4F6" : "transparent",
                fontWeight: configSection === s.id ? 600 : 400,
                color: configSection === s.id ? "#111827" : "#374151",
                fontSize: "0.86rem",
                transition: "background 100ms",
              }}
            >
              <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.label}</span>
              {configSection === s.id && <span style={{ color: "#9CA3AF", fontSize: "0.8rem" }}>›</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Panel derecho — contenido de la sección activa ── */}
      <div style={{ padding: "28px 32px", overflowY: "auto" }}>

      {configSection === "maestro" && (<>
      {/* ── Carga del Excel ── */}
      <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <span className="crm-eyebrow">CP&A · Administración</span>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 4px", letterSpacing: "-.02em" }}>
              Maestro de cuentas
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: "0.84rem", margin: 0, lineHeight: 1.5 }}>
              Solo CP&A puede cargar o actualizar la cartera. Los Walkers ven la data lista al ingresar.
            </p>
          </div>
          {excelMeta ? (
            <span className="crm-pill crm-pill--good" style={{ flexShrink: 0 }}>
              ✓ {excelMeta.count} cuentas · {excelMeta.fileName}
            </span>
          ) : (
            <span className="crm-pill crm-pill--soft" style={{ flexShrink: 0 }}>Sin datos cargados</span>
          )}
        </div>

        <label style={{ cursor: "pointer" }}>
          <div style={{
            border: `2px dashed ${excelMeta ? "var(--accent-mid)" : "var(--border-md)"}`,
            borderRadius: "var(--radius-card)",
            padding: "22px 26px",
            background: excelMeta ? "var(--accent-lt)" : "var(--canvas)",
            display: "flex", alignItems: "center", gap: 16, transition: "all .15s",
          }}>
            <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{excelMeta ? "✅" : "📂"}</span>
            <div>
              <strong style={{ fontSize: "0.9rem", display: "block", color: excelMeta ? "var(--accent)" : "var(--text-1)" }}>
                {excelMeta ? `${excelMeta.sheetName} — ${excelMeta.count} cuentas importadas` : "Arrastra o haz click para cargar el Excel"}
              </strong>
              <small style={{ color: "var(--text-3)", fontSize: "0.76rem" }}>
                {excelMeta ? "Haz click para reemplazar con un archivo nuevo" : "Formato .xlsx — debe tener columna CLIENTE ID como llave"}
              </small>
            </div>
          </div>
          <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onUpload} />
        </label>

        {excelError ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", color: "#dc2626", fontSize: "0.84rem", fontWeight: 600 }}>
            ⚠️ {excelError}
          </div>
        ) : null}
      </article>

      {/* ── Agregar cuenta manual ── (movido a sección propia) */}
      <article className="crm-card" style={{ padding: "22px 26px", gap: "14px", display: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span className="crm-eyebrow">CP&A · Cartera manual</span>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 4px", letterSpacing: "-.02em" }}>
              Agregar cuenta manualmente
            </h2>
          </div>
        </div>

        {justAdded && (
          <div style={{ background: "var(--accent-lt)", border: "1px solid var(--accent-mid)", borderRadius: 8, padding: "10px 14px", color: "var(--accent)", fontSize: "0.84rem", fontWeight: 600 }}>
            ✓ "{justAdded}" agregada a la cartera
          </div>
        )}

        {showForm && (
          <div style={{ display: "grid", gap: 16, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Nombre fantasía *</span>
                <input style={inputStyle} placeholder="Ej: Bar El Patrón" value={form.nombre}
                  onChange={(e) => setField("nombre", e.target.value)} />
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Razón social</span>
                <input style={inputStyle} placeholder="Ej: Sociedad Gastronómica..." value={form.razonSocial}
                  onChange={(e) => setField("razonSocial", e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Segmento</span>
                <select style={inputStyle} value={form.segmento} onChange={(e) => setField("segmento", e.target.value)}>
                  {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Subcanal</span>
                <select style={inputStyle} value={form.subcanal} onChange={(e) => setField("subcanal", e.target.value)}>
                  {SUBCANALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Walker asignado</span>
                <input style={inputStyle} list="config-walkers-list" placeholder="Nombre del Walker"
                  value={form.walkerName} onChange={(e) => setField("walkerName", e.target.value)} />
                <datalist id="config-walkers-list">
                  {(walkers || []).map((w) => <option key={w.id} value={w.name} />)}
                </datalist>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Comuna</span>
                <input style={inputStyle} placeholder="Ej: Providencia" value={form.comuna}
                  onChange={(e) => setField("comuna", e.target.value)} />
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Dirección</span>
                <input style={inputStyle} placeholder="Ej: Av. Italia 1234" value={form.direccion}
                  onChange={(e) => setField("direccion", e.target.value)} />
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Región</span>
                <input style={inputStyle} placeholder="07. Metropolitana" value={form.region}
                  onChange={(e) => setField("region", e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Acuerdo comercial</span>
                <select style={inputStyle} value={form.acuerdo} onChange={(e) => setField("acuerdo", e.target.value)}>
                  {ACUERDOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Fecha término AACC</span>
                <input style={inputStyle} type="date" value={form.fechaTermino}
                  onChange={(e) => setField("fechaTermino", e.target.value)} />
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>Código cliente</span>
                <input style={inputStyle} placeholder="Ej: 501094460" value={form.accountCode}
                  onChange={(e) => setField("accountCode", e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>SKUs (separados por coma)</span>
                <input style={inputStyle} placeholder="Ej: JWB, TQLD, DJB" value={form.skus}
                  onChange={(e) => setField("skus", e.target.value)} />
              </label>
              <label style={labelStyle}>
                <span style={eyebrowStyle}>URL menú (opcional)</span>
                <input style={inputStyle} placeholder="https://..." type="url" value={form.menuUrl}
                  onChange={(e) => setField("menuUrl", e.target.value)} />
              </label>
            </div>

            <label style={labelStyle}>
              <span style={eyebrowStyle}>Observación</span>
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} placeholder="Contexto relevante de la cuenta..."
                value={form.observacion} onChange={(e) => setField("observacion", e.target.value)} />
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.84rem" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={!form.nombre.trim()}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: form.nombre.trim() ? "var(--accent)" : "var(--border-md)", color: "#fff", cursor: form.nombre.trim() ? "pointer" : "default", fontSize: "0.84rem", fontWeight: 700 }}>
                Guardar cuenta
              </button>
            </div>
          </div>
        )}

        {/* Cuentas manuales ya creadas */}
        {manualAccounts.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "grid", gap: 8 }}>
            <span style={eyebrowStyle}>{manualAccounts.length} cuenta{manualAccounts.length > 1 ? "s" : ""} manual{manualAccounts.length > 1 ? "es" : ""}</span>
            {manualAccounts.map((acc) => (
              <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 10 }}>
                <span className="crm-avatar" style={{ width: 32, height: 32, fontSize: "0.72rem", flexShrink: 0 }}>{initials(acc.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: "0.88rem", display: "block" }}>{acc.name}</strong>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-3)" }}>{acc.segment} · {acc.district} · {acc.walkerName}</span>
                </div>
                <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.7rem", flexShrink: 0 }}>Manual</span>
                {acc.hasAacc && <span className="crm-pill crm-pill--gold" style={{ fontSize: "0.7rem" }}>{acc.agreement}</span>}
              </div>
            ))}
          </div>
        )}
      </article>

      {/* ── Asignación por Walker ── */}
      {walkerStats.length > 0 ? (
        <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: "14px" }}>
          <div>
            <span className="crm-eyebrow">Carteras cargadas</span>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 4px", letterSpacing: "-.02em" }}>
              {walkerStats.length} Walkers · {localsData.length} cuentas totales
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: "0.84rem", margin: 0 }}>
              Cada hoja del Excel corresponde a un Walker. Los filtros en el sidebar permiten ver la cartera individual.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {walkerStats.map((w) => {
              const healthColor = w.avgHealth >= 76 ? "#16a34a" : w.avgHealth >= 60 ? "#d97706" : "#dc2626";
              return (
                <div key={w.id} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center", gap: 14, padding: "12px 16px",
                  background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 10,
                }}>
                  <span className="crm-avatar" style={{ width:36, height:36, fontSize:"0.78rem", flexShrink:0 }}>
                    {initials(w.name)}
                  </span>
                  <div>
                    <strong style={{ fontSize:"0.9rem", display:"block" }}>{w.name}</strong>
                    <span style={{ fontSize:"0.75rem", color:"var(--text-3)" }}>
                      {w.count} cuentas · {w.aaccCount} AACC · {w.gapsCount} gaps Menú · Health prom.{" "}
                      <strong style={{ color: healthColor }}>{w.avgHealth}</strong>
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    <span className="crm-pill crm-pill--soft" style={{ fontSize:"0.7rem" }}>{w.count} cuentas</span>
                    {w.aaccCount > 0 && <span className="crm-pill crm-pill--gold" style={{ fontSize:"0.7rem" }}>{w.aaccCount} AACC</span>}
                    {w.gapsCount > 0 && <span className="crm-pill crm-pill--warning" style={{ fontSize:"0.7rem" }}>{w.gapsCount} gaps</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ) : (
        <article className="crm-card" style={{ padding: "28px", textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>👆</div>
          <strong style={{ fontSize: "0.95rem", display: "block" }}>Carga el Excel para ver la asignación por Walker</strong>
          <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginTop: 6 }}>
            La cartera se distribuirá automáticamente según el campo "Desarrollador Sell Out".
          </p>
        </article>
      )}

      </>)}

      {configSection === "walkers" && <UserRolesSection />}
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
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>Agregar cuenta manual</h2>
          <p style={{ color: "#6B7280", fontSize: "0.84rem", margin: 0 }}>Da de alta un PDV que no está en el Excel maestro.</p>
        </div>
        <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: "16px" }}>
          {justAdded && (
            <div style={{ background: "var(--accent-lt)", border: "1px solid var(--accent-mid)", borderRadius: 8, padding: "10px 14px", color: "var(--accent)", fontSize: "0.84rem", fontWeight: 600 }}>
              ✓ "{justAdded}" agregada a la cartera
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={labelStyle}><span style={eyebrowStyle}>Nombre fantasía *</span>
              <input style={inputStyle} placeholder="Ej: Bar El Patrón" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} /></label>
            <label style={labelStyle}><span style={eyebrowStyle}>Razón social</span>
              <input style={inputStyle} placeholder="Ej: Sociedad Gastronómica..." value={form.razonSocial} onChange={(e) => setField("razonSocial", e.target.value)} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={labelStyle}><span style={eyebrowStyle}>Segmento</span>
              <select style={inputStyle} value={form.segmento} onChange={(e) => setField("segmento", e.target.value)}>
                {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label style={labelStyle}><span style={eyebrowStyle}>Subcanal</span>
              <select style={inputStyle} value={form.subcanal} onChange={(e) => setField("subcanal", e.target.value)}>
                {SUBCANALES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label style={labelStyle}><span style={eyebrowStyle}>Walker asignado</span>
              <input style={inputStyle} placeholder="Nombre del walker" value={form.walkerName} onChange={(e) => setField("walkerName", e.target.value)} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={labelStyle}><span style={eyebrowStyle}>Comuna</span>
              <input style={inputStyle} placeholder="Ej: Providencia" value={form.comuna} onChange={(e) => setField("comuna", e.target.value)} /></label>
            <label style={labelStyle}><span style={eyebrowStyle}>Dirección</span>
              <input style={inputStyle} placeholder="Ej: Av. Italia 123" value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} /></label>
          </div>
          <label style={labelStyle}><span style={eyebrowStyle}>AACC</span>
            <select style={inputStyle} value={form.acuerdo} onChange={(e) => setField("acuerdo", e.target.value)}>
              {ACUERDOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select></label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setForm(emptyForm)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.84rem" }}>Limpiar</button>
            <button type="button" onClick={handleSave} disabled={!form.nombre.trim()}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: form.nombre.trim() ? "var(--accent)" : "var(--border-md)", color: "#fff", cursor: form.nombre.trim() ? "pointer" : "default", fontSize: "0.84rem", fontWeight: 700 }}>
              Guardar cuenta
            </button>
          </div>
          {manualAccounts.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "grid", gap: 8 }}>
              <span style={eyebrowStyle}>{manualAccounts.length} cuenta{manualAccounts.length > 1 ? "s" : ""} manual{manualAccounts.length > 1 ? "es" : ""}</span>
              {manualAccounts.map((acc) => (
                <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <span className="crm-avatar" style={{ width: 32, height: 32, fontSize: "0.72rem", flexShrink: 0 }}>{initials(acc.name)}</span>
                  <div style={{ flex: 1 }}><strong style={{ fontSize: "0.88rem", display: "block" }}>{acc.name}</strong>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-3)" }}>{acc.segment} · {acc.district} · {acc.walkerName}</span></div>
                  <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.7rem" }}>Manual</span>
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

  const inputS = {
    border: "1px solid var(--border-md)", borderRadius: 6, padding: "5px 8px",
    fontSize: "0.8rem", background: "var(--canvas)", outline: "none", cursor: "pointer",
  };

  return (
    <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <span className="crm-eyebrow">CP&A · Cartera</span>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 4px", letterSpacing: "-.02em" }}>
            Segmento y tipo de outlet por cuenta
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.84rem", margin: 0, lineHeight: 1.5 }}>
            Define el segmento y outlet de cada cuenta. Esto determina el portafolio de assortment que se le exige.
          </p>
        </div>
        <span className="crm-pill crm-pill--soft" style={{ flexShrink: 0, alignSelf: "center" }}>
          {localsData.length} cuentas
        </span>
      </div>

      {/* Buscador */}
      <input
        style={{ ...inputS, width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: "0.84rem" }}
        placeholder="Buscar por nombre, comuna o walker…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Tabla */}
      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-3)", fontSize: "0.84rem", textAlign: "center", padding: "16px 0" }}>
          Sin resultados. Carga el Excel o agrega cuentas manuales primero.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px 72px", gap: 8, padding: "4px 10px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Cuenta</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Segmento</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Outlet</span>
            <span />
          </div>

          {filtered.map((local) => {
            const dirty = isDirty(local);
            const saved = savedIds[local.id];
            return (
              <div key={local.id} style={{
                display: "grid", gridTemplateColumns: "1fr 160px 160px 72px",
                gap: 8, alignItems: "center", padding: "8px 10px",
                background: dirty ? "var(--accent-lt,#f0fdf4)" : "var(--canvas)",
                border: `1px solid ${dirty ? "var(--accent-mid,#86efac)" : "var(--border-sm,var(--border))"}`,
                borderRadius: 8, transition: "all .15s",
              }}>
                {/* Nombre */}
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: "0.86rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {local.name}
                  </strong>
                  <span style={{ fontSize: "0.73rem", color: "var(--text-3)" }}>
                    {local.district} · {local.walkerName}
                  </span>
                </div>

                {/* Segmento */}
                <select
                  style={inputS}
                  value={getEdit(local, "segment")}
                  onChange={(e) => setEdit(local.id, "segment", e.target.value)}
                >
                  <option value="">Sin segmento</option>
                  {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Subcanal / Outlet */}
                <select
                  style={inputS}
                  value={getEdit(local, "subcanal")}
                  onChange={(e) => setEdit(local.id, "subcanal", e.target.value)}
                >
                  <option value="">Sin outlet</option>
                  {SUBCANALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Guardar */}
                <button
                  type="button"
                  disabled={!dirty && !saved}
                  onClick={() => saveRow(local.id)}
                  style={{
                    padding: "6px 10px", borderRadius: 6, border: "none",
                    background: saved ? "#16a34a" : dirty ? "var(--accent,#16a34a)" : "var(--border-md)",
                    color: dirty || saved ? "#fff" : "var(--text-3)",
                    cursor: dirty ? "pointer" : "default",
                    fontSize: "0.78rem", fontWeight: 700, transition: "all .15s",
                  }}
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

function UserRolesSection() {
  const [walkersList, setWalkersList] = useState([
    { id: "w1", name: "Ana Garcia",   rut: "12.345.678-9", email: "ana.garcia@diageo.com",  ruta: "Ruta Oriente",      role: "walker" },
    { id: "w2", name: "Marcos Ruiz",  rut: "13.456.789-0", email: "marcos.ruiz@diageo.com", ruta: "Ruta Centro-Sur",   role: "walker" },
    { id: "w3", name: "Lucas Prima",  rut: "14.567.890-1", email: "lucas.prima@diageo.com",  ruta: "Ruta Centro-Norte", role: "walker" },
  ]);
  const [dbasList, setDbasList] = useState([
    { id: "d1", name: "Carlos Muñoz DBA",  email: "carlos.dba@partner.com", brand: "Tanqueray / Gordon's" },
    { id: "d2", name: "Valentina Soto DBA", email: "valentina.dba@partner.com", brand: "Don Julio" },
  ]);
  const [showWalkerForm, setShowWalkerForm] = useState(false);
  const [showDbaForm, setShowDbaForm] = useState(false);
  const emptyW = { name: "", rut: "", email: "", ruta: "" };
  const emptyD = { name: "", email: "", brand: "" };
  const [wForm, setWForm] = useState(emptyW);
  const [dForm, setDForm] = useState(emptyD);

  const inp = { border: "1px solid var(--border-md)", borderRadius: 8, padding: "7px 10px", fontSize: "0.84rem", background: "var(--canvas)", outline: "none", width: "100%" };
  const lbl = { display: "grid", gap: 4 };
  const eye = { fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" };

  return (
    <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: 20 }}>
      <div>
        <span className="crm-eyebrow">CP&A · Administración</span>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 2px" }}>Usuarios y roles</h2>
        <p style={{ color: "var(--text-2)", fontSize: "0.84rem", margin: 0 }}>Define los walkers y DBAs del equipo.</p>
      </div>

      {/* Walkers */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ fontSize: "0.9rem", color: "#111827" }}>Walkers</strong>
          <button type="button" onClick={() => setShowWalkerForm((v) => !v)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--accent)" }}>
            + Agregar Walker
          </button>
        </div>
        {showWalkerForm && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12, padding: "12px", background: "#F9FAFB", borderRadius: 8 }}>
            {[["name","Nombre completo","Ana García"],["rut","RUT","12.345.678-9"],["email","Email","ana@diageo.com"],["ruta","Ruta asignada","Ruta Oriente"]].map(([k,l,ph]) => (
              <label key={k} style={lbl}><span style={eye}>{l}</span>
                <input style={inp} placeholder={ph} value={wForm[k]} onChange={(e) => setWForm((f) => ({...f,[k]:e.target.value}))} />
              </label>
            ))}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setShowWalkerForm(false)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.8rem" }}>Cancelar</button>
              <button type="button" onClick={() => { if (!wForm.name.trim()) return; setWalkersList((prev) => [...prev, { ...wForm, id: `w-${Date.now()}`, role: "walker" }]); setWForm(emptyW); setShowWalkerForm(false); }}
                style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        )}
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", minWidth: 520 }}>
          <thead><tr style={{ background: "#F9FAFB" }}>
            {["Nombre","RUT","Email","Ruta",""].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #E5E7EB" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {walkersList.map((w) => (
              <tr key={w.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{w.name}</td>
                <td style={{ padding: "9px 10px", color: "#6B7280" }}>{w.rut}</td>
                <td style={{ padding: "9px 10px", color: "#6B7280" }}>{w.email}</td>
                <td style={{ padding: "9px 10px", color: "#6B7280" }}>{w.ruta}</td>
                <td style={{ padding: "9px 10px" }}><button type="button" onClick={() => setWalkersList((prev) => prev.filter((x) => x.id !== w.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "0.8rem" }}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {/* DBAs */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ fontSize: "0.9rem", color: "#111827" }}>DBAs (Desarrolladores de Marca)</strong>
          <button type="button" onClick={() => setShowDbaForm((v) => !v)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--accent)" }}>
            + Agregar DBA
          </button>
        </div>
        {showDbaForm && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12, padding: "12px", background: "#F9FAFB", borderRadius: 8 }}>
            {[["name","Nombre completo","Carlos Muñoz DBA"],["email","Email","carlos@partner.com"],["brand","Marcas asignadas","Tanqueray / Gordon's"]].map(([k,l,ph]) => (
              <label key={k} style={lbl}><span style={eye}>{l}</span>
                <input style={inp} placeholder={ph} value={dForm[k]} onChange={(e) => setDForm((f) => ({...f,[k]:e.target.value}))} />
              </label>
            ))}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setShowDbaForm(false)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border-md)", background: "none", cursor: "pointer", fontSize: "0.8rem" }}>Cancelar</button>
              <button type="button" onClick={() => { if (!dForm.name.trim()) return; setDbasList((prev) => [...prev, { ...dForm, id: `d-${Date.now()}` }]); setDForm(emptyD); setShowDbaForm(false); }}
                style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        )}
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", minWidth: 440 }}>
          <thead><tr style={{ background: "#F9FAFB" }}>
            {["Nombre","Email","Marcas",""].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #E5E7EB" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {dbasList.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{d.name}</td>
                <td style={{ padding: "9px 10px", color: "#6B7280" }}>{d.email}</td>
                <td style={{ padding: "9px 10px", color: "#6B7280" }}>{d.brand}</td>
                <td style={{ padding: "9px 10px" }}><button type="button" onClick={() => setDbasList((prev) => prev.filter((x) => x.id !== d.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "0.8rem" }}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </article>
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
    <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: 16 }}>
      <div>
        <span className="crm-eyebrow">CP&A · Configuración</span>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 2px" }}>Pesos ponderados On Five Score</h2>
        <p style={{ color: "var(--text-2)", fontSize: "0.84rem", margin: 0 }}>
          Define qué porcentaje aporta cada pilar al Health Score final de cada cuenta. Deben sumar exactamente 100%.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {Object.entries(weights).map(([key, val]) => (
          <div key={key} style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>{val.label}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--border-md)", borderRadius: 8, overflow: "hidden", background: "var(--canvas)" }}>
              <input
                type="number" min="0" max="100" value={val.weight}
                onChange={(e) => setWeights((prev) => ({ ...prev, [key]: { ...prev[key], weight: Number(e.target.value) } }))}
                style={{ border: "none", padding: "8px 10px", fontSize: "0.9rem", fontWeight: 700, background: "transparent", outline: "none", width: "100%", textAlign: "center" }}
              />
              <span style={{ padding: "8px 10px", fontSize: "0.84rem", color: "var(--text-3)", borderLeft: "1px solid var(--border-md)", background: "#F9FAFB" }}>%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${val.weight}%`, background: "#3B82F6", borderRadius: 99, transition: "width .2s" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: "0.86rem", fontWeight: 600, color: valid ? "#059669" : "#DC2626" }}>
          Total: {total}% {valid ? "✓ OK" : `— faltan ${100 - total}%`}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!valid}
          style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: valid ? "var(--accent)" : "#D1D5DB", color: "#fff", cursor: valid ? "pointer" : "not-allowed", fontSize: "0.84rem", fontWeight: 600 }}
        >
          {justSaved ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>
    </article>
  );
}

function AssortmentConfigSection({ assortmentConfig, onSave }) {
  const [localConfig, setLocalConfig] = useState(() => ({ ...DEFAULT_ASSORTMENT_CONFIG, ...assortmentConfig }));
  const [activeSegment, setActiveSegment] = useState(OT_SEGMENTS[0]);
  const [justSaved, setJustSaved] = useState(false);

  function toggleLabel(segmentKey, labelId) {
    setLocalConfig((prev) => {
      const current = prev[segmentKey] ?? [];
      const next = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
      return { ...prev, [segmentKey]: next };
    });
  }

  function handleSave() {
    onSave?.(localConfig);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const activeIds = localConfig[activeSegment] ?? [];
  const byCategory = OT_LABELS.reduce((acc, l) => {
    (acc[l.category] = acc[l.category] ?? []).push(l);
    return acc;
  }, {});

  return (
    <article className="crm-card" style={{ padding: "22px 26px", display: "grid", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <span className="crm-eyebrow">CP&A · Assortment</span>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 740, margin: "4px 0 4px", letterSpacing: "-.02em" }}>
            Portafolio objetivo por segmento
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.84rem", margin: 0, lineHeight: 1.5 }}>
            Define qué etiquetas debe tener cada segmento. El Walker las audita en terreno.
          </p>
        </div>
        <button
          type="button"
          className="crm-menu-save-button"
          onClick={handleSave}
          style={{ flexShrink: 0, alignSelf: "center" }}
        >
          {justSaved ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>

      {/* Selector de segmento */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {OT_SEGMENTS.map((seg) => (
          <button
            key={seg}
            type="button"
            className={activeSegment === seg ? "crm-pill crm-pill--active" : "crm-pill"}
            style={{ cursor: "pointer", border: "1px solid var(--border-md)", fontWeight: activeSegment === seg ? 700 : 400 }}
            onClick={() => setActiveSegment(seg)}
          >
            {seg} <span style={{ opacity: 0.6, fontWeight: 400 }}>({(localConfig[seg] ?? []).length})</span>
          </button>
        ))}
      </div>

      {/* Grilla de etiquetas */}
      <div style={{ display: "grid", gap: 16 }}>
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 8px" }}>{cat}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
              {items.map((item) => {
                const active = activeIds.includes(item.id);
                return (
                  <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: `1px solid ${active ? "var(--accent-mid)" : "var(--border-sm)"}`, background: active ? "var(--accent-lt)" : "var(--canvas)", cursor: "pointer", fontSize: "0.84rem", transition: "all .12s" }}>
                    <input type="checkbox" checked={active} onChange={() => toggleLabel(activeSegment, item.id)} style={{ width: 15, height: 15, accentColor: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontWeight: active ? 700 : 400, color: active ? "var(--accent)" : "var(--text-1)" }}>{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Innovaciones — siempre informativas */}
        <div>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 4px" }}>
            Innovaciones <span style={{ fontWeight: 400, textTransform: "none" }}>— siempre presentes en todas las cuentas, solo informativas</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
            {OT_INNOVATIONS.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1px dashed var(--border-md)", background: "var(--canvas)", fontSize: "0.84rem", opacity: 0.7 }}>
                <span style={{ width: 15, height: 15, borderRadius: 3, border: "1px dashed var(--border-md)", flexShrink: 0 }} />
                <span style={{ color: "var(--text-2)" }}>{item.name}</span>
                <span className="crm-pill crm-pill--soft" style={{ fontSize: "0.68rem", marginLeft: "auto" }}>Innov.</span>
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
