import { formatCurrency } from "../utils/formatters.js";

function CustomerList({ customers, hasFile, selectedCustomerId, onSelectCustomer }) {
  if (!hasFile) {
    return (
      <section className="card empty-card">
        <h2>Clientes</h2>
        <p>Cuando subas el Excel, aquí aparecerá la cartera detectada.</p>
      </section>
    );
  }

  if (customers.length === 0) {
    return (
      <section className="card empty-card">
        <h2>Sin resultados</h2>
        <p>No encontré clientes con esa búsqueda.</p>
      </section>
    );
  }

  return (
    <section className="customer-list" aria-label="Lista de clientes">
      {customers.map((customer) => (
        <button
          key={customer.id}
          className={`customer-row ${customer.id === selectedCustomerId ? "customer-row--selected" : ""}`}
          type="button"
          onClick={() => onSelectCustomer(customer.id)}
        >
          <span className="customer-row__main">
            <strong>{customer.customerName}</strong>
            <small>{[customer.channel, customer.zone, customer.city, customer.route, customer.seller].filter(Boolean).join(" · ")}</small>
            {customer.agreement ? (
              <small className="agreement-line">AACC: {customer.agreement.account}</small>
            ) : null}
          </span>
          <span className="customer-row__side">
            {customer.hasAgreement ? <span className="agreement-pill">AACC</span> : null}
            <span className={`status-pill status-pill--${customer.statusKey}`}>{customer.statusLabel}</span>
            <span>{formatCurrency(customer.metrics.salesLast28)}</span>
          </span>
        </button>
      ))}
    </section>
  );
}

export default CustomerList;
