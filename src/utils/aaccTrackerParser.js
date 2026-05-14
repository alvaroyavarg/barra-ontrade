import * as XLSX from "xlsx";
import { buildAaccModel } from "./aaccProfitabilityEngine.js";
import { normalizeColumnName } from "./columnMapping.js";

const REQUIRED_COLUMNS = ["Cuenta", "ID DIAGEO", "Volume (Eus)", "Gross  Sales", "Net Sales Value", "CAAP", "ROI- Total investment"];
const FIRST_PRODUCT_COLUMN = "TOTAL $ x año";
const LAST_PRODUCT_COLUMN = "Volume (Eus)";

export async function parseAaccTrackerFile(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true, type: "array" });
  const sheetName = workbook.SheetNames.find((name) => normalizeColumnName(name).includes("tracker"));

  if (!sheetName) {
    throw new Error("No encontré una hoja llamada Tracker en este archivo.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1, raw: false });
  const headerIndex = findHeaderIndex(rows);

  if (headerIndex < 0) {
    throw new Error("No pude detectar los encabezados del Tracker. Revisa que exista la hoja con Cuenta, ID DIAGEO, Volume (Eus), CAAP y ROI.");
  }

  const headers = rows[headerIndex].map(cleanText);
  const indexByHeader = buildIndexByHeader(headers);
  const productColumns = getProductColumns(headers, indexByHeader);
  const accounts = rows
    .slice(headerIndex + 1)
    .map((row, index) => mapTrackerRow(row, index, indexByHeader, productColumns))
    .filter(Boolean);

  if (!accounts.length) {
    throw new Error("El Tracker no tiene cuentas válidas para analizar.");
  }

  return {
    fileName: file.name,
    rowCount: accounts.length,
    sheetName,
    ...buildAaccModel(accounts),
  };
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const normalizedCells = row.map((cell) => normalizeColumnName(cleanText(cell)));
    return REQUIRED_COLUMNS.every((column) => normalizedCells.includes(normalizeColumnName(column)));
  });
}

function buildIndexByHeader(headers) {
  return headers.reduce((map, header, index) => {
    const key = normalizeColumnName(header);

    if (key && !map.has(key)) {
      map.set(key, index);
    }

    return map;
  }, new Map());
}

function getProductColumns(headers, indexByHeader) {
  const start = indexByHeader.get(normalizeColumnName(FIRST_PRODUCT_COLUMN));
  const end = indexByHeader.get(normalizeColumnName(LAST_PRODUCT_COLUMN));

  if (start === undefined || end === undefined || end <= start) {
    return [];
  }

  return headers
    .map((header, index) => ({ header, index }))
    .slice(start + 1, end)
    .filter((column) => column.header && !normalizeColumnName(column.header).includes("otros"));
}

function mapTrackerRow(row, index, indexByHeader, productColumns) {
  const customerName = getText(row, indexByHeader, "Cuenta");

  if (!customerName || normalizeColumnName(customerName).includes("total")) {
    return null;
  }

  const productMix = productColumns
    .map((column) => ({
      brand: inferBrand(column.header),
      category: inferCategory(column.header),
      grossSales: 0,
      productName: column.header,
      volumeEu: parseNumericValue(row[column.index]),
    }))
    .filter((product) => product.volumeEu > 0)
    .sort((a, b) => b.volumeEu - a.volumeEu);
  const grossSales = getNumber(row, indexByHeader, "Gross  Sales");

  productMix.forEach((product) => {
    product.grossSales = grossSales && productMix.length ? grossSales * (product.volumeEu / sum(productMix, "volumeEu")) : 0;
  });

  const metrics = {
    ap: getNumber(row, indexByHeader, "A&P"),
    caap: getNumber(row, indexByHeader, "CAAP"),
    caapMarginPct: getNumber(row, indexByHeader, "CAAP Margin %"),
    cogs: getNumber(row, indexByHeader, "COGS "),
    fixedTradeSpend: getNumber(row, indexByHeader, "Fixed Trade Spend"),
    grossMarginPct: getNumber(row, indexByHeader, "Gross Margin % AC") || getNumber(row, indexByHeader, "Gross Margin %"),
    grossProfit: getNumber(row, indexByHeader, "Gross Profit  "),
    grossSales,
    netSalesValue: getNumber(row, indexByHeader, "Net Sales Value  "),
    promoDiscount: getNumber(row, indexByHeader, "Promo Discount"),
    rappel: getNumber(row, indexByHeader, "Rappel"),
    roi: getNumber(row, indexByHeader, "ROI- Total investment"),
    totalTradeSpend: getNumber(row, indexByHeader, "Total Trade Spend  "),
    variableTradeSpend: getNumber(row, indexByHeader, "Variable Trade Spend  "),
    visibilityFee: getNumber(row, indexByHeader, "Visibility and Exhibition (Fee)"),
    volumeEu: getNumber(row, indexByHeader, "Volume (Eus)"),
  };
  const checks = {
    gmOk: normalizeColumnName(getText(row, indexByHeader, "GM Check")) === "ok",
    grossMarginTarget: 0,
    roiOk: normalizeColumnName(getText(row, indexByHeader, "ROI Check")) === "ok",
    roiTarget: 0,
  };
  const status = getTrackerStatus({ checks, metrics, rawStatus: getText(row, indexByHeader, "Status") });
  const account = {
    agreementId: `tracker-${index}`,
    annualFeeUsd: Math.abs(metrics.visibilityFee || 0),
    bottler: getText(row, indexByHeader, "Embolletador"),
    chainName: getText(row, indexByHeader, "Cadena/Cuenta"),
    city: getText(row, indexByHeader, "COMUNA") || getText(row, indexByHeader, "Planta"),
    customerName,
    diageoCustomerId: getText(row, indexByHeader, "ID DIAGEO"),
    durationMonths: getNumber(row, indexByHeader, "Agreement Duration (Months)"),
    isChain: getNumber(row, indexByHeader, "Es Cadena") === 1,
    outletType: getText(row, indexByHeader, "Tipo outlet"),
    productMix,
    segmentation: getText(row, indexByHeader, "Segmentación"),
    status,
    subSegmentation: getText(row, indexByHeader, "SUB - SEGMENTACIÓN"),
    totalInvestmentUsd: Math.abs(metrics.visibilityFee || 0),
  };

  return {
    ...account,
    checks,
    insights: buildTrackerInsights(account, metrics, checks, status),
    metrics,
  };
}

