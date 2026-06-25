import * as XLSX from "xlsx";
import { detectHeaderRow, normalizeColumnName } from "./columnMapping.js";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function parseExcelFile(file) {
  validateFile(file);

  let workbook;

  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { cellDates: true, type: "array" });
  } catch (error) {
    throw new Error("No pude leer el Excel. Revisa que el archivo no esté dañado o protegido.");
  }

  if (!workbook.SheetNames?.length) {
    throw new Error("El Excel no tiene hojas para procesar.");
  }

  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    blankrows: false,
    defval: null,
    header: 1,
    raw: true,
  });

  if (!rows.length) {
    throw new Error("El Excel está vacío.");
  }

  const headerResult = detectHeaderRow(rows);

  if (!headerResult) {
    throw new Error("No pude detectar encabezados en el Excel.");
  }

  const normalizedDetection = normalizeDetectedMapping(headerResult, rows[headerResult.headerRowIndex]);
  const { detectedLabels, mapping } = normalizedDetection;

  validateRequiredColumns(mapping);

  const dataRows = rows.slice(headerResult.headerRowIndex + 1);
  const parseStats = {
    invalidDates: 0,
    invalidNumbers: 0,
    missingCustomers: 0,
  };

  const records = dataRows
    .map((row) => normalizeRow(row, mapping, parseStats))
    .filter(Boolean);

  if (!records.length) {
    throw new Error("No encontré filas válidas con cliente, fecha y venta o cajas.");
  }

  const customerKeys = new Set(records.map((record) => record.customerId || record.customerName));
  const summary = buildSummary({
    customerCount: customerKeys.size,
    file,
    mapping,
    records,
    worksheetName,
    detectedColumns: detectedLabels,
  });

  return {
    records,
    summary,
    warnings: buildWarnings(parseStats, summary),
  };
}

