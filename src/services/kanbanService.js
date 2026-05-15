import { supabase } from "../lib/supabase.js";

export async function fetchKanbanCards() {
  const { data, error } = await supabase
    .from("kanban_cards")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map(rowToCard);
}

export async function upsertKanbanCards(cards) {
  if (!cards.length) return;
  const rows = cards.map(cardToRow);
  const { error } = await supabase
    .from("kanban_cards")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function moveKanbanCard(cardId, columnId) {
  const { error } = await supabase
    .from("kanban_cards")
    .update({ column_id: columnId, updated_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) throw error;
}

function cardToRow(card) {
  return {
    id: card.id,
    local_id: card.localId ?? null,
    title: card.title,
    zone: card.zone ?? "",
    origin: card.origin ?? "",
    priority: card.priority ?? "Media",
    due: card.due ?? "",
    column_id: card.columnId ?? "todo",
    updated_at: new Date().toISOString(),
  };
}

function rowToCard(row) {
  return {
    id: row.id,
    localId: row.local_id,
    local: row.local_name ?? "",
    title: row.title,
    zone: row.zone,
    origin: row.origin,
    priority: row.priority,
    due: row.due,
    columnId: row.column_id,
  };
}
