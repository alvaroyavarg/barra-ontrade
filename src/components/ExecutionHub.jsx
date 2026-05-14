const EXECUTION_PILLARS = [
  {
    title: "Medicion de cartas con IA",
    status: "Proximo desarrollo",
    description: "Lectura de cartas, presencia de marcas, precios y oportunidades de portafolio.",
  },
  {
    title: "Reportes ruta PDV",
    status: "Proximo desarrollo",
    description: "Registro mobile de visitas, fotos, observaciones y acciones pendientes por cuenta.",
  },
];

function ExecutionHub({ onBackHome }) {
  return (
    <section
      aria-label="Ejecucion PDV"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8"
    >
      <div className="flex items-center gap-4 text-[13px] font-medium text-slate-500">
        <button
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          type="button"
          onClick={onBackHome}
        >
          Volver al inicio
        </button>
        <span>Ejecucion PDV</span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Pilar 3
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Ejecucion PDV</h1>
        <p className="text-[13px] text-slate-500">
          El cierre del ciclo comercial: medir lo que pasa en carta, visita y punto de venta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {EXECUTION_PILLARS.map((pillar) => (
          <article
            key={pillar.title}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {pillar.status}
            </span>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{pillar.title}</h2>
            <p className="text-[13px] text-slate-500">{pillar.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ExecutionHub;