function validateFile(file) {
  if (!file) {
    throw new Error("Selecciona un archivo Excel para continuar.");
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((extension) => fileName.endsWith(extension));

  if (!hasValidExtension) {
    throw new Error("Archivo inválido. Sube un Excel en formato .xlsx o .xls.");
  }
}

function validateRequiredColumns(mapping) {
  const hasDate = mapping.date !== undefined;
  const hasYearMonthDay = mapping.year !== undefined && mapping.month !== undefined && mapping.dayOfPeriod !== undefined;
  const hasYearDay = mapping.year !== undefined && mapping.dayOfPeriod !== undefined;

  if (!hasDate && !hasYearMonthDay && !hasYearDay) {
    throw new Error(
      "No pude detectar la fecha. Revisa que exista una columna Fecha o el par Año y Día en el Excel.",
    );
  }

  if (mapping.customerName === undefined && mapping.customerId === undefined) {
    throw new Error(
      "No pude detectar la columna de cliente. Revisa que el Excel tenga Cliente, Razón Social, PDV o Punto de Venta.",
    );
  }

  if (mapping.salesAmount === undefined && mapping.boxes === undefined) {
    throw new Error("No pude detectar una columna de venta o cajas. Revisa que exista Venta, Monto, Cajas o Cantidad.");
  }
}

function normalizeRow(row, mapping, parseStats) {
  if (isEmptyRow(row)) {
    return null;
  }

  const periodInfo = parsePeriodInfo(row, mapping);

  if (!periodInfo) {
    parseStats.invalidDates += 1;
    return null;
  }

  const customerId = parseText(readCell(row, mapping.customerId));
  const customerName = parseText(readCell(row, mapping.customerName)) || customerId;

  if (!customerName && !customerId) {
    parseStats.missingCustomers += 1;
    return null;
  }

  const salesAmount = readNumber(row, mapping.salesAmount, parseStats);
  const boxes = readNumber(row, mapping.boxes, parseStats);
  const volumeUc = readNumber(row, mapping.volumeUc, parseStats);
  const discount = readNumber(row, mapping.discount, parseStats, { percentage: true });
  const margin = readNumber(row, mapping.margin, parseStats, { percentage: true });

  return {
    ...periodInfo,
    customerId,
    customerName,
    sku: parseText(readCell(row, mapping.sku)),
    category: parseText(readCell(row, mapping.category)),
    brand: parseText(readCell(row, mapping.brand)),
    segment: parseText(readCell(row, mapping.segment)),
    package: parseText(readCell(row, mapping.package)),
    outputNumber: parseInteger(readCell(row, mapping.outputNumber)),
    salesAmount,
    boxes,
    volumeUc,
    zone: parseText(readCell(row, mapping.zone)),
    city: parseText(readCell(row, mapping.city)),
    office: parseText(readCell(row, mapping.office)),
    priority: parseText(readCell(row, mapping.priority)),
    channel: parseText(readCell(row, mapping.channel)),
    seller: parseText(readCell(row, mapping.seller)),
    route: parseText(readCell(row, mapping.route)),
    discount,
    margin,
  };
}

function normalizeDetectedMapping(headerResult, headerRow) {
  const mapping = { ...headerResult.mapping };
  const detectedLabels = { ...headerResult.detectedLabels };

  forceExactField(mapping, detectedLabels, headerRow, "year", ["ano"]);
  forceExactField(mapping, detectedLabels, headerRow, "month", ["mes"]);
  forceExactField(mapping, detectedLabels, headerRow, "dayOfPeriod", ["dia"]);
  forceExactField(mapping, detectedLabels, headerRow, "outputNumber", ["salidas", "salida"]);
  forceExactField(mapping, detectedLabels, headerRow, "zone", ["zona"]);
  forceExactField(mapping, detectedLabels, headerRow, "city", ["comuna"]);
  forceExactField(mapping, detectedLabels, headerRow, "office", ["oficina de ventas"]);
  forceExactField(mapping, detectedLabels, headerRow, "priority", ["ips"]);
  forceExactField(mapping, detectedLabels, headerRow, "route", ["ruta"]);
  forceExactField(mapping, detectedLabels, headerRow, "brand", ["marca"]);
  forceExactField(mapping, detectedLabels, headerRow, "segment", ["segmento"]);
  forceExactField(mapping, detectedLabels, headerRow, "package", ["empaque"]);
  forceExactField(mapping, detectedLabels, headerRow, "salesAmount", ["ingreso"]);
  forceExactField(mapping, detectedLabels, headerRow, "boxes", ["cf"]);
  forceExactField(mapping, detectedLabels, headerRow, "volumeUc", ["volumen uc"]);

  const dateHeader = headerResult.detectedLabels.date;

  if (
    mapping.year !== undefined &&
    mapping.date !== undefined &&
    ["dia", "day"].includes(normalizeColumnName(dateHeader))
  ) {
    mapping.dayOfPeriod = mapping.date;
    detectedLabels.dayOfPeriod = detectedLabels.date;
    delete detectedLabels.date;
    delete mapping.date;
  }

  return { detectedLabels, mapping };
}

function forceExactField(mapping, detectedLabels, headerRow, field, normalizedNames) {
  const index = headerRow.findIndex((header) => normalizedNames.includes(normalizeColumnName(header)));

  if (index >= 0) {
    mapping[field] = index;
    detectedLabels[field] = String(headerRow[index]).trim();
  }
}

function parsePeriodInfo(row, mapping) {
  const date = mapping.date !== undefined ? parseDate(readCell(row, mapping.date)) : null;

  if (date) {
    const [year, month, day] = date.split("-").map(Number);

    return {
      date,
      dateLabel: date,
      dayOfPeriod: day,
      month,
      periodMode: "date",
      year,
    };
  }

  if (mapping.year === undefined || mapping.dayOfPeriod === undefined) {
    return null;
  }

  const year = parseInteger(readCell(row, mapping.year));
  const month = parseMonth(readCell(row, mapping.month));
  const dayOfPeriod = parseInteger(readCell(row, mapping.dayOfPeriod));

  if (month !== null) {
    const completeDate = toIsoDate(year, month, dayOfPeriod);

    if (!completeDate) {
      return null;
    }

    return {
      date: completeDate,
      dateLabel: completeDate,
      dayOfPeriod,
      month,
      periodMode: "date",
      year,
    };
  }

  if (!isValidYearDay(year, dayOfPeriod)) {
    return null;
  }

  return {
    date: `${year}-01-${String(dayOfPeriod).padStart(2, "0")}`,
    dateLabel: `Día ${String(dayOfPeriod).padStart(2, "0")} / ${year}`,
    dayOfPeriod,
    month: null,
    periodMode: "yearDay",
    year,
  };
}

function readCell(row, columnIndex) {
  if (columnIndex === undefined) {
    return null;
  }

  return row[columnIndex];
}

function readNumber(row, columnIndex, parseStats, options = {}) {
  const rawValue = readCell(row, columnIndex);
  const parsed = parseNumber(rawValue, options);

  if (parsed.invalid) {
    parseStats.invalidNumbers += 1;
  }

  return parsed.value;
}

function parseText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  const text = String(value ?? "").trim();

  if (!/^-?\d+$/.test(text)) {
    return null;
  }

  return Number(text);
}

