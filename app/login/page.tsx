"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-lg font-bold text-white">
            K3
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Key 3</h1>
          <p className="mt-1 text-sm text-muted">Ingresa para continuar</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-line bg-card p-6 shadow-soft"
        >
          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            placeholder="tucorreo@empresa.cl"
          />

          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            placeholder="••••••••"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-bad/10 px-3 py-2 text-sm font-medium text-bad">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 h-12 w-full rounded-full bg-accent text-[15px] font-semibold text-white transition active:scale-[.98] disabled:opacity-60"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
