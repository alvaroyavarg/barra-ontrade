import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, routes } from "@/db/schema";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

function greeting(name?: string | null) {
  const hour = Number(
    new Intl.DateTimeFormat("es-CL", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Santiago",
    }).format(new Date()),
  );
  const saludo = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  return name ? `${saludo}, ${name.split(" ")[0]}` : saludo;
}

export default async function RutaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { role, routeId } = session.user;

  // Walker: solo su ruta. CP&A: todas (puede medir en cualquier cuenta).
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      comuna: clients.comuna,
      accountType: clients.accountType,
      isReserve: clients.isReserve,
      routeName: routes.name,
    })
    .from(clients)
    .innerJoin(routes, eq(clients.routeId, routes.id))
    .where(role === "walker" ? eq(clients.routeId, routeId ?? "") : undefined)
    .orderBy(asc(routes.name), asc(clients.name));

  const aaccCount = rows.filter((c) => c.accountType === "aacc").length;
  const today = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  }).format(new Date());

  return (
    <>
      <PageHeader
        title={greeting(session.user.name)}
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      />

      <div className="mb-6 flex gap-3">
        <div className="flex-1 rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="text-[32px] font-semibold leading-none">{rows.length}</p>
          <p className="mt-1.5 text-xs text-muted">Cuentas en cartera</p>
        </div>
        <div className="flex-1 rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="text-[32px] font-semibold leading-none">{aaccCount}</p>
          <p className="mt-1.5 text-xs text-muted">Cuentas AACC</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin cuentas asignadas"
          body="Tu ruta todavía no tiene cuentas. CP&A puede asignarte una ruta desde el panel de administración."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="tappable flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-semibold">{c.name}</p>
                  {c.accountType === "aacc" && <Badge kind="aacc" />}
                  {c.isReserve && <Badge kind="reserve" />}
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {c.comuna}
                  {role !== "walker" && ` · ${c.routeName}`}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted">Sin visitas aún</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
