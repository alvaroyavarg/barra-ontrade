export const FILTER_FIELDS = [
  { field: "date", label: "Fecha" },
  { field: "year", label: "Año" },
  { field: "month", label: "Mes" },
  { field: "dayOfPeriod", label: "Día" },
  { field: "outputNumber", label: "Salida" },
  { field: "customerId", label: "ID cliente" },
  { field: "customerName", label: "Cliente" },
  { field: "channel", label: "Canal Diageo" },
  { field: "zone", label: "Zona" },
  { field: "city", label: "Comuna" },
  { field: "office", label: "Oficina de venta" },
  { field: "priority", label: "IPS" },
  { field: "route", label: "Ruta" },
  { field: "seller", label: "Ejecutivo" },
  { field: "category", label: "Categoría" },
  { field: "segment", label: "Segmento" },
  { field: "brand", label: "Marca" },
  { field: "sku", label: "SKU" },
  { field: "package", label: "Empaque" },
  { field: "salesAmount", label: "Ingreso" },
  { field: "boxes", label: "CF" },
  { field: "volumeUc", label: "Volumen UC" },
  { field: "discount", label: "Descuento" },
  { field: "margin", label: "Margen" },
];

const FIELD_LABELS = new Map(FILTER_FIELDS.map((field) => [field.field, field.label]));

export function applyRecordFilters(records, filters) {
  if (!filters.length) {
    return records;
  }

  return records.filter((record) =>
    filters.every((filter) => getFilterValue(record, filter.field) === String(filter.value)),
  );
}

export function getFilterOptions(records, field) {
  const optionsByValue = new Map();

  for (const record of records) {
    const value = getFilterValue(record, field);

    if (!value) {
      continue;
    }

    if (!optionsByValue.has(value)) {
      optionsByValue.set(value, {
        label: getFilterDisplayValue(record, field),
        value,
      });
    }
  }

  return Array.from(optionsByValue.values()).sort((a, b) => compareFilterOptions(a, b));
}

export function getFilterFieldLabel(field) {
  return FIELD_LABELS.get(field) ?? field;
}

export function getFilterDisplayLabel(filter) {
  return `${getFilterFieldLabel(filter.field)}: ${filter.label ?? filter.value}`;
}

function getFilterValue(record, field) {
  const value = record[field];

  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function getFilterDisplayValue(record, field) {
  const value = record[field];

  if (field === "month") {
    return monthName(Number(value));
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.round(value * 1000) / 1000);
  }

  return String(value);
}

function compareFilterOptions(a, b) {
  const aNumber = Number(a.value);
  const bNumber = Number(b.value);

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }

  return a.label.localeCompare(b.label, "es");
}

function monthName(month) {
  const names = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  return names[month - 1] ?? String(month);
}