function parseMonth(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12) {
    return value;
  }

  const normalized = normalizeColumnName(value);
  const monthNames = {
    abr: 4,
    abril: 4,
    ago: 8,
    agosto: 8,
    dic: 12,
    diciembre: 12,
    ene: 1,
    enero: 1,
    feb: 2,
    febrero: 2,
    jul: 7,
    julio: 7,
    jun: 6,
    junio: 6,
    mar: 3,
    marzo: 3,
    may: 5,
    mayo: 5,
    nov: 11,
    noviembre: 11,
    oct: 10,
    octubre: 10,
    sep: 9,
    sept: 9,
    septiembre: 9,
  };

  if (monthNames[normalized]) {
    return monthNames[normalized];
  }

  const parsed = parseInteger(value);
  return parsed && parsed >= 1 && parsed <= 12 ? parsed : null;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const numericDate = parseNumericDate(value);

    if (numericDate) {
      return numericDate;
    }

    if (value > 20000 && value < 80000) {
      const excelDate = new Date(Math.round((value - 25569) * DAY_IN_MS));
      return toIsoDate(excelDate.getUTCFullYear(), excelDate.getUTCMonth() + 1, excelDate.getUTCDate());
    }
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const compactNumeric = parseNumericDate(Number(text.replace(/\D/g, "")));

  if (/^\d{8}$/.test(text.replace(/\D/g, "")) && compactNumeric) {
    return compactNumeric;
  }

  const yearFirst = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);

  if (yearFirst) {
    return toIsoDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
  }

  const dayFirst = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);

  if (dayFirst) {
    const year = normalizeYear(Number(dayFirst[3]));
    return toIsoDate(year, Number(dayFirst[2]), Number(dayFirst[1]));
  }

  const fallbackDate = new Date(text);

  if (!Number.isNaN(fallbackDate.getTime())) {
    return toIsoDate(fallbackDate.getFullYear(), fallbackDate.getMonth() + 1, fallbackDate.getDate());
  }

  return null;
}

function parseNumericDate(value) {
  if (!Number.isInteger(value) || value < 19000101 || value > 21001231) {
    return null;
  }

  const text = String(value);
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));

  return toIsoDate(year, month, day);
}

function normalizeYear(year) {
  if (year < 100) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
}

function isValidYearDay(year, day) {
  return Number.isInteger(year) && year >= 1900 && year <= 2100 && Number.isInteger(day) && day >= 1 && day <= 31;
}

function toIsoDate(year, month, day) {
  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidDateParts(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function parseNumber(value, options = {}) {
  if (value === null || value === undefined || value === "") {
    return { value: null, invalid: false };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return { value: normalizePercentage(value, options.percentage), invalid: false };
  }

  const text = String(value).trim();

  if (!text) {
    return { value: null, invalid: false };
  }

  const hasPercentSymbol = text.includes("%");
  const isNegative = /^\(.*\)$/.test(text);
  let cleaned = text
    .replace(/\((.*)\)/, "$1")
    .replace(/[^0-9,.-]/g, "")
    .replace(/(?!^)-/g, "");

  if (!/\d/.test(cleaned)) {
    return { value: null, invalid: true };
  }

  cleaned = normalizeSeparators(cleaned);

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return { value: null, invalid: true };
  }

  const signedValue = isNegative ? parsed * -1 : parsed;

  return {
    value: normalizePercentage(signedValue, options.percentage || hasPercentSymbol),
    invalid: false,
  };
}

function normalizeSeparators(value) {
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    return value.replaceAll(thousandSeparator, "").replace(decimalSeparator, ".");
  }

  if (lastComma >= 0) {
    return normalizeSingleSeparator(value, ",");
  }

  if (lastDot >= 0) {
    return normalizeSingleSeparator(value, ".");
  }

  return value;
}

function normalizeSingleSeparator(value, separator) {
  const [integerPart, decimalPart] = value.split(separator);

  if (!decimalPart) {
    return value;
  }

  if (decimalPart.length === 3 && integerPart.length <= 3) {
    return value.replaceAll(separator, "");
  }

  return value.replace(separator, ".");
}

function normalizePercentage(value, isPercentage) {
  if (!isPercentage) {
    return value;
  }

  if (Math.abs(value) > 1) {
    return value / 100;
  }

  return value;
}

function isEmptyRow(row) {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
}

