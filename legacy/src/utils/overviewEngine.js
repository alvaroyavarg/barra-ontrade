import { formatCurrency, formatNumber, formatTrendPercent, isFiniteNumber, parseIsoDate } from "./formatters.js";
import { getCommercialSkuIdentity } from "./productIdentity.js";

const FISCAL_START_MONTH = 7;

export function buildGeneralViews(records, summary, options = {}) {
  return {
    yearOverYearMonth: buildYearOverYearMonthView(records, summary, options),
    previousMonth: buildPreviousMonthView(records, summary, options),
    yearToDate: buildYearToDateView(records, summary, options),
  };
}

function buildYearOverYearMonthView(records, summary, options) {
  if (summary.periodMode === "yearDay") {
    const cutoffField = summary.cutoffField ?? "dayOfPeriod";
    const minCutoff = cutoffField === "outputNumber" ? (summary.minOutputNumber ?? 1) : summary.minDay;
    const maxCutoff = cutoffField === "outputNumber" ? summary.maxOutputNumber : summary.maxDay;
    const currentRecords = records.filter(
      (record) =>
        record.year === summary.currentYear &&
        isWithinSimpleCutoff(record, cutoffField, minCutoff, maxCutoff),
    );
    const comparisonRecords = summary.comparisonYear
      ? records.filter(
          (record) =>
            record.year === summary.comparisonYear &&
            isWithinSimpleCutoff(record, cutoffField, minCutoff, maxCutoff),
        )
      : [];

    return buildComparison({
      comparisonLabel: summary.previousPeriodLabel,
      comparisonRecords,
      currentLabel: summary.currentPeriodLabel,
      currentRecords,
      key: "yearOverYearMonth",
      scope: options.scope,
      title: "Vs AA mes",
      unavailableReason: summary.comparisonYear ? "" : "No hay año anterior comparable en el archivo.",
    });
  }

  const anchor = parseIsoDate(summary.maxDate);

  if (!anchor) {
    return unavailableView("yearOverYearMonth", "Vs AA mes", "No pude detectar una fecha máxima válida.");
  }

  const context = getMonthContext(records, anchor);
  const { currentMonth, currentYear, cutoffField, cutoffValue, maxDay } = context;
  const comparisonYear = currentYear - 1;

  return buildComparison({
    comparisonLabel: `${monthName(currentMonth)} ${comparisonYear}, ${cutoffLabel(cutoffField, cutoffValue, maxDay)}`,
    comparisonRecords: records.filter(
      (record) => record.year === comparisonYear && record.month === currentMonth && isWithinMonthCutoff(record, context),
    ),
    currentLabel: `${monthName(currentMonth)} ${currentYear}, ${cutoffLabel(cutoffField, cutoffValue, maxDay)}`,
    currentRecords: records.filter(
      (record) => record.year === currentYear && record.month === currentMonth && isWithinMonthCutoff(record, context),
    ),
    key: "yearOverYearMonth",
    scope: options.scope,
    title: "Vs AA mes",
  });
}

function buildPreviousMonthView(records, summary, options) {
  if (summary.periodMode === "yearDay") {
    return unavailableView(
      "previousMonth",
      "Vs mes anterior",
      "Este Excel no trae mes ni fecha completa. Para comparar vs mes anterior necesitamos una columna Mes o Fecha.",
    );
  }

  const anchor = parseIsoDate(summary.maxDate);

  if (!anchor) {
    return unavailableView("previousMonth", "Vs mes anterior", "No pude detectar una fecha máxima válida.");
  }

  const context = getMonthContext(records, anchor);
  const { currentMonth, currentYear, cutoffField, cutoffValue, maxDay } = context;
  const previousPeriod = previousMonth(currentYear, currentMonth);
  const previousMaxDay = Math.min(maxDay, daysInMonth(previousPeriod.year, previousPeriod.month));

  return buildComparison({
    comparisonLabel: `${monthName(previousPeriod.month)} ${previousPeriod.year}, ${cutoffLabel(cutoffField, cutoffValue, previousMaxDay)}`,
    comparisonRecords: records.filter(
      (record) =>
        record.year === previousPeriod.year && record.month === previousPeriod.month && isWithinMonthCutoff(record, context, previousMaxDay),
    ),
    currentLabel: `${monthName(currentMonth)} ${currentYear}, ${cutoffLabel(cutoffField, cutoffValue, maxDay)}`,
    currentRecords: records.filter(
      (record) => record.year === currentYear && record.month === currentMonth && isWithinMonthCutoff(record, context),
    ),
    key: "previousMonth",
    scope: options.scope,
    title: "Vs mes anterior",
  });
}

