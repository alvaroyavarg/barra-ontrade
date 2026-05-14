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
    <section
      aria-label="Resumen del archivo"
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Archivo cargado
        </span>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Resumen</h2>
      </div>
      <dl className="flex flex-col gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
            <dt className="text-[12px] text-slate-500">{label}</dt>
            <dd className="text-[13px] font-medium text-slate-900 text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default FileSummary;
