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
    return res.status(403).json({ error: "Solo CP&A puede editar usuarios" });
  }

  const { userId, fullName, phone, rut, ruta, password } = req.body;
  if (!userId) return res.status(400).json({ error: "userId requerido" });

  // Update profile fields
  const profileUpdate = {};
  if (fullName !== undefined) { profileUpdate.full_name = fullName; profileUpdate.walker_name = fullName; }
  if (phone    !== undefined) profileUpdate.phone = phone;
  if (rut      !== undefined) profileUpdate.rut   = rut;
  if (ruta     !== undefined) profileUpdate.ruta  = ruta;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);
    if (profileError) return res.status(500).json({ error: profileError.message });
  }

  // Update password if provided
  if (password && password.trim()) {
    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password.trim(),
    });
    if (pwError) return res.status(500).json({ error: pwError.message });
  }

  return res.status(200).json({ ok: true });
}