function buildYearToDateView(records, summary, options) {
  if (summary.periodMode === "yearDay") {
    return unavailableView(
      "yearToDate",
      "Vs AA YTD",
      "Este Excel no trae mes ni fecha completa. Para calcular YTD necesitamos una columna Mes o Fecha.",
    );
  }

  const anchor = parseIsoDate(summary.maxDate);

  if (!anchor) {
    return unavailableView("yearToDate", "Vs AA YTD", "No pude detectar una fecha máxima válida.");
  }

  if (options.yearBasis === "fiscal") {
    return buildFiscalYearToDateView(records, summary, anchor, options);
  }

  return buildCalendarYearToDateView(records, anchor, options);
}

function buildCalendarYearToDateView(records, anchor, options) {
  const context = getMonthContext(records, anchor);
  const { currentMonth: cutoffMonth, currentYear, cutoffField, cutoffValue } = context;
  const comparisonYear = currentYear - 1;

  return buildComparison({
    comparisonLabel: `YTD ${comparisonYear} ${ytdCutoffLabel(cutoffField, cutoffValue, context.maxDay, cutoffMonth)}`,
    comparisonRecords: records.filter(
      (record) =>
        record.year === comparisonYear &&
        isWithinYtdCutoff(record, cutoffMonth, context),
    ),
    currentLabel: `YTD ${currentYear} ${ytdCutoffLabel(cutoffField, cutoffValue, context.maxDay, cutoffMonth)}`,
    currentRecords: records.filter(
      (record) =>
        record.year === currentYear &&
        isWithinYtdCutoff(record, cutoffMonth, context),
    ),
    key: "yearToDate",
    scope: options.scope,
    title: "Vs AA YTD",
  });
}

function buildFiscalYearToDateView(records, summary, anchor, options) {
  const currentYear = anchor.getFullYear();
  const currentMonth = anchor.getMonth() + 1;
  const currentDay = anchor.getDate();
  const currentFiscalYear = getFiscalYear(currentYear, currentMonth);
  const comparisonFiscalYear = currentFiscalYear - 1;
  const currentStartDate = new Date(currentFiscalYear - 1, FISCAL_START_MONTH - 1, 1);
  const currentEndDate = new Date(currentYear, currentMonth - 1, currentDay);
  const comparisonStartDate = new Date(comparisonFiscalYear - 1, FISCAL_START_MONTH - 1, 1);
  const comparisonEndDate = new Date(
    currentYear - 1,
    currentMonth - 1,
    Math.min(currentDay, daysInMonth(currentYear - 1, currentMonth)),
  );
  const unavailableReason = getFiscalCoverageIssue({
    comparisonFiscalYear,
    comparisonStartDate,
    currentFiscalYear,
    currentStartDate,
    summary,
  });

  return buildComparison({
    comparisonLabel: fiscalYtdLabel(comparisonFiscalYear, comparisonStartDate, comparisonEndDate),
    comparisonRecords: records.filter((record) => isWithinDateRange(record, comparisonStartDate, comparisonEndDate)),
    currentLabel: fiscalYtdLabel(currentFiscalYear, currentStartDate, currentEndDate),
    currentRecords: records.filter((record) => isWithinDateRange(record, currentStartDate, currentEndDate)),
    key: "yearToDate",
    scope: options.scope,
    title: "Vs AA YTD",
    unavailableReason,
  });
}

