import InsightBullets from "./InsightBullets.jsx";
import MetricsGrid from "./MetricsGrid.jsx";
import NextBestAction from "./NextBestAction.jsx";
import OpeningLine from "./OpeningLine.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const STATUS_PILL_STYLES = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  alert: "bg-rose-50 text-rose-700 border-rose-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

function getStatusPillClass(statusKey) {
  return STATUS_PILL_STYLES[statusKey] ?? STATUS_PILL_STYLES.neutral;
}

const EMPTY_CARD_CLASS =
  "flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

function CustomerBrief({ customer, fileSummary }) {
  if (!fileSummary) {
    return (
      <section className={EMPTY_CARD_CLASS}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Ficha comercial
        </span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          Listo para cargar ventas
        </h2>
        <p className="text-[13px] text-slate-500">Sube el Excel diario para generar briefs por cliente.</p>
      </section>
    );
  }

  if (!customer) {
    return (
      <section className={EMPTY_CARD_CLASS}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Ficha comercial
        </span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          Cliente sin información suficiente
        </h2>
        <p className="text-[13px] text-slate-500">Selecciona otro cliente o revisa los datos del archivo.</p>
      </section>
    );
  }

  return (
    <article
      aria-label={`Ficha de ${customer.customerName}`}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Ficha comercial
            </span>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              {customer.customerName}
            </h2>
          </div>
          <span
            className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusPillClass(customer.statusKey)}`}
          >
            {customer.statusLabel}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customer.customerId ? (
            <MetaItem label="ID cliente" value={customer.customerId} />
          ) : null}
          {customer.agreement ? (
            <MetaItem label="Acuerdo comercial" value={customer.agreement.account} />
          ) : null}
          {customer.agreement?.chainAccount ? (
            <MetaItem label="Cadena / cuenta" value={customer.agreement.chainAccount} />
          ) : null}
          {customer.channel ? <MetaItem label="Canal" value={customer.channel} /> : null}
          {customer.zone ? <MetaItem label="Zona" value={customer.zone} /> : null}
          {customer.city ? <MetaItem label="Comuna" value={customer.city} /> : null}
          {customer.office ? <MetaItem label="Oficina" value={customer.office} /> : null}
          {customer.route ? <MetaItem label="Ruta" value={customer.route} /> : null}
          {customer.priority ? <MetaItem label="IPS" value={customer.priority} /> : null}
          {customer.seller ? <MetaItem label="Ejecutivo" value={customer.seller} /> : null}
          <MetaItem label="Fuente" value="Power BI Andina" />
          <MetaItem
            label="Datos hasta"
            value={fileSummary.maxDateLabel ?? formatDate(fileSummary.maxDate)}
          />
        </dl>
      </section>

      <MetricsGrid customer={customer} />

      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Top SKUs
          </span>
          <TopList items={customer.topSkus} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Top categorías
          </span>
          <TopList items={customer.topCategories} />
        </div>
      </section>

      <InsightBullets bullets={customer.insights} />
      <NextBestAction text={customer.nextBestAction} />
      <OpeningLine text={customer.openingLine} />
    </article>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function TopList({ items }) {
  if (!items.length) {
    return <p className="text-[12px] italic text-slate-400">Sin data suficiente.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.name}
          className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
        >
          <span className="truncate text-[13px] text-slate-700">{item.name}</span>
          <strong className="text-[13px] font-semibold text-slate-900">
            {formatCurrency(item.value)}
          </strong>
        </li>
      ))}
    </ol>
  );
}

export default CustomerBrief;
