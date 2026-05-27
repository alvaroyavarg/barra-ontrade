import { supabase } from "../lib/supabase.js";

export async function fetchLocals(walkerName) {
  let query = supabase
    .from("locals")
    .select("*, contacts(*), missions(*), pillars(*)")
    .order("name");
  if (walkerName) query = query.eq("walker_name", walkerName);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(rowToLocal);
}

async function upsertChunk(rows) {
  const { error } = await supabase.from("locals").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function upsertLocals(locals, onProgress) {
  // Deduplicate by id
  const seen = new Set();
  const unique = locals.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });

  // Upsert locals in parallel chunks of 10
  const CHUNK = 10;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    await Promise.all(chunk.map((l) => upsertChunk([localToRow(l)])));
    onProgress?.(Math.min(i + CHUNK, unique.length), unique.length);
  }

  // Upsert sub-tables in chunks to avoid overwhelming the connection
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    await Promise.all(chunk.map((local) => Promise.all([
      upsertContacts(local.id, local.contacts ?? []),
      upsertMissions(local.id, local.missions ?? []),
      upsertPillars(local.id, local.pillars ?? {}),
    ])));
  }
}

export async function upsertRoutesFromLocals(locals) {
  const names = [...new Set(locals.map((l) => l.ruta).filter(Boolean))];
  if (!names.length) return;
  const rows = names.map((name) => ({ name }));
  const { error } = await supabase.from("routes").upsert(rows, { onConflict: "name", ignoreDuplicates: true });
  if (error) throw new Error(`Error creando rutas: ${error.message}`);
}

export async function upsertContacts(localId, contacts) {
  for (const c of contacts) {
    const { error } = await supabase.from("contacts").upsert(
      { id: `${localId}-${c.id}`, local_id: localId, name: c.name, role: c.role ?? "", note: c.note ?? "", phone: c.phone ?? "" },
      { onConflict: "id" }
    );
    if (error) throw error;
  }
}

export async function upsertMissions(localId, missions) {
  for (const m of missions) {
    const { error } = await supabase.from("missions").upsert(
      { id: m.id, local_id: localId, title: m.title, origin: m.origin ?? "", impact: m.impact ?? "", reason: m.reason ?? "", status: m.status ?? "Sugerida", progress: m.progress ?? 0, next_step: m.nextStep ?? "" },
      { onConflict: "id" }
    );
    if (error) throw error;
  }
}

export async function upsertPillars(localId, pillarsObj) {
  for (const [pillar, data] of Object.entries(pillarsObj)) {
    const { error } = await supabase.from("pillars").upsert(
      { local_id: localId, pillar, score: data.score ?? "Sin registro", summary: data.summary ?? "", details: data.details ?? [], next_action: data.nextAction ?? "" },
      { onConflict: "local_id,pillar" }
    );
    if (error) throw error;
  }
}

export async function updatePillar(localId, pillar, data) {
  const { error } = await supabase
    .from("pillars")
    .upsert(
      {
        local_id: localId,
        pillar,
        score: data.score,
        summary: data.summary,
        details: data.details ?? [],
        next_action: data.nextAction ?? "",
        last_audit: data.lastAuditIso ?? (data.lastAudit ? new Date().toISOString() : undefined),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "local_id,pillar" }
    );
  if (error) throw error;
}

export async function updateMissionStatus(missionId, status, progress) {
  const { error } = await supabase
    .from("missions")
    .update({ status, progress, updated_at: new Date().toISOString() })
    .eq("id", missionId);
  if (error) throw error;
}

// ── Helpers row <-> app object ────────────────────────────────────────

export async function updateLocalRoute(localId, ruta) {
  const { error } = await supabase
    .from("locals")
    .update({ ruta, updated_at: new Date().toISOString() })
    .eq("id", localId);
  if (error) throw error;
}

export async function deleteAllLocals() {
  const { error } = await supabase.from("locals").delete().neq("id", "___none___");
  if (error) throw error;
}

