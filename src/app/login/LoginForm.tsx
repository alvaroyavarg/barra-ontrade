"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (res?.error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <label className="block text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] outline-none transition-colors duration-200 focus:border-accent focus:ring-2 focus:ring-accent-soft"
        placeholder="tu@email.cl"
      />

      <label className="mt-4 block text-sm font-medium" htmlFor="password">
        Contraseña
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] outline-none transition-colors duration-200 focus:border-accent focus:ring-2 focus:ring-accent-soft"
        placeholder="••••••••"
      />

      {error && (
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="tappable mt-5 h-11 w-full rounded-pill bg-accent text-[15px] font-medium text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
