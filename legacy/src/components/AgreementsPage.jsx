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
      <section className="flex min-h-[170px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Acuerdos comerciales</span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Sube un Excel para cruzar contratos</h2>
        <p className="text-[13px] text-slate-500">La app ya tiene cargado el catálogo KOA de acuerdos comerciales y lo cruzará por ID cliente.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-3.5 content-start">
      <GeneralViews
        scope="portfolio"
        scopeName="Clientes con acuerdo comercial"
        views={views}
        yearBasis={yearBasis}
        onYearBasisChange={onYearBasisChange}
      />

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Catálogo AACC KOA</span>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Contratos detectados</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Acuerdos guardados" value={stats.totalAgreements} />
          <Stat label="Con ID" value={stats.totalWithId} />
          <Stat label="Detectados en ventas" value={stats.agreementsInFile} />
          <Stat label="Cadenas detectadas" value={stats.chainsInFile} />
          <Stat label="Cuentas en cartera" value={stats.customersInFile} />
          <Stat label="Pendientes sin ID" value={stats.pendingWithoutId} />
        </div>
      </section>

      <section className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-[13px] font-medium text-slate-700" htmlFor="agreement-search">Buscar acuerdo</label>
        <input
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          id="agreement-search"
          placeholder="Nombre fantasía, razón social, cadena o ID"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-[12px] text-slate-500">{filteredCustomers.length} de {customers.length} acuerdos con venta detectada</p>
      </section>

      <CustomerList
        customers={filteredCustomers}
        hasFile={Boolean(fileSummary)}
        selectedCustomerId=""
        onSelectCustomer={onOpenCustomer}
      />

      {pendingAgreements.length ? (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pendientes</span>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Acuerdos sin ID cruzable</h2>
          <ul className="m-0 mt-1 grid list-none gap-2.5 p-0">
            {pendingAgreements.map((agreement) => (
              <li
                key={`${agreement.account}-${agreement.sourceRow}`}
                className="grid gap-1 border-t border-slate-100 pt-2.5 first:border-t-0 first:pt-0"
              >
                <strong className="text-[13px] font-semibold text-slate-900">{agreement.account}</strong>
                <span className="text-[12px] text-slate-500">{agreement.chainAccount}{agreement.rawId ? ` · ID: ${agreement.rawId}` : ""}</span>
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
    <div className="flex min-h-[76px] flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <strong className="text-[18px] font-semibold text-slate-900">{formatNumber(value)}</strong>
    </div>
  );
}

export default AgreementsPage;