function buildSummary({ customerCount, detectedColumns, file, mapping, records, worksheetName }) {
  const baseSummary = {
    source: "Power BI Andina",
    fileName: file.name,
    worksheetName,
    rowsProcessed: records.length,
    customersDetected: customerCount,
    detectedColumns,
  };

  const hasCompleteDates = records.some((record) => record.periodMode === "date");

  if (mapping.date !== undefined || mapping.month !== undefined || hasCompleteDates) {
    const dateValues = records.map((record) => record.date).sort();

    return {
      ...baseSummary,
      periodMode: "rolling28",
      minDate: dateValues[0],
      maxDate: dateValues[dateValues.length - 1],
      minDateLabel: dateValues[0],
      maxDateLabel: dateValues[dateValues.length - 1],
    currentPeriodLabel: "últimos 28 días",
    previousPeriodLabel: "28 días anteriores",
    currentMonthPeriodLabel: buildMonthPeriodLabel(dateValues[dateValues.length - 1]),
    previousMonthPeriodLabel: buildPreviousMonthPeriodLabel(dateValues[dateValues.length - 1]),
  };
  }

  const validYears = [...new Set(records.map((record) => record.year))]
    .filter((year) => Number.isInteger(year))
    .sort((a, b) => a - b);
  const currentYear = validYears[validYears.length - 1];
  const comparisonYear = validYears.filter((year) => year < currentYear).at(-1) ?? null;
  const currentYearDays = records
    .filter((record) => record.year === currentYear)
    .map((record) => record.dayOfPeriod)
    .filter((day) => Number.isInteger(day));
  const currentYearOutputs = records
    .filter((record) => record.year === currentYear)
    .map((record) => record.outputNumber)
    .filter((outputNumber) => Number.isInteger(outputNumber));
  const minDay = Math.min(...currentYearDays);
  const maxDay = Math.max(...currentYearDays);
  const minOutputNumber = currentYearOutputs.length ? Math.min(...currentYearOutputs) : null;
  const maxOutputNumber = currentYearOutputs.length ? Math.max(...currentYearOutputs) : null;
  const cutoffField = maxOutputNumber ? "outputNumber" : "dayOfPeriod";
  const dayRangeLabel = maxOutputNumber
    ? `salidas ${String(minOutputNumber).padStart(2, "0")}-${String(maxOutputNumber).padStart(2, "0")}`
    : `días ${String(minDay).padStart(2, "0")}-${String(maxDay).padStart(2, "0")}`;

  return {
    ...baseSummary,
    periodMode: "yearDay",
    currentYear,
    comparisonYear,
    cutoffField,
    minDay,
    maxDay,
    minOutputNumber,
    maxOutputNumber,
    minDate: `${currentYear}-01-${String(minDay).padStart(2, "0")}`,
    maxDate: `${currentYear}-01-${String(maxDay).padStart(2, "0")}`,
    minDateLabel: `Día ${String(minDay).padStart(2, "0")} / ${currentYear}`,
    maxDateLabel: `Día ${String(maxDay).padStart(2, "0")} / ${currentYear}`,
    currentPeriodLabel: `${currentYear}, ${dayRangeLabel}`,
    previousPeriodLabel: comparisonYear ? `${comparisonYear}, ${dayRangeLabel}` : "sin año comparable",
  };
}

function buildWarnings(parseStats, summary) {
  const warnings = [];

  if (parseStats.invalidDates > 0) {
    warnings.push(`Se omitieron ${parseStats.invalidDates} filas con fecha, año o día inválido.`);
  }

  if (parseStats.missingCustomers > 0) {
    warnings.push(`Se omitieron ${parseStats.missingCustomers} filas sin cliente detectado.`);
  }

  if (parseStats.invalidNumbers > 0) {
    warnings.push(`Algunos valores numéricos no se pudieron leer y quedaron como sin dato.`);
  }

  if (summary.periodMode === "yearDay") {
    warnings.push(
      "El Excel no trae mes ni fecha completa. La comparación se hará contra el mismo rango de días del año anterior.",
    );
  }

  if (!summary.detectedColumns.outputNumber) {
    warnings.push("No se detectó columna Salidas. Las comparaciones usarán día/fecha como corte operativo.");
  }

  return warnings;
}

function buildMonthPeriodLabel(maxDate) {
  const [year, month, day] = maxDate.split("-").map(Number);
  return `${monthName(month)} ${year}, días 01-${String(day).padStart(2, "0")}`;
}

function buildPreviousMonthPeriodLabel(maxDate) {
  const [year, month, day] = maxDate.split("-").map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousDay = Math.min(day, new Date(previousYear, previousMonth, 0).getDate());
  return `${monthName(previousMonth)} ${previousYear}, días 01-${String(previousDay).padStart(2, "0")}`;
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

  return names[month - 1] ?? `mes ${month}`;
}
