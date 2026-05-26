import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify the caller is an authenticated CP&A user
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No autorizado" });

  const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !caller) return res.status(401).json({ error: "Token inválido" });

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || callerProfile.role !== "cpa") {
    return res.status(403).json({ error: "Solo CP&A puede crear usuarios" });
  }

  const { email, password, role, fullName, rut, phone, ruta, walkerName } = req.body;
  if (!email || !password || !role || !fullName) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  // Create the auth user (auto-confirmed, no email sent)
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) return res.status(400).json({ error: createError.message });

  // Insert profile row
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: newUser.user.id,
    role,
    full_name: fullName,
    rut: rut ?? "",
    phone: phone ?? "",
    ruta: ruta ?? "",
    walker_name: walkerName ?? "",
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return res.status(500).json({ error: profileError.message });
  }

  return res.status(200).json({ id: newUser.user.id, email, role });
}
