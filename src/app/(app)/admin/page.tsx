import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, items, pillars, serves, users } from "@/db/schema";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const MODULES = [
  { title: "Framework Key 3", body: "Pilares, items, pesos, targets y piso AACC", phase: "Fase 3" },
  { title: "Drink Strategy", body: "Serves, referentes y price index", phase: "Fase 3" },
  { title: "Base de clientes", body: "Carga CSV, edición inline, flags AACC y Reserve", phase: "Fase 3" },
  { title: "Usuarios y rutas", body: "Crear usuarios, asignar roles y rutas", phase: "Fase 3" },
  { title: "Configuración", body: "Umbrales de score, reglas del formulario de visita", phase: "Fase 3" },
];

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "cpa") redirect("/"); // refuerzo del middleware

  const [[pillarCount], [itemCount], [serveCount], [clientCount], [userCount]] = await Promise.all([
    db.select({ n: count() }).from(pillars).where(eq(pillars.active, true)),
    db.select({ n: count() }).from(items).where(eq(items.active, true)),
    db.select({ n: count() }).from(serves).where(eq(serves.active, true)),
    db.select({ n: count() }).from(clients).where(eq(clients.active, true)),
    db.select({ n: count() }).from(users).where(eq(users.active, true)),
  ]);

  const stats = [
    { label: "Pilares", value: pillarCount.n },
    { label: "Items de medición", value: itemCount.n },
    { label: "Serves", value: serveCount.n },
    { label: "Clientes", value: clientCount.n },
    { label: "Usuarios", value: userCount.n },
  ];

  return (
    <>
      <PageHeader title="Administración" subtitle="Configuración del framework y del canal" />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-surface p-4 shadow-card">
            <p className="text-[28px] font-semibold leading-none">{s.value}</p>
            <p className="mt-1.5 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MODULES.map((m) => (
          <div key={m.title} className="rounded-card border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold">{m.title}</h2>
              <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent">
                {m.phase}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted">{m.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
