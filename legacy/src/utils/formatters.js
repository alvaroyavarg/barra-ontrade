const currencyFormatter = new Intl.NumberFormat("es-CL", {
  currency: "CLP",
  maximumFractionDigits: 0,
  style: "currency",
});

const usdFormatter = new Intl.NumberFormat("es-CL", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatCurrency(value) {
  if (!isFiniteNumber(value)) {
    return "Sin dato";
  }

  return currencyFormatter.format(value);
}

export function formatSignedCurrency(value) {
  if (!isFiniteNumber(value)) {
    return "Sin dato";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${currencyFormatter.format(value)}`;
}

export function formatUsd(value) {
  if (!isFiniteNumber(value)) {
    return "Sin dato";
  }

  return usdFormatter.format(value);
}

export function formatNumber(value) {
  if (!isFiniteNumber(value)) {
    return "Sin dato";
  }

  return numberFormatter.format(value);
}

export function formatDate(isoDate) {
  const date = parseIsoDate(isoDate);

  if (!date) {
    return "Sin dato";
  }

  return dateFormatter.format(date);
}

export function formatTrendPercent(value) {
  if (!isFiniteNumber(value)) {
    return "Sin base";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100)}%`;
}

export function formatSharePercent(value) {
  if (!isFiniteNumber(value)) {
    return "Sin dato";
  }

  return `${Math.round(value * 100)}%`;
}

export function parseIsoDate(isoDate) {
  if (!isoDate || typeof isoDate !== "string") {
    return null;
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
