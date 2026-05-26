import { supabase } from "../lib/supabase.js";

export async function createUserFromAdmin({ email, password, role, fullName, rut, phone, ruta, walkerName }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa");

  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ email, password, role, fullName, rut, phone, ruta, walkerName }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al crear usuario");
  return data;
}

export async function fetchProfiles(role) {
  let query = supabase.from("profiles").select("*").order("full_name");
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchRoutes() {
  const { data, error } = await supabase.from("routes").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function addRoute(name) {
  const { error } = await supabase.from("routes").insert({ name: name.trim() });
  if (error) throw error;
}

export async function deleteRoute(id) {
  const { error } = await supabase.from("routes").delete().eq("id", id);
  if (error) throw error;
}
