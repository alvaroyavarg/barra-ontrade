const PILLARS = [
  {
    key: "commercial",
    eyebrow: "Pilar 1",
    title: "Consulta Comercial PDV",
    description: "Brief comercial, comparativos, filtros y ficha por cuenta antes de negociar.",
  },
  {
    key: "aacc",
    eyebrow: "Pilar 2",
    title: "Rentabilidad AACC",
    description: "Seguimiento de acuerdos comerciales, ROI, margen, CAAP y decision por contrato.",
  },
  {
    key: "execution",
    eyebrow: "Pilar 3",
    title: "Ejecucion PDV",
    description: "Medicion de cartas con IA y reportes de ruta para cerrar la ejecucion en terreno.",
  },
];

function PlatformLanding({ onSelectModule }) {
  return (
    <section
      aria-label="BARRA · On Trade Execution"
      className="mx-auto flex w-full max-w-6xl flex-col gap-12 p-8"
    >
      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Diageo Chile · On Trade Execution
        </span>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900">🪩 BARRA</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <button
            key={pillar.key}
            type="button"
            onClick={() => onSelectModule(pillar.key)}
            className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {pillar.eyebrow}
            </span>
            <strong className="text-2xl font-semibold tracking-tight text-slate-900">
              {pillar.title}
            </strong>
            <small className="text-sm leading-relaxed text-slate-500">{pillar.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default PlatformLanding;
