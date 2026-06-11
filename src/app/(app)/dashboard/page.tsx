import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const SCOPE_LABEL = {
  walker: "Tus resultados",
  manager: "Resultados del equipo",
  cpa: "Resultados del canal",
} as const;

const KPIS = [
  { label: "Score de ejecución", caption: "Promedio última visita por cuenta" },
  { label: "Compliance AACC", caption: "Cuentas AACC que cumplen el piso" },
  { label: "Visitas (30 días)", caption: "Visitas registradas en el período" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <>
      <PageHeader title="Dashboard" subtitle={SCOPE_LABEL[session.user.role]} />

      <div className="grid gap-3 md:grid-cols-3">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-card border border-border bg-surface p-5 shadow-card">
            <p className="text-sm font-medium text-muted">{kpi.label}</p>
            <p className="mt-3 text-[36px] font-semibold leading-none text-ink/30">—</p>
            <p className="mt-3 text-xs text-muted">{kpi.caption}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Los indicadores se llenan con las primeras visitas registradas en terreno.
      </p>
    </>
  );
}
