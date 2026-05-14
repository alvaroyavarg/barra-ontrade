import { useMemo, useState } from "react";
import CustomerList from "./CustomerList.jsx";
import GeneralViews from "./GeneralViews.jsx";
import { formatNumber } from "../utils/formatters.js";
import { normalizeColumnName } from "../utils/columnMapping.js";

function AgreementsPage({
  customers,
  fileSummary,
  onOpenCustomer,
  onYearBasisChange,
  pendingAgreements,
  stats,
  views,
  yearBasis,
}) {
  const [query, setQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeColumnName(query);

    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter((customer) =>
      normalizeColumnName(
        [
          customer.customerName,
          customer.customerId,
          customer.agreement?.account,
          customer.agreement?.chainAccount,
          customer.channel,
          customer.city,
          customer.route,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery),
    );
  }, [customers, query]);

  if (!fileSummary) {
    return (
      <section className="card brief-empty">
        <span className="eyebrow">Acuerdos comerciales</span>
        <h2>Sube un Excel para cruzar contratos</h2>
        <p>La app ya tiene cargado el catálogo KOA de acuerdos comerciales y lo cruzará por ID cliente.</p>
      </section>
    );
  }

  return (
    <div className="brief-stack">
      <GeneralViews
        scope="portfolio"
        scopeName="Clientes con acuerdo comercial"
        views={views}
        yearBasis={yearBasis}
        onYearBasisChange={onYearBasisChange}
      />

      <section className="card agreement-summary-card">
        <div className="section-heading">
          <span className="eyebrow">Catálogo AACC KOA</span>
          <h2>Contratos detectados</h2>
        </div>
        <div className="agreement-stats-grid">
          <Stat label="Acuerdos guardados" value={stats.totalAgreements} />
          <Stat label="Con ID" value={stats.totalWithId} />
          <Stat label="Detectados en ventas" value={stats.agreementsInFile} />
          <Stat label="Cadenas detectadas" value={stats.chainsInFile} />
          <Stat label="Cuentas en cartera" value={stats.customersInFile} />
          <Stat label="Pendientes sin ID" value={stats.pendingWithoutId} />
        </div>
      </section>

      <section className="card search-card">
        <label htmlFor="agreement-search">Buscar acuerdo</label>
        <input
          id="agreement-search"
          placeholder="Nombre fantasía, razón social, cadena o ID"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p>{filteredCustomers.length} de {customers.length} acuerdos con venta detectada</p>
      </section>

      <CustomerList
        customers={filteredCustomers}
        hasFile={Boolean(fileSummary)}
        selectedCustomerId=""
        onSelectCustomer={onOpenCustomer}
      />

      {pendingAgreements.length ? (
        <section className="card pending-card">
          <span className="eyebrow">Pendientes</span>
          <h2>Acuerdos sin ID cruzable</h2>
          <ul className="pending-list">
            {pendingAgreements.map((agreement) => (
              <li key={`${agreement.account}-${agreement.sourceRow}`}>
                <strong>{agreement.account}</strong>
                <span>{agreement.chainAccount}{agreement.rawId ? ` · ID: ${agreement.rawId}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="agreement-stat">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

export default AgreementsPage;