export async function updateLocalHealthScore(localId, healthScore) {
  const { error } = await supabase
    .from("locals")
    .update({ health_score: healthScore, updated_at: new Date().toISOString() })
    .eq("id", localId);
  if (error) throw error;
}

export async function updateLocalAccountCode(localId, accountCode) {
  const { error } = await supabase
    .from("locals")
    .update({ account_code: accountCode, updated_at: new Date().toISOString() })
    .eq("id", localId);
  if (error) throw error;
}

export async function updateLocalWalkerName(localId, walkerName) {
  const { error } = await supabase
    .from("locals")
    .update({ walker_name: walkerName, updated_at: new Date().toISOString() })
    .eq("id", localId);
  if (error) throw error;
}

function localToRow(l) {
  return {
    id: l.id,
    account_code: l.accountCode || null,
    walker_name: l.walkerName ?? "",
    sheet_name: l.sheetName ?? "",
    legal_name: l.legalName ?? "",
    name: l.name,
    distributor: l.distributor ?? "",
    region: l.region ?? "",
    office: l.office ?? "",
    district: l.district ?? "",
    channel: l.channel ?? "",
    segment: l.segment ?? "",
    subchannel: l.subchannel ?? "",
    address: l.address ?? "",
    developer: l.developer ?? "",
    skus: l.skus ?? "",
    agreement: l.agreement ?? "",
    agreement_end_date: l.agreementEndDate ?? "",
    menu_url: l.menuUrl ?? "",
    observation: l.observation ?? "",
    occasion: l.occasion ?? "",
    health_score: l.healthScore ?? 50,
    has_aacc: l.hasAacc ?? false,
    investment: l.investment ?? 0,
    tags: l.tags ?? [],
    ruta: l.ruta ?? "",
    updated_at: new Date().toISOString(),
  };
}

const DEFAULT_PILLAR_KEYS = ["staff", "assortment", "menu", "branding", "activation"];

function rowToLocal(row) {
  const pillarsObj = {};
  for (const p of row.pillars ?? []) {
    pillarsObj[p.pillar] = {
      title: capitalize(p.pillar),
      score: p.score,
      summary: p.summary,
      details: p.details ?? [],
      nextAction: p.next_action,
      lastAudit: p.last_audit ?? null,
    };
  }
  for (const key of DEFAULT_PILLAR_KEYS) {
    if (!pillarsObj[key]) {
      pillarsObj[key] = {
        title: capitalize(key),
        score: "Sin registro",
        summary: "",
        details: [],
        nextAction: "",
      };
    }
  }

  return {
    id: row.id,
    accountCode: row.account_code,
    walkerName: row.walker_name,
    ruta: row.ruta ?? "",
    sheetName: row.sheet_name,
    legalName: row.legal_name,
    name: row.name,
    distributor: row.distributor,
    region: row.region,
    office: row.office,
    district: row.district,
    channel: row.channel,
    segment: row.segment,
    subchannel: row.subchannel,
    address: row.address,
    developer: row.developer,
    skus: row.skus,
    agreement: row.agreement,
    agreementEndDate: row.agreement_end_date,
    menuUrl: row.menu_url,
    observation: row.observation,
    occasion: row.occasion,
    healthScore: row.health_score ?? 50,
    hasAacc: row.has_aacc ?? false,
    investment: row.investment ?? 0,
    tags: row.tags ?? [],
    contacts: (row.contacts ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      note: c.note,
      phone: c.phone,
    })),
    kpis: [
      { label: "Cod. cliente", value: row.account_code, note: "llave venta real" },
      { label: "Segmento", value: row.segment, note: row.subchannel },
      { label: "Acuerdo", value: row.agreement, note: `Termino: ${row.agreement_end_date}` },
    ],
    monthlySales: [],
    missions: (row.missions ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      origin: m.origin,
      impact: m.impact,
      reason: m.reason,
      status: m.status,
      progress: m.progress,
      nextStep: m.next_step,
    })),
    pillars: pillarsObj,
    notes: [],
  };
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