function buildComparison({ comparisonLabel, comparisonRecords, currentLabel, currentRecords, key, scope = "portfolio", title, unavailableReason = "" }) {
  if (unavailableReason) {
    return unavailableView(key, title, unavailableReason);
  }

  const current = buildMetrics(currentRecords);
  const comparison = buildMetrics(comparisonRecords);
  const salesTrend = getTrend(current.sales, comparison.sales);
  const boxesTrend = getTrend(current.boxes, comparison.boxes);
  const categoryMomentum = getMomentum(currentRecords, comparisonRecords, "category");
  const brandMomentum = getMomentum(currentRecords, comparisonRecords, "brand");
  const focusMomentum = getMomentum(currentRecords, comparisonRecords, scope === "customer" ? "sku" : "customerName");
  const focusField = scope === "customer" ? "sku" : "customerName";

  return {
    available: true,
    boxesTrend,
    bullets: buildBullets({
      boxesTrend,
      brandMomentum,
      categoryMomentum,
      comparison,
      comparisonLabel,
      current,
      currentLabel,
      focusMomentum,
      scope,
      salesTrend,
    }),
    brandMomentum,
    categoryMomentum,
    comparison,
    comparisonLabel,
    current,
    currentLabel,
    focusMomentum,
    key,
    opportunityBrands: declineItems(currentRecords, comparisonRecords, "brand"),
    opportunityCategories: declineItems(currentRecords, comparisonRecords, "category"),
    opportunityFocus: declineItems(currentRecords, comparisonRecords, focusField),
    salesTrend,
    title,
    topBrands: growthItems(currentRecords, comparisonRecords, "brand"),
    topCategories: growthItems(currentRecords, comparisonRecords, "category"),
    topCustomers: growthItems(currentRecords, comparisonRecords, "customerName"),
    topSkus: growthItems(currentRecords, comparisonRecords, "sku"),
  };
}

function unavailableView(key, title, reason) {
  return {
    available: false,
    key,
    reason,
    title,
  };
}

function buildMetrics(records) {
  return {
    boxes: sum(records, "boxes"),
    customers: new Set(records.filter(hasPurchase).map(customerKey)).size,
    rows: records.length,
    sales: sum(records, "salesAmount"),
    skus: new Set(records.filter(hasPurchase).map((record) => record.sku).filter(Boolean)).size,
    volumeUc: sum(records, "volumeUc"),
  };
}

function buildBullets({ boxesTrend, categoryMomentum, comparison, comparisonLabel, current, currentLabel, focusMomentum, scope, salesTrend }) {
  const bullets = [];

  if (isFiniteNumber(salesTrend)) {
    bullets.push(`Venta ${formatTrendPercent(salesTrend)} vs ${comparisonLabel}: ${formatCurrency(current.sales)} frente a ${formatCurrency(comparison.sales)}.`);
  } else if (current.sales > 0 && comparison.sales === 0) {
    bullets.push(`Venta sin base comparable en ${comparisonLabel}: ${formatCurrency(current.sales)} en ${currentLabel}.`);
  } else {
    bullets.push(`Sin venta suficiente para calcular tendencia entre ${currentLabel} y ${comparisonLabel}.`);
  }

  if (isFiniteNumber(boxesTrend)) {
    bullets.push(`CF ${formatTrendPercent(boxesTrend)} vs ${comparisonLabel}, con ${formatNumber(current.boxes)} cajas en el período actual.`);
  }

  if (categoryMomentum.falling) {
    bullets.push(
      `Categoría a cuidar: ${categoryMomentum.falling.name} cae ${formatTrendPercent(categoryMomentum.falling.trend)} vs ${comparisonLabel}.`,
    );
  } else if (categoryMomentum.growing) {
    bullets.push(
      `Categoría empujando crecimiento: ${categoryMomentum.growing.name} sube ${formatTrendPercent(categoryMomentum.growing.trend)} vs ${comparisonLabel}.`,
    );
  }

  if (focusMomentum.falling) {
    bullets.push(
      `${scope === "customer" ? "SKU" : "Cliente"} con mayor presión: ${focusMomentum.falling.name} cae ${formatCurrency(Math.abs(focusMomentum.falling.delta))} vs ${comparisonLabel}.`,
    );
  }

  bullets.push(
    scope === "customer"
      ? `SKUs activos: ${formatNumber(current.skus)} en ${currentLabel}.`
      : `Clientes activos: ${formatNumber(current.customers)} en ${currentLabel}.`,
  );

  return bullets.slice(0, 5);
}

