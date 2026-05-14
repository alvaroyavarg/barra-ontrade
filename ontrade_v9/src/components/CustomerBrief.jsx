import InsightBullets from "./InsightBullets.jsx";
import MetricsGrid from "./MetricsGrid.jsx";
import NextBestAction from "./NextBestAction.jsx";
import OpeningLine from "./OpeningLine.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

function CustomerBrief({ customer, fileSummary }) {
  if (!fileSummary) {
    return (
      <section className="card brief-empty">
        <span className="eyebrow">Ficha comercial</span>
        <h2>Listo para cargar ventas</h2>
        <p>Sube el Excel diario para generar briefs por cliente.</p>
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="card brief-empty">
        <span className="eyebrow">Ficha comercial</span>
        <h2>Cliente sin información suficiente</h2>
        <p>Selecciona otro cliente o revisa los datos del archivo.</p>
      </section>
    );
  }

  return (
    <article className="brief-stack" aria-label={`Ficha de ${customer.customerName}`}>
      <section className="card brief-header-card">
        <div className="brief-title-row">
          <div>
            <span className="eyebrow">Ficha comercial</span>
            <h2>{customer.customerName}</h2>
          </div>
          <span className={`status-pill status-pill--${customer.statusKey}`}>{customer.statusLabel}</span>
        </div>

        <dl className="meta-grid">
          {customer.customerId ? (
            <div>
              <dt>ID cliente</dt>
              <dd>{customer.customerId}</dd>
            </div>
          ) : null}
          {customer.agreement ? (
            <div>
              <dt>Acuerdo comercial</dt>
              <dd>{customer.agreement.account}</dd>
            </div>
          ) : null}
          {customer.agreement?.chainAccount ? (
            <div>
              <dt>Cadena / cuenta</dt>
              <dd>{customer.agreement.chainAccount}</dd>
            </div>
          ) : null}
          {customer.channel ? (
            <div>
              <dt>Canal</dt>
              <dd>{customer.channel}</dd>
            </div>
          ) : null}
          {customer.zone ? (
            <div>
              <dt>Zona</dt>
              <dd>{customer.zone}</dd>
            </div>
          ) : null}
          {customer.city ? (
            <div>
              <dt>Comuna</dt>
              <dd>{customer.city}</dd>
            </div>
          ) : null}
          {customer.office ? (
            <div>
              <dt>Oficina</dt>
              <dd>{customer.office}</dd>
            </div>
          ) : null}
          {customer.route ? (
            <div>
              <dt>Ruta</dt>
              <dd>{customer.route}</dd>
            </div>
          ) : null}
          {customer.priority ? (
            <div>
              <dt>IPS</dt>
              <dd>{customer.priority}</dd>
            </div>
          ) : null}
          {customer.seller ? (
            <div>
              <dt>Ejecutivo</dt>
              <dd>{customer.seller}</dd>
            </div>
          ) : null}
          <div>
            <dt>Fuente</dt>
            <dd>Power BI Andina</dd>
          </div>
          <div>
            <dt>Datos hasta</dt>
            <dd>{fileSummary.maxDateLabel ?? formatDate(fileSummary.maxDate)}</dd>
          </div>
        </dl>
      </section>

      <MetricsGrid customer={customer} />

      <section className="card focus-card">
        <div>
          <span className="eyebrow">Top SKUs</span>
          <TopList items={customer.topSkus} />
        </div>
        <div>
          <span className="eyebrow">Top categorías</span>
          <TopList items={customer.topCategories} />
        </div>
      </section>

      <InsightBullets bullets={customer.insights} />
      <NextBestAction text={customer.nextBestAction} />
      <OpeningLine text={customer.openingLine} />
    </article>
  );
}

function TopList({ items }) {
  if (!items.length) {
    return <p className="muted-copy">Sin data suficiente.</p>;
  }

  return (
    <ol className="top-list">
      {items.map((item) => (
        <li key={item.name}>
          <span>{item.name}</span>
          <strong>{formatCurrency(item.value)}</strong>
        </li>
      ))}
    </ol>
  );
}

export default CustomerBrief;
