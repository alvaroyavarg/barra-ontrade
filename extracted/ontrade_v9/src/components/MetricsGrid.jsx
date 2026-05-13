import { formatCurrency, formatDate, formatNumber, formatTrendPercent, isFiniteNumber } from "../utils/formatters.js";

function MetricsGrid({ customer }) {
  const { metrics } = customer;
  const items = [
    [`Venta ${metrics.currentPeriodLabel ?? "últimos 28 días"}`, formatCurrency(metrics.salesLast28), "primary"],
    [`Venta ${metrics.previousPeriodLabel ?? "28 días anteriores"}`, formatCurrency(metrics.salesPrevious28), ""],
    [
      "Tendencia",
      formatTrendPercent(metrics.salesTrendPercent),
      isFiniteNumber(metrics.salesTrendPercent) ? (metrics.salesTrendPercent < 0 ? "danger" : "good") : "",
    ],
    [`Cajas ${metrics.currentPeriodLabel ?? "últimos 28 días"}`, formatNumber(metrics.boxesLast28), ""],
    ["Volumen UC", formatNumber(metrics.volumeUcLast28), ""],
    ["Última compra", metrics.lastPurchaseLabel ?? formatDate(metrics.lastPurchaseDate), ""],
    ["Días desde último pedido", metrics.daysSinceLastPurchase ?? "Sin dato", ""],
  ];

  return (
    <section className="metrics-grid" aria-label="Métricas clave">
      {items.map(([label, value, tone]) => (
        <div key={label} className={`metric-card ${tone ? `metric-card--${tone}` : ""}`}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

export default MetricsGrid;
