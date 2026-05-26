import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            🪩
          </div>
          <div className="text-center">
            <strong className="block text-[22px] font-bold tracking-tight text-white">BARRA</strong>
            <span className="text-[13px] text-slate-400">On Trade Execution · Diageo Chile</span>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <div>
            <h1 className="text-[18px] font-semibold text-white">Iniciar sesión</h1>
            <p className="mt-0.5 text-[13px] text-slate-400">Ingresa con tus credenciales de acceso</p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-300">
              {error}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-[15px] text-white placeholder-slate-500 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-[15px] text-white placeholder-slate-500 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-slate-600">
          Si no tienes acceso contacta a tu CP&amp;A
        </p>
      </div>
    </div>
  );
}
