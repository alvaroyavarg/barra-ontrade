import GeneralViews from "./GeneralViews.jsx";

function PortfolioPage({
  fileSummary,
  onYearBasisChange,
  views,
  yearBasis,
}) {
  if (!fileSummary) {
    return (
      <section className="card brief-empty">
        <span className="eyebrow">Vista general</span>
        <h2>Sube un Excel para ver la cartera</h2>
        <p>La vista general resume venta, tendencia, categorías y clientes de toda la base cargada.</p>
      </section>
    );
  }

  return (
    <div className="brief-stack">
      <GeneralViews
        scope="portfolio"
        scopeName="Toda la cartera cargada"
        views={views}
        yearBasis={yearBasis}
        onYearBasisChange={onYearBasisChange}
      />
    </div>
  );
}

export default PortfolioPage;
