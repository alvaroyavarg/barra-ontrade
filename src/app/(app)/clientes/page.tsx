import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, routes } from "@/db/schema";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // Vista global solo para manager / CP&A; el walker trabaja desde /ruta
  if (session.user.role === "walker") redirect("/ruta");

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
    .orderBy(asc(routes.name), asc(clients.name));

  const byRoute = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byRoute.get(row.routeName) ?? [];
    list.push(row);
    byRoute.set(row.routeName, list);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${rows.length} cuentas · ${rows.filter((r) => r.accountType === "aacc").length} AACC`}
      />

      <div className="space-y-8">
        {[...byRoute.entries()].map(([routeName, list]) => (
          <section key={routeName}>
            <h2 className="mb-3 text-sm font-semibold text-muted">{routeName}</h2>
            <div className="space-y-3">
              {list.map((c) => (
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
                    <p className="mt-0.5 text-[13px] text-muted">{c.comuna}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted">Sin visitas aún</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
