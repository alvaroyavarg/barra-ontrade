import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
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
    return res.status(403).json({ error: "Solo CP&A puede listar usuarios" });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .neq("role", "cpa")
    .order("full_name");

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(data ?? []);
}