function buildTrackerInsights(account, metrics, checks, status) {
  const insights = [`${status.label}: ${status.reason}`];
  const tradeSpendWeight = metrics.netSalesValue ? Math.abs(metrics.totalTradeSpend) / Math.abs(metrics.netSalesValue) : 0;
  const topProduct = account.productMix[0];

  if (!checks.roiOk) {
    insights.push("El acuerdo no está pagando el retorno esperado. Revisar inversión, volumen real o condición antes de renovar.");
  }

  if (!checks.gmOk) {
    insights.push("Margen bajo el mínimo del tracker. La cuenta necesita mix más rentable o menor presión de trade spend.");
  }

  if (tradeSpendWeight > 0.35) {
    insights.push("Trade spend alto versus venta neta. Hay riesgo de comprar volumen sin capturar rentabilidad.");
  }

  if (topProduct) {
    insights.push(`${topProduct.productName} concentra el mayor volumen real del acuerdo con ${Math.round(topProduct.volumeEu)} EUs.`);
  }

  if (checks.gmOk && checks.roiOk && metrics.caap > 0) {
    insights.push("Acuerdo saludable: defender continuidad y buscar crecimiento incremental sin subir condición.");
  }

  return insights.slice(0, 5);
}

function getTrackerStatus({ checks, metrics, rawStatus }) {
  if (!checks.gmOk && !checks.roiOk && metrics.caap < 0) {
    return { key: "exit", label: "No renovar", reason: "Falla ROI, falla margen y deja CAAP negativo." };
  }

  if (!checks.gmOk || !checks.roiOk) {
    return { key: "renegotiate", label: "Renegociar", reason: "No cumple todos los checks del tracker." };
  }

  if (metrics.roi >= 2 && metrics.grossMarginPct >= 0.55) {
    return { key: "boost", label: "Potenciar", reason: "ROI y margen sanos con venta real suficiente." };
  }

  return { key: "maintain", label: rawStatus || "Mantener", reason: "Cumple los checks principales de rentabilidad." };
}

function getText(row, indexByHeader, header) {
  const index = indexByHeader.get(normalizeColumnName(header));
  return index === undefined ? "" : cleanText(row[index]);
}

function getNumber(row, indexByHeader, header) {
  const index = indexByHeader.get(normalizeColumnName(header));
  return index === undefined ? 0 : parseNumericValue(row[index]);
}

function cleanText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseNumericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = cleanText(value);

  if (!text || text === "-" || text === "$-") {
    return 0;
  }

  const isPercent = text.includes("%");
  const negative = text.includes("(") && text.includes(")");
  const cleaned = text.replace(/[()$%\s]/g, "").replace(/,/g, "");
  const number = Number(cleaned);

  if (!Number.isFinite(number)) {
    return 0;
  }

  const signed = negative ? -Math.abs(number) : number;
  return isPercent ? signed / 100 : signed;
}

function inferBrand(productName) {
  const normalized = normalizeColumnName(productName);

  if (normalized.includes("tanqueray")) return "Tanqueray";
  if (normalized.includes("johnnie") || normalized.includes("jw ")) return "Johnnie Walker";
  if (normalized.includes("buchanan")) return "Buchanan's";
  if (normalized.includes("don julio")) return "Don Julio";
  if (normalized.includes("smirnoff")) return "Smirnoff";
  if (normalized.includes("baileys")) return "Baileys";
  if (normalized.includes("zacapa")) return "Zacapa";
  if (normalized.includes("singleton")) return "Singleton";
  if (normalized.includes("white horse")) return "White Horse";
  return "Otros";
}

function inferCategory(productName) {
  const normalized = normalizeColumnName(productName);

  if (normalized.includes("gin")) return "Gin";
  if (normalized.includes("whisky") || normalized.includes("walker") || normalized.includes("buchanan")) return "Whisky";
  if (normalized.includes("vodka")) return "Vodka";
  if (normalized.includes("tequila") || normalized.includes("don julio")) return "Tequila";
  if (normalized.includes("rum") || normalized.includes("zacapa")) return "Ron";
  if (normalized.includes("baileys") || normalized.includes("liqueur")) return "Licor";
  return "Otros";
}

function sum(items, field) {
  return items.reduce((total, item) => total + (item[field] ?? 0), 0);
}
