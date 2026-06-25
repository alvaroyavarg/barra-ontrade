import { formatCurrency, formatDate, formatNumber, formatTrendPercent, isFiniteNumber } from "../utils/formatters.js";

const TONE_STYLES = {
  primary: "border-slate-900 bg-slate-900 text-white",
  good: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  default: "border-slate-200 bg-white text-slate-900",
};

function MetricCard({ label, value, tone }) {
  const toneClass = TONE_STYLES[tone] ?? TONE_STYLES.default;
  const labelClass = tone === "primary" ? "text-slate-300" : "text-slate-500";
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition hover:shadow-md ${toneClass}`}
    >
      <span className={`text-xs font-medium uppercase tracking-wide ${labelClass}`}>{label}</span>
      <strong className="text-xl font-semibold tracking-tight">{value}</strong>
    </div>
  );
}

function MetricsGrid({ customer }) {
  const { metrics } = customer;
  const items = [
    {
      label: `Venta ${metrics.currentPeriodLabel ?? "últimos 28 días"}`,
      value: formatCurrency(metrics.salesLast28),
      tone: "primary",
    },
    {
      label: `Venta ${metrics.previousPeriodLabel ?? "28 días anteriores"}`,
      value: formatCurrency(metrics.salesPrevious28),
    },
    {
      label: "Tendencia",
      value: formatTrendPercent(metrics.salesTrendPercent),
      tone: isFiniteNumber(metrics.salesTrendPercent)
        ? metrics.salesTrendPercent < 0
          ? "danger"
          : "good"
        : undefined,
    },
    {
      label: `Cajas ${metrics.currentPeriodLabel ?? "últimos 28 días"}`,
      value: formatNumber(metrics.boxesLast28),
    },
    { label: "Volumen UC", value: formatNumber(metrics.volumeUcLast28) },
    {
      label: "Última compra",
      value: metrics.lastPurchaseLabel ?? formatDate(metrics.lastPurchaseDate),
    },
    { label: "Días desde último pedido", value: metrics.daysSinceLastPurchase ?? "Sin dato" },
  ];

  return (
    <section
      aria-label="Métricas clave"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {items.map((item) => (
        <MetricCard key={item.label} {...item} />
      ))}
    </section>
  );
}

export default MetricsGrid;
