import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, nombre, rol, walker_name } = req.body ?? {};
  if (!email || !password || !nombre || !rol) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // Verificar que el llamante es un usuario CP&A autenticado
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No autorizado" });

  const callerClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const { data: { user: caller } } = await callerClient.auth.getUser(token);
  if (!caller) return res.status(401).json({ error: "Token inválido" });

  const { data: callerProfile } = await callerClient
    .from("user_profiles")
    .select("rol")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || callerProfile.rol !== "cpa") {
    return res.status(403).json({ error: "Solo CP&A puede crear usuarios" });
  }

  // Crear usuario con el cliente admin (service_role — solo disponible server-side)
  const adminClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return res.status(400).json({ error: error.message });

  const { error: profileError } = await adminClient.from("user_profiles").insert({
    id: data.user.id,
    email,
    nombre,
    rol,
    walker_name: walker_name ?? "",
  });
  if (profileError) return res.status(400).json({ error: profileError.message });

  return res.status(200).json({ success: true, userId: data.user.id, nombre });
}
