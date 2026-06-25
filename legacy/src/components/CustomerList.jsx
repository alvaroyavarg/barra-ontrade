import { formatCurrency } from "../utils/formatters.js";

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

function CustomerList({ customers, hasFile, selectedCustomerId, onSelectCustomer }) {
  if (!hasFile) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Clientes</h2>
        <p className="text-[13px] text-slate-500">
          Cuando subas el Excel, aquí aparecerá la cartera detectada.
        </p>
      </section>
    );
  }

  if (customers.length === 0) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Sin resultados</h2>
        <p className="text-[13px] text-slate-500">No encontré clientes con esa búsqueda.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Lista de clientes"
      className="flex max-h-[600px] flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      {customers.map((customer) => {
        const isSelected = customer.id === selectedCustomerId;
        return (
          <button
            key={customer.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
              isSelected
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
            }`}
            type="button"
            onClick={() => onSelectCustomer(customer.id)}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <strong className="truncate text-[13px] font-semibold text-slate-900">
                {customer.customerName}
              </strong>
              <small className="truncate text-[11px] text-slate-500">
                {[customer.channel, customer.zone, customer.city, customer.route, customer.seller]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
              {customer.agreement ? (
                <small className="truncate text-[11px] font-medium text-slate-700">
                  AACC: {customer.agreement.account}
                </small>
              ) : null}
            </span>
            <span className="flex flex-shrink-0 flex-col items-end gap-1">
              {customer.hasAgreement ? (
                <span className="rounded-full border border-slate-900 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  AACC
                </span>
              ) : null}
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusPillClass(customer.statusKey)}`}
              >
                {customer.statusLabel}
              </span>
              <span className="text-[12px] font-semibold text-slate-900">
                {formatCurrency(customer.metrics.salesLast28)}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

export default CustomerList;
