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
    <section className="landing-page" aria-label="BARRA · On Trade Execution">
      <div className="landing-header">
        <span>Diageo Chile · On Trade Execution</span>
        <h1>🪩 BARRA</h1>
      </div>

      <div className="pillar-grid">
        {PILLARS.map((pillar) => (
          <button
            key={pillar.key}
            className={`pillar-card pillar-card--${pillar.key}`}
            type="button"
            onClick={() => onSelectModule(pillar.key)}
          >
            <span>{pillar.eyebrow}</span>
            <strong>{pillar.title}</strong>
            <small>{pillar.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default PlatformLanding;
