import { supabase } from "../lib/supabase.js";

export async function fetchBrandingRequests() {
  const { data, error } = await supabase
    .from("branding_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(rowToRequest);
}

export async function submitBrandingRequest(req) {
  const { error } = await supabase
    .from("branding_requests")
    .insert(requestToRow(req));
  if (error) throw error;
}

export async function updateBrandingRequestStatus(id, status) {
  const { error } = await supabase
    .from("branding_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

function requestToRow(req) {
  return {
    id: req.id,
    local_id: req.localId ?? null,
    local_name: req.local ?? "",
    local_address: req.address ?? "",
    walker: req.walker ?? "",
    contact: req.contact ?? "",
    items: req.items ?? [],
    delivery_notes: req.deliveryNotes ?? "",
    status: req.status ?? "Pendiente",
    date_label: req.date ?? "",
  };
}

function rowToRequest(row) {
  return {
    id: row.id,
    localId: row.local_id,
    local: row.local_name,
    address: row.local_address,
    walker: row.walker,
    contact: row.contact,
    items: row.items ?? [],
    deliveryNotes: row.delivery_notes,
    status: row.status,
    date: row.date_label,
  };
}