function getMomentum(currentRecords, comparisonRecords, field) {
  const currentTotals = totalsBy(currentRecords, field);
  const comparisonTotals = totalsBy(comparisonRecords, field);
  const names = new Set([...currentTotals.keys(), ...comparisonTotals.keys()]);
  const items = Array.from(names)
    .map((key) => {
      const currentItem = currentTotals.get(key);
      const comparisonItem = comparisonTotals.get(key);
      const current = currentItem?.value ?? 0;
      const comparison = comparisonItem?.value ?? 0;

      return {
        comparison,
        current,
        delta: current - comparison,
        name: currentItem?.name ?? comparisonItem?.name ?? key,
        trend: getTrend(current, comparison),
      };
    })
    .filter((item) => item.current > 0 || item.comparison > 0);

  return {
    falling: items
      .filter((item) => item.delta < 0 && item.comparison > 0)
      .sort((a, b) => a.delta - b.delta)[0],
    growing: items
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta)[0],
  };
}

function growthItems(currentRecords, comparisonRecords, field, limit = 10) {
  return comparisonItems(currentRecords, comparisonRecords, field)
    .filter((item) => item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

function declineItems(currentRecords, comparisonRecords, field, limit = 10) {
  return comparisonItems(currentRecords, comparisonRecords, field)
    .filter((item) => item.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);
}

function comparisonItems(currentRecords, comparisonRecords, field) {
  const currentTotals = totalsBy(currentRecords, field);
  const comparisonTotals = totalsBy(comparisonRecords, field);
  const names = new Set([...currentTotals.keys(), ...comparisonTotals.keys()]);

  return Array.from(names)
    .map((key) => {
      const currentItem = currentTotals.get(key);
      const comparisonItem = comparisonTotals.get(key);
      const current = currentItem?.value ?? 0;
      const comparison = comparisonItem?.value ?? 0;

      return {
        comparison,
        current,
        delta: current - comparison,
        name: currentItem?.name ?? comparisonItem?.name ?? key,
        trend: getTrend(current, comparison),
      };
    })
    .filter((item) => item.name && (item.current > 0 || item.comparison > 0));
}

function totalsBy(records, field) {
  const totals = new Map();

  for (const record of records) {
    const { key, label } = getGroupingIdentity(record, field);

    if (!key) {
      continue;
    }

    const existing = totals.get(key);
    totals.set(key, {
      name: existing?.name ?? label,
      value: (existing?.value ?? 0) + (record.salesAmount ?? 0),
    });
  }

  return totals;
}

function getGroupingIdentity(record, field) {
  if (field === "sku") {
    return getCommercialSkuIdentity(record.sku);
  }

  const value = record[field];

  return {
    key: String(value ?? ""),
    label: String(value ?? ""),
  };
}

function sum(records, field) {
  return records.reduce((total, record) => total + (record[field] ?? 0), 0);
}

function getTrend(current, comparison) {
  if (!comparison) {
    return null;
  }

  return (current - comparison) / comparison;
}

function getFiscalYear(year, month) {
  return month >= FISCAL_START_MONTH ? year + 1 : year;
}

function getFiscalCoverageIssue({ comparisonFiscalYear, comparisonStartDate, currentFiscalYear, currentStartDate, summary }) {
  const summaryStart = parseIsoDate(summary.minDate);

  if (!summaryStart) {
    return "No pude validar desde cuándo parte la data para calcular el año fiscal.";
  }

  const requiredStart = comparisonStartDate;

  if (summaryStart > requiredStart) {
    return `YTD fiscal no disponible completo. Para comparar FY${shortFiscalYear(currentFiscalYear)} vs FY${shortFiscalYear(comparisonFiscalYear)} necesitamos data desde ${formatDateText(requiredStart)}; este Excel parte el ${formatDateText(summaryStart)}.`;
  }

  if (summaryStart > currentStartDate) {
    return `YTD fiscal actual incompleto. Para FY${shortFiscalYear(currentFiscalYear)} necesitamos data desde ${formatDateText(currentStartDate)}.`;
  }

  return "";
}

function isWithinDateRange(record, startDate, endDate) {
  const recordDate = parseIsoDate(record.date);

  if (!recordDate) {
    return false;
  }

  return recordDate >= startDate && recordDate <= endDate;
}

function fiscalYtdLabel(fiscalYear, startDate, endDate) {
  return `FY${shortFiscalYear(fiscalYear)} ${monthName(startDate.getMonth() + 1)} ${startDate.getFullYear()}-${monthName(endDate.getMonth() + 1)} ${endDate.getFullYear()}, hasta el ${String(endDate.getDate()).padStart(2, "0")} de ${monthName(endDate.getMonth() + 1)}`;
}

function shortFiscalYear(fiscalYear) {
  return String(fiscalYear).slice(-2);
}

function formatDateText(date) {
  return `${String(date.getDate()).padStart(2, "0")} de ${monthName(date.getMonth() + 1)} de ${date.getFullYear()}`;
}

function hasPurchase(record) {
  return (record.salesAmount ?? 0) > 0 || (record.boxes ?? 0) > 0 || (record.volumeUc ?? 0) > 0;
}

function customerKey(record) {
  return record.customerId || record.customerName;
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

function previousMonth(year, month) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }

  return { month: month - 1, year };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMonthContext(records, anchor) {
  const currentYear = anchor.getFullYear();
  const currentMonth = anchor.getMonth() + 1;
  const currentMonthRecords = records.filter((record) => record.year === currentYear && record.month === currentMonth);
  const outputNumbers = currentMonthRecords
    .map((record) => record.outputNumber)
    .filter((outputNumber) => Number.isInteger(outputNumber));
  const maxDay = anchor.getDate();

  if (outputNumbers.length) {
    return {
      cutoffField: "outputNumber",
      cutoffValue: Math.max(...outputNumbers),
      currentMonth,
      currentYear,
      maxDay,
    };
  }

  return {
    cutoffField: "dayOfPeriod",
    cutoffValue: maxDay,
    currentMonth,
    currentYear,
    maxDay,
  };
}

function isWithinSimpleCutoff(record, cutoffField, minCutoff, maxCutoff) {
  const value = record[cutoffField];

  if (!Number.isInteger(value)) {
    return false;
  }

  return value >= minCutoff && value <= maxCutoff;
}

function isWithinMonthCutoff(record, context, dayFallback = context.maxDay) {
  if (context.cutoffField === "outputNumber" && Number.isInteger(record.outputNumber)) {
    return record.outputNumber <= context.cutoffValue;
  }

  return Number.isInteger(record.dayOfPeriod) && record.dayOfPeriod <= dayFallback;
}

function isWithinYtdCutoff(record, cutoffMonth, context) {
  if (!Number.isInteger(record.month)) {
    return false;
  }

  if (record.month < cutoffMonth) {
    return true;
  }

  if (record.month !== cutoffMonth) {
    return false;
  }

  return isWithinMonthCutoff(record, context);
}

function cutoffLabel(cutoffField, cutoffValue, dayFallback) {
  if (cutoffField === "outputNumber") {
    return `salidas 01-${String(cutoffValue).padStart(2, "0")}`;
  }

  return `días 01-${String(dayFallback).padStart(2, "0")}`;
}

function ytdCutoffLabel(cutoffField, cutoffValue, dayFallback, month) {
  if (cutoffField === "outputNumber") {
    return `hasta salida ${String(cutoffValue).padStart(2, "0")} de ${monthName(month)}`;
  }

  return `hasta el ${String(dayFallback).padStart(2, "0")} de ${monthName(month)}`;
}
