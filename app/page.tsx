export default function Home() {
  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card shadow-soft p-8 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white text-lg font-bold">
          K3
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Key 3</h1>
        <p className="mt-2 text-sm text-muted">
          Plataforma de ejecución y medición del canal On Trade.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-700">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Fase 1 — en construcción
        </div>
      </div>
    </main>
  );
}
