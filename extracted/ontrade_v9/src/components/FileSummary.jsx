import { formatDate, formatNumber } from "../utils/formatters.js";

function FileSummary({ summary }) {
  const items = [
    ["Archivo", summary.fileName],
    ["Hoja", summary.worksheetName],
    ["Filas procesadas", formatNumber(summary.rowsProcessed)],
    ["Clientes detectados", formatNumber(summary.customersDetected)],
    ["Desde", summary.minDateLabel ? summary.minDateLabel : formatDate(summary.minDate)],
    ["Datos hasta", summary.maxDateLabel ? summary.maxDateLabel : formatDate(summary.maxDate)],
  ];

  return (
    <section className="card summary-card" aria-label="Resumen del archivo">
      <div className="section-heading">
        <span className="eyebrow">Archivo cargado</span>
        <h2>Resumen</h2>
      </div>
      <dl className="summary-list">
        {items.map(([label, value]) => (
          <div key={label} className="summary-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default FileSummary;
