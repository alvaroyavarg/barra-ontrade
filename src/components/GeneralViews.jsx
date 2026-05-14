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
    <section className="flex flex-col gap-3.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Vista general">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{scope === "customer" ? "Vista cuenta" : "Vista general"}</span>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{activeView.title}</h2>
          {scopeName ? <p className="m-0 text-[13px] font-black leading-snug text-slate-600">{scopeName}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Base YTD</span>
          <div
            className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
            role="radiogroup"
            aria-label="Base para YTD"
          >
            {YEAR_BASIS_OPTIONS.map((option) => (
              <button
                key={option.key}
                aria-checked={yearBasis === option.key}
                className={
                  yearBasis === option.key
                    ? "rounded-md bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-900 shadow-sm transition"
                    : "rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-700"
                }
                role="radio"
                type="button"
                onClick={() => onYearBasisChange?.(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          aria-label="Comparación general"
        >
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.key}
              aria-selected={activeViewKey === option.key}
              className={
                activeViewKey === option.key
                  ? "rounded-md bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-900 shadow-sm transition"
                  : "rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-700"
              }
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
    <div className="flex flex-col gap-3.5">
      <p className="m-0 text-[13px] font-black text-slate-700">
        {view.currentLabel} vs {view.comparisonLabel}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map(([label, value, tone]) => (
          <div
            key={label}
            className={`flex min-h-[86px] flex-col justify-between gap-2 rounded-lg border p-3 ${getMetricCardClass(tone)}`}
          >
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
            <strong className={`text-[18px] font-semibold leading-tight ${getMetricValueClass(tone)}`}>{value}</strong>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-slate-700 [list-style-type:disc] marker:text-slate-400">
        {view.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Crecimiento vs referencia</span>
          <h3 className="text-[13px] font-semibold text-slate-900">Dónde estamos ganando</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RankingList title="Categorías que más crecen" items={view.topCategories} />
          <RankingList title="Marcas que más crecen" items={view.topBrands} />
          <RankingList
            title={scope === "customer" ? "SKUs que más crecen" : "Clientes que más crecen"}
            items={scope === "customer" ? view.topSkus : view.topCustomers}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Decrecimiento vs referencia</span>
          <h3 className="text-[13px] font-semibold text-slate-900">Dónde recuperar venta</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <strong className="text-[13px] font-semibold text-amber-800">No disponible con este Excel</strong>
      <p className="m-0 text-[13px] text-amber-700">{view.reason}</p>
    </div>
  );
}

function RankingList({ items, title }) {
  if (!items.length) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        <p className="m-0 text-[12px] italic text-slate-400">Sin variación relevante.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      <ol className="flex flex-col gap-1.5 pl-0 [list-style:none]">
        {items.map((item, index) => (
          <li key={item.name} className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5 last:border-b-0 last:pb-0">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[12px] text-slate-700">
                <b className="font-semibold">{index + 1}.</b> {item.name}
              </span>
              <small className="text-[11px] text-slate-400">
                Actual {formatCurrency(item.current)} · Ref. {formatCurrency(item.comparison)}
                {isFiniteNumber(item.trend) ? ` · ${formatTrendPercent(item.trend)}` : ""}
              </small>
            </span>
            <strong className={`shrink-0 text-[12px] font-semibold ${item.delta < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatSignedCurrency(item.delta)}
            </strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function getMetricCardClass(tone) {
  if (tone === "good") return "border-emerald-200 bg-emerald-50";
  if (tone === "danger") return "border-rose-200 bg-rose-50";
  if (tone === "primary") return "border-slate-900 bg-slate-900";
  return "border-slate-200 bg-slate-50";
}

function getMetricValueClass(tone) {
  if (tone === "good") return "text-emerald-700";
  if (tone === "danger") return "text-rose-700";
  if (tone === "primary") return "text-white";
  return "text-slate-900";
}

function getTrendTone(value) {
  if (!isFiniteNumber(value)) {
    return "";
  }

  return value < 0 ? "danger" : "good";
}

export default GeneralViews;
