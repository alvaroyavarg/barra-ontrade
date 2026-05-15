import { supabase } from "../lib/supabase.js";

export async function listUsers() {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createUser({ email, password, nombre, rol, walker_name }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa");

  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email, password, nombre, rol, walker_name }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Error al crear usuario");
  return json;
}

export async function deleteUser(userId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa");

  const res = await fetch("/api/delete-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Error al eliminar usuario");
  return json;
}
