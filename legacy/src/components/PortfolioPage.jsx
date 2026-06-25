import GeneralViews from "./GeneralViews.jsx";

function PortfolioPage({
  fileSummary,
  onYearBasisChange,
  views,
  yearBasis,
}) {
  if (!fileSummary) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Vista general
        </span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          Sube un Excel para ver la cartera
        </h2>
        <p className="text-[13px] text-slate-500">
          La vista general resume venta, tendencia, categorías y clientes de toda la base cargada.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
