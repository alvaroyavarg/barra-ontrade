import { supabase } from "../lib/supabase.js";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa");
  return session.access_token;
}

export async function createUserFromAdmin({ email, password, role, fullName, rut, phone, ruta, walkerName }) {
  const token = await getToken();

  const res = await fetch("/api/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ email, password, role, fullName, rut, phone, ruta, walkerName }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al crear usuario");
  return data;
}

export async function fetchProfilesFromAdmin() {
  const token = await getToken();

  const res = await fetch("/api/list-users", {
    headers: { "Authorization": `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al obtener usuarios");
  return data;
}

export async function updateUserRole(userId, newRole) {
  const token = await getToken();

  const res = await fetch("/api/update-user-role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, newRole }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cambiar rol");
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
