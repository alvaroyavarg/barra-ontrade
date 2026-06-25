import { supabase } from "../lib/supabase.js";

export async function saveAssortmentAudit(localId, audit) {
  const row = {
    local_id: localId,
    checked_ids: audit.checkedIds,
    saved_at: audit.savedAt,
    author: audit.author,
    present: audit.present,
    total: audit.total,
    pct: audit.pct,
  };
  const { error } = await supabase.from("assortment_audits").insert(row);
  if (error) throw error;
}

export async function fetchLatestAudit(localId) {
  const { data, error } = await supabase
    .from("assortment_audits")
    .select("*")
    .eq("local_id", localId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // no rows found — expected
    throw error;                                // real error — surface it
  }
  if (!data) return null;
  return {
    checkedIds: data.checked_ids,
    savedAt: data.saved_at,
    author: data.author,
    present: data.present,
    total: data.total,
    pct: data.pct,
  };
}
