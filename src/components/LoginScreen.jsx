import { useState } from "react";
import { signIn } from "../lib/auth.js";
import { isSupabaseEnabled } from "../lib/supabase.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos"
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">

        {/* Logo / marca */}
        <div className="mb-8 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            BARRA · On Trade Execution
          </span>
          <h1 className="mt-2 text-[28px] font-black tracking-tight text-white">
            Diageo Chile
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
        >
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tu@diageo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
              {error}
            </p>
          )}

          {!isSupabaseEnabled && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-400">
              Supabase no configurado — modo sin conexión
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !isSupabaseEnabled}
            className="mt-1 w-full rounded-lg bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          Acceso restringido · Solo personal autorizado Diageo
        </p>
      </div>
    </div>
  );
}
