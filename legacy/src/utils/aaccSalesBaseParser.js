import * as XLSX from "xlsx";

const FX_CLP_TO_USD = 952.24;

export async function parseAaccSalesBase(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
  });

  if (!rows.length) {
    throw new Error("La sábana de ventas está vacía.");
  }

  const headerIndex = findHeaderRow(rows);

  if (headerIndex < 0) {
    throw new Error(
      "No encontré los encabezados esperados. Verificá que el archivo tenga las columnas: NOMBRE, Point Of Purchase Code, L3 - Brand, L5 - Individual Variant, L6 - Volume, Fiscal Year, Fiscal Month, SO Volume (EUs), RSV (MM de CLP)."
    );
  }

  const headers = rows[headerIndex];
  const idx = buildHeaderIndex(headers);
  const parsedRows = rows
    .slice(headerIndex + 1)
    .map((row, i) => mapSalesRow(row, i, idx))
    .filter(Boolean);

  if (!parsedRows.length) {
    throw new Error("No hay filas de venta válidas en el archivo.");
  }

  return {
    count: parsedRows.length,
    fileName: file.name,
    rows: parsedRows,
    sheetName,
  };
}

function findHeaderRow(rows) {
  const required = ["point of purchase code", "so volume", "rsv", "fiscal year", "fiscal month"];
  return rows.findIndex((row) => {
    const cells = row.map((c) => normalizeHeader(c));
    return required.every((col) => cells.some((cell) => cell.includes(col)));
  });
}

function mapSalesRow(row, rowIndex, idx) {
  const customerCode = getText(row, idx, "Point Of Purchase Code");
  const fiscalYearRaw = parseInteger(getText(row, idx, "Fiscal Year"));
  const fiscalPeriod = parseFiscalMonth(getText(row, idx, "Fiscal Month"));
  const volumeEu = getNumber(row, idx, "SO Volume (EUs)");
  const rsvMmClp = getNumber(row, idx, "RSV (MM de CLP)");

  if (!customerCode || !fiscalYearRaw || !fiscalPeriod) return null;

  const fiscalYear = fiscalYearRaw > 0 && fiscalYearRaw < 100 ? 2000 + fiscalYearRaw : fiscalYearRaw;
  const calendarMonth = fiscalPeriod <= 6 ? fiscalPeriod + 6 : fiscalPeriod - 6;
  const calendarYear = fiscalPeriod <= 6 ? fiscalYear - 1 : fiscalYear;
  const periodKey = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`;

  const brand = cleanText(getText(row, idx, "L3 - Brand")) || "Sin marca";
  const format = cleanText(getText(row, idx, "L6 - Volume"));
  const variantRaw = cleanText(getText(row, idx, "L5 - Individual Variant"));
  const productName = variantRaw && format ? `${variantRaw} ${format}` : variantRaw || brand;
  const grossSalesUsd = (rsvMmClp * 1_000_000) / FX_CLP_TO_USD;

  return {
    brand,
    calendarYear,
    category: inferCategory(brand),
    customerCode: String(customerCode).trim(),
    customerName: getText(row, idx, "NOMBRE"),
    fiscalMonth: calendarMonth,
    fiscalPeriod,
    fiscalYear,
    format,
    grossSalesUsd,
    id: `sales-${rowIndex}`,
    periodKey,
    productName,
    rsvMmClp,
    volumeEu,
  };
}

function inferCategory(brand) {
  const b = brand.toLowerCase();
  if (b.includes("johnnie") || b.includes("walker") || b.includes("singleton") || b.includes("buchanan") || b.includes("white horse") || b.includes("old parr") || b.includes("sandy mac") || b.includes("bulleit") || b.includes("talisker")) return "Whisky";
  if (b.includes("tanqueray") || b.includes("gordon")) return "Gin";
  if (b.includes("don julio")) return "Tequila";
  if (b.includes("smirnoff")) return "Vodka";
  if (b.includes("zacapa") || b.includes("captain morgan")) return "Ron";
  if (b.includes("baileys") || b.includes("sheridan")) return "Licor";
  if (b.includes("ciroc")) return "Vodka";
  return "Otros";
}

function buildHeaderIndex(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && !(key in map)) map[key] = index;
  });
  return map;
}

function normalizeHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getText(row, idx, header) {
  const i = idx[normalizeHeader(header)];
  return i === undefined ? "" : cleanText(row[i]);
}

function getNumber(row, idx, header) {
  return parseNumericValue(getText(row, idx, header));
}

function cleanText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseInteger(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseFiscalMonth(value) {
  const match = cleanText(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseNumericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cleanText(value);
  if (!text || text === "-" || text === "$-") return 0;
  const negative = text.includes("(") && text.includes(")");
  let cleaned = text.replace(/[()$%\s]/g, "").replace(/[^\d.,-]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    cleaned = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? (negative ? -Math.abs(n) : n) : 0;
}
