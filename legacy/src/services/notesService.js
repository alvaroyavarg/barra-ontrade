import { supabase } from "../lib/supabase.js";

export async function fetchNotesByLocal(localId) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("local_id", localId)
    .order("note_date", { ascending: false });
  if (error) throw error;
  return data.map(rowToNote);
}

export async function addNote(localId, note) {
  const base = {
    id: note.id,
    local_id: localId,
    author: note.author,
    date_label: note.date,
    note_date: new Date().toISOString(),
    type: note.type ?? "Minuta",
    text: note.text,
    next_action: note.nextAction ?? "",
  };

  // Upsert is idempotent — safe if the same note is submitted twice (e.g., retry on slow network)
  let { error } = await supabase.from("notes").upsert({ ...base, photos: note.photos ?? [] }, { onConflict: "id" });
  if (error && (error.message?.includes("photos") || error.code === "42703")) {
    const retry = await supabase.from("notes").upsert(base, { onConflict: "id" });
    error = retry.error;
  }
  if (error) throw error;
}

export async function fetchAllNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("note_date", { ascending: false });
  if (error) throw error;
  return data.map(rowToNote);
}

function rowToNote(row) {
  return {
    id: row.id,
    author: row.author,
    date: row.date_label || new Date(row.note_date).toLocaleDateString("es-CL"),
    type: row.type,
    text: row.text,
    nextAction: row.next_action,
    localId: row.local_id,
    photos: row.photos ?? [],
  };
}

