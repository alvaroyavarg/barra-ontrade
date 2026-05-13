import { useState } from "react";
import { formatCurrency, formatNumber, formatSignedCurrency, formatTrendPercent, isFiniteNumber } from "../utils/formatters.js";

const VIEW_OPTIONS = [
  { key: "yearOverYearMonth", label: "Vs AA mes" },
  { key: "previousMonth", label: "Vs mes anterior" },
  { key: "yearToDate", label: "Vs AA YTD" },
];

const YEAR_BASIS_OPTIONS = [
  { key: "calendar", label: "Año calendario" },
  { key: "fiscal", label: "Año fiscal" },
];

function GeneralViews({ onYearBasisChange, scope = "portfolio", scopeName, views, yearBasis = "calendar" }) {
  const [activeViewKey, setActiveViewKey] = useState("yearOverYearMonth");

  if (!views) {
    return null;
  }

  const activeView = views[activeViewKey] ?? views.yearOverYearMonth;

  return (
    <section className="card general-card" aria-label="Vista general">
      <div className="general-header">
        <div className="section-heading">
          <span className="eyebrow">{scope === "customer" ? "Vista cuenta" : "Vista general"}</span>
          <h2>{activeView.title}</h2>
          {scopeName ? <p className="scope-label">{scopeName}</p> : null}
        </div>
        <div className="basis-control-group">
          <span>Base YTD</span>
          <div className="segmented-control segmented-control--two" role="radiogroup" aria-label="Base para YTD">
            {YEAR_BASIS_OPTIONS.map((option) => (
              <button
                key={option.key}
                aria-checked={yearBasis === option.key}
                className={yearBasis === option.key ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
                role="radio"
                type="button"
                onClick={() => onYearBasisChange?.(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="segmented-control" role="tablist" aria-label="Comparación general">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.key}
              aria-selected={activeViewKey === option.key}
              className={activeViewKey === option.key ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
              role="tab"
              type="button"
              onClick={() => setActiveViewKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activeView.available ? <AvailableView scope={scope} view={activeView} /> : <UnavailableView view={activeView} />}
    </section>
  );
}

function AvailableView({ scope, view }) {
  const metrics = [
    ["Venta período actual", formatCurrency(view.current.sales), "primary"],
    ["Venta período comparado", formatCurrency(view.comparison.sales), ""],
    ["Variación venta", formatTrendPercent(view.salesTrend), getTrendTone(view.salesTrend)],
    ["CF período actual", formatNumber(view.current.boxes), ""],
    ["Volumen UC", formatNumber(view.current.volumeUc), ""],
    [scope === "customer" ? "SKUs activos" : "Clientes activos", formatNumber(scope === "customer" ? view.current.skus : view.current.customers), ""],
  ];

  return (
    <div className="general-content">
      <p className="comparison-label">
        {view.currentLabel} vs {view.comparisonLabel}
      </p>

      <div className="metrics-grid metrics-grid--compact">
        {metrics.map(([label, value, tone]) => (
          <div key={label} className={`metric-card ${tone ? `metric-card--${tone}` : ""}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <ul className="insight-list">
        {view.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <div className="ranking-section">
        <div className="ranking-section__header">
          <span className="eyebrow">Crecimiento vs referencia</span>
          <h3>Dónde estamos ganando</h3>
        </div>
        <div className="ranking-grid">
          <RankingList title="Categorías que más crecen" items={view.topCategories} />
          <RankingList title="Marcas que más crecen" items={view.topBrands} />
          <RankingList
            title={scope === "customer" ? "SKUs que más crecen" : "Clientes que más crecen"}
            items={scope === "customer" ? view.topSkus : view.topCustomers}
          />
        </div>
      </div>

      <div className="ranking-section">
        <div className="ranking-section__header">
          <span className="eyebrow">Decrecimiento vs referencia</span>
          <h3>Dónde recuperar venta</h3>
        </div>
        <div className="ranking-grid">
          <RankingList title="Categorías con mayor caída" items={view.opportunityCategories} />
          <RankingList title="Marcas con mayor caída" items={view.opportunityBrands} />
          <RankingList
            title={scope === "customer" ? "SKUs con mayor caída" : "Clientes con mayor caída"}
            items={view.opportunityFocus}
          />
        </div>
      </div>
    </div>
  );
}

function UnavailableView({ view }) {
  return (
    <div className="general-empty">
      <strong>No disponible con este Excel</strong>
      <p>{view.reason}</p>
    </div>
  );
}

function RankingList({ items, title }) {
  if (!items.length) {
    return (
      <div className="ranking-list-card">
        <span className="eyebrow">{title}</span>
        <p className="muted-copy">Sin variación relevante.</p>
      </div>
    );
  }

  return (
    <div className="ranking-list-card">
      <span className="eyebrow">{title}</span>
      <ol className="top-list">
        {items.map((item, index) => (
          <li key={item.name}>
            <span className="ranking-item-text">
              <span className="ranking-name">
                <b>{index + 1}.</b> {item.name}
              </span>
              <small>
                Actual {formatCurrency(item.current)} · Ref. {formatCurrency(item.comparison)}
                {isFiniteNumber(item.trend) ? ` · ${formatTrendPercent(item.trend)}` : ""}
              </small>
            </span>
            <strong className={item.delta < 0 ? "ranking-value ranking-value--danger" : "ranking-value ranking-value--good"}>
              {formatSignedCurrency(item.delta)}
            </strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function getTrendTone(value) {
  if (!isFiniteNumber(value)) {
    return "";
  }

  return value < 0 ? "danger" : "good";
}

export default GeneralViews;
