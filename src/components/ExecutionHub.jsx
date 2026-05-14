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
    <section className="module-page execution-page" aria-label="Ejecucion PDV">
      <div className="module-topbar">
        <button className="back-button" type="button" onClick={onBackHome}>
          Volver al inicio
        </button>
        <span>Ejecucion PDV</span>
      </div>

      <div className="module-hero execution-hero">
        <span className="eyebrow">Pilar 3</span>
        <h1>Ejecucion PDV</h1>
        <p>El cierre del ciclo comercial: medir lo que pasa en carta, visita y punto de venta.</p>
      </div>

      <div className="execution-grid">
        {EXECUTION_PILLARS.map((pillar) => (
          <article key={pillar.title} className="execution-card">
            <span>{pillar.status}</span>
            <h2>{pillar.title}</h2>
            <p>{pillar.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ExecutionHub;
