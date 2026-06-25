import { auth, signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const name = session?.user?.name ?? "";
  const role = session?.user?.role;
  const roleLabel = role === "manager" ? "Manager" : "Walker";

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 text-center shadow-soft">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-lg font-bold text-white">
          K3
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {name || "bienvenido"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sesión iniciada como <span className="font-medium text-ink">{roleLabel}</span>.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-700">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Fase 1 — auth lista
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <button className="h-11 w-full rounded-full border border-line text-sm font-semibold text-ink transition active:scale-[.98]">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
