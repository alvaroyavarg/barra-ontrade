import {
  formatCurrency,
  formatNumber,
  formatSharePercent,
  formatTrendPercent,
  isFiniteNumber,
  parseIsoDate,
} from "./formatters.js";
import { normalizeColumnName } from "./columnMapping.js";
import { getCommercialSkuIdentity } from "./productIdentity.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RECENT_PURCHASE_THRESHOLD_DAYS = 10;
const STRONG_CATEGORY_DROP = -0.25;
const LOW_PREMIUM_SHARE = 0.2;
const LOW_MARGIN = 0.15;

export function buildCustomerBriefs(records, summary) {
  const groups = groupByCustomer(records);
  const maxDate = summary.maxDate;

  return Array.from(groups.values())
    .map((customerRecords) => buildCustomerBrief(customerRecords, summary, maxDate))
    .sort((a, b) => b.metrics.salesLast28 - a.metrics.salesLast28 || a.customerName.localeCompare(b.customerName, "es"));
}

function buildCustomerBrief(records, summary, maxDate) {
  const period = getPeriodContext(records, summary, maxDate);
  const { currentRecords, previousRecords } = period;
  const latestRecords = [...records].sort(compareRecordsDesc);

  const salesLast28 = sumField(currentRecords, "salesAmount");
  const salesPrevious28 = sumField(previousRecords, "salesAmount");
  const boxesLast28 = sumField(currentRecords, "boxes");
  const boxesPrevious28 = sumField(previousRecords, "boxes");
  const volumeUcLast28 = sumField(currentRecords, "volumeUc");
  const salesTrendPercent = salesPrevious28 > 0 ? (salesLast28 - salesPrevious28) / salesPrevious28 : null;
  const lastPurchase = getLastPurchase(records, period, maxDate);
  const lastPurchaseDate = lastPurchase?.date ?? null;
  const lastPurchaseLabel = lastPurchase?.label ?? null;
  const daysSinceLastPurchase = lastPurchase?.daysSince ?? null;
  const skuCount = new Set(records.map((record) => record.sku).filter(Boolean)).size;
  const categoryCount = new Set(records.map((record) => record.category).filter(Boolean)).size;
  const topSkus = topByField(currentRecords.length ? currentRecords : records, "sku");
  const topCategories = topByField(currentRecords.length ? currentRecords : records, "category");
  const categoryDecline = getCategoryDecline(currentRecords, previousRecords);
  const abandonedSku = getAbandonedSku(currentRecords, previousRecords);
  const premiumOpportunity = getPremiumOpportunity(records, currentRecords, salesLast28);
  const averageDiscount = averageField(currentRecords.length ? currentRecords : records, "discount");
  const averageMargin = averageField(currentRecords.length ? currentRecords : records, "margin");
  const hasDiscount = records.some((record) => isFiniteNumber(record.discount));
  const hasMargin = records.some((record) => isFiniteNumber(record.margin));

  const metrics = {
    salesLast28,
    salesPrevious28,
    salesTrendPercent,
    boxesLast28,
    boxesPrevious28,
    volumeUcLast28,
    lastPurchaseDate,
    lastPurchaseLabel,
    daysSinceLastPurchase,
    skuCount,
    categoryCount,
    averageDiscount,
    averageMargin,
    currentPeriodLabel: period.currentPeriodLabel,
    previousPeriodLabel: period.previousPeriodLabel,
  };

  const status = getStatus(metrics);
  const flags = {
    abandonedSku,
    categoryDecline,
    hasDiscount,
    hasMargin,
    isFalling: salesPrevious28 > 0 && salesLast28 < salesPrevious28 * 0.85,
    isGrowing: salesPrevious28 > 0 && salesLast28 > salesPrevious28 * 1.1,
    lowMargin: hasMargin && isFiniteNumber(averageMargin) && averageMargin < LOW_MARGIN,
    noCurrentPurchase: period.noCurrentPurchase,
    noRecentPurchase:
      period.hasComparablePeriods &&
      (period.noCurrentPurchase || (isFiniteNumber(daysSinceLastPurchase) && daysSinceLastPurchase >= RECENT_PURCHASE_THRESHOLD_DAYS)),
    premiumOpportunity,
  };

  const insights = buildInsights(metrics, flags, topSkus, topCategories);
  const nextBestAction = buildNextBestAction(flags, status);
  const openingLine = buildOpeningLine(flags, status);
  const primaryRecord = latestRecords[0] ?? records[0];

  return {
    id: `${primaryRecord.customerId || primaryRecord.customerName}`,
    customerId: primaryRecord.customerId,
    customerName: primaryRecord.customerName,
    channel: mostCommonValue(records, "channel"),
    zone: mostCommonValue(records, "zone"),
    city: mostCommonValue(records, "city"),
    office: mostCommonValue(records, "office"),
    priority: mostCommonValue(records, "priority"),
    seller: mostCommonValue(records, "seller"),
    route: mostCommonValue(records, "route"),
    source: summary.source,
    periodMode: summary.periodMode,
    metrics,
    statusKey: status.key,
    statusLabel: status.label,
    topSkus,
    topCategories,
    insights,
    nextBestAction,
    openingLine,
    searchText: buildSearchText(records, primaryRecord),
  };
}

function groupByCustomer(records) {
  const groups = new Map();

  for (const record of records) {
    const key = record.customerId || normalizeColumnName(record.customerName);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(record);
  }

  return groups;
}

function buildInsights(metrics, flags, topSkus, topCategories) {
  const insights = [];

  if (flags.isFalling) {
    insights.push(
      `Venta en caída: ${metrics.currentPeriodLabel} ${formatTrendPercent(metrics.salesTrendPercent)} vs ${metrics.previousPeriodLabel}.`,
    );
  }

  if (flags.isGrowing) {
    insights.push(
      `Cliente creciendo: ${metrics.currentPeriodLabel} ${formatTrendPercent(metrics.salesTrendPercent)} vs ${metrics.previousPeriodLabel}. Oportunidad para capturar mayor ticket o mix.`,
    );
  }

  if (flags.noCurrentPurchase) {
    insights.push(`No registra compra en ${metrics.currentPeriodLabel}. Validar reposición antes de negociar condiciones.`);
  } else if (flags.noRecentPurchase) {
    insights.push(
      `Lleva ${metrics.daysSinceLastPurchase} días sin compra. Validar reposición antes de negociar nuevas condiciones.`,
    );
  }

  if (flags.categoryDecline) {
    insights.push(
      `La baja está concentrada en ${flags.categoryDecline.name}, con caída de ${formatTrendPercent(flags.categoryDecline.trend)}.`,
    );
  }

  if (flags.abandonedSku) {
    insights.push(`SKU abandonado: antes compraba ${flags.abandonedSku.name} y no aparece en ${metrics.currentPeriodLabel}.`);
  }

  if (flags.premiumOpportunity) {
    insights.push(
      `Oportunidad de mix: premium pesa ${formatSharePercent(flags.premiumOpportunity.share)} de la venta del cliente.`,
    );
  }

  if (flags.hasDiscount && isFiniteNumber(metrics.averageDiscount)) {
    insights.push(
      `Descuento promedio detectado: ${formatSharePercent(metrics.averageDiscount)}. No subir condición sin compromiso de volumen.`,
    );
  }

  if (flags.lowMargin) {
    insights.push(
      `Margen bajo detectado: ${formatSharePercent(metrics.averageMargin)}. Priorizar mix o volumen incremental antes de entregar más descuento.`,
    );
  }

  addFallbackInsights(insights, metrics, topSkus, topCategories);

  return insights.slice(0, 7);
}

function addFallbackInsights(insights, metrics, topSkus, topCategories) {
  const fallbackInsights = [
    `Venta ${metrics.currentPeriodLabel}: ${formatCurrency(metrics.salesLast28)} frente a ${formatCurrency(metrics.salesPrevious28)} en ${metrics.previousPeriodLabel}.`,
    topSkus[0] ? `SKU foco: ${topSkus[0].name} lidera la venta reciente con ${formatCurrency(topSkus[0].value)}.` : null,
    topCategories[0]
      ? `Categoría foco: ${topCategories[0].name} concentra ${formatCurrency(topCategories[0].value)} en ${metrics.currentPeriodLabel}.`
      : null,
    metrics.boxesLast28 > 0 ? `Volumen reciente: ${formatNumber(metrics.boxesLast28)} cajas en ${metrics.currentPeriodLabel}.` : null,
    `Usar la conversación para validar stock, rotación y reposición del pedido base.`,
  ].filter(Boolean);

  for (const fallback of fallbackInsights) {
    if (insights.length >= 3) {
      return;
    }

    if (!insights.includes(fallback)) {
      insights.push(fallback);
    }
  }
}

function buildNextBestAction(flags, status) {
  if (flags.noCurrentPurchase || flags.noRecentPurchase) {
    return "Validar causa de falta de recompra antes de ofrecer descuento. Priorizar reposición del SKU habitual.";
  }

  if (flags.isFalling || flags.categoryDecline) {
    return "Recuperar la categoría en caída con una propuesta acotada de reposición y condición atada a volumen.";
  }

  if (flags.abandonedSku) {
    return "Reactivar el SKU abandonado con reposición base y revisar si hubo quiebre, precio o cambio de preferencia.";
  }

  if (flags.isGrowing || status.key === "growing") {
    return "Defender condición comercial actual y capturar crecimiento con productos de mayor margen.";
  }

  if (flags.premiumOpportunity) {
    return "Proponer combo de reposición base más introducción premium para mejorar mix.";
  }

  if (flags.lowMargin) {
    return "Priorizar volumen incremental o mix antes de entregar una nueva condición comercial.";
  }

  return "Mantener reposición base y buscar una oportunidad concreta de mix o volumen para subir el ticket.";
}

function buildOpeningLine(flags, status) {
  if (flags.noCurrentPurchase || flags.noRecentPurchase) {
    return "Noté que llevas varios días sin compra. ¿Revisamos qué necesitas reponer para este fin de semana?";
  }

  if (flags.abandonedSku) {
    return "Noté que dejaste de comprar un SKU que antes movías bien. ¿Lo revisamos para este pedido?";
  }

  if (flags.isFalling || flags.categoryDecline) {
    return "Vi que bajó tu rotación en las últimas semanas; te propongo revisar cómo recuperarla con una compra acotada.";
  }

  if (flags.isGrowing || status.key === "growing") {
    return "Veo que vienes con buena rotación; te propongo aprovechar ese ritmo con un mix que te deje mejor margen.";
  }

  if (flags.premiumOpportunity) {
    return "Veo espacio para sumar premium sin mover toda la compra. ¿Probamos una reposición chica para medir rotación?";
  }

  return "Revisé tu compra reciente y te propongo armar un pedido enfocado en reposición base y una mejora de mix.";
}

function getStatus(metrics) {
  if (metrics.salesPrevious28 === 0 && metrics.salesLast28 === 0) {
    return { key: "insufficient", label: "Sin data suficiente" };
  }

  if (metrics.salesPrevious28 === 0 && metrics.salesLast28 > 0) {
    return { key: "growing", label: "Creciendo" };
  }

  if (metrics.salesTrendPercent < -0.15) {
    return { key: "falling", label: "En caída" };
  }

  if (metrics.salesTrendPercent > 0.1) {
    return { key: "growing", label: "Creciendo" };
  }

  return { key: "stable", label: "Estable" };
}

function getPeriodContext(records, summary, maxDate) {
  if (summary.periodMode === "yearDay") {
    const currentYear = summary.currentYear;
    const comparisonYear = summary.comparisonYear;
    const maxDay = summary.maxDay;
    const minDay = summary.minDay ?? 1;
    const cutoffField = summary.cutoffField ?? "dayOfPeriod";
    const maxCutoff = cutoffField === "outputNumber" ? summary.maxOutputNumber : maxDay;
    const minCutoff = cutoffField === "outputNumber" ? (summary.minOutputNumber ?? 1) : minDay;
    const currentRecords = records.filter(
      (record) => record.year === currentYear && isWithinCutoff(record, cutoffField, minCutoff, maxCutoff),
    );
    const previousRecords = comparisonYear
      ? records.filter(
          (record) => record.year === comparisonYear && isWithinCutoff(record, cutoffField, minCutoff, maxCutoff),
        )
      : [];

    return {
      comparisonYear,
      cutoffField,
      currentRecords,
      currentPeriodLabel: summary.currentPeriodLabel,
      currentYear,
      hasComparablePeriods: Boolean(comparisonYear),
      maxCutoff,
      maxDay,
      minCutoff,
      minDay,
      noCurrentPurchase: !currentRecords.some(hasPurchase),
      previousPeriodLabel: summary.previousPeriodLabel,
      previousRecords,
      type: "yearDay",
    };
  }

  const currentStart = addDays(maxDate, -27);
  const previousStart = addDays(maxDate, -55);
  const previousEnd = addDays(maxDate, -28);
  const currentRecords = records.filter((record) => isBetween(record.date, currentStart, maxDate));
  const previousRecords = records.filter((record) => isBetween(record.date, previousStart, previousEnd));

  return {
    currentRecords,
    currentPeriodLabel: "últimos 28 días",
    hasComparablePeriods: true,
    maxDate,
    noCurrentPurchase: !currentRecords.some(hasPurchase),
    previousPeriodLabel: "28 días anteriores",
    previousRecords,
    type: "date",
  };
}

function getLastPurchase(records, period, maxDate) {
  if (period.type === "yearDay") {
    const purchaseRecords = records
      .filter((record) => record.year === period.currentYear)
      .filter(hasPurchase)
      .sort(compareRecordsDesc);

    if (!purchaseRecords.length) {
      const previousPurchase = records.filter(hasPurchase).sort(compareRecordsDesc)[0];

      return previousPurchase
        ? {
            date: previousPurchase.date,
            daysSince: null,
            label: previousPurchase.dateLabel,
          }
        : null;
    }

    const latest = purchaseRecords[0];
    const cutoffValue = period.cutoffField === "outputNumber" ? latest.outputNumber : latest.dayOfPeriod;

    return {
      date: latest.date,
      daysSince: Math.max(0, period.maxCutoff - cutoffValue),
      label: latest.dateLabel,
    };
  }

  const purchaseRecords = records
    .filter(hasPurchase)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!purchaseRecords.length) {
    return null;
  }

  return {
    date: purchaseRecords[0].date,
    daysSince: diffDays(maxDate, purchaseRecords[0].date),
    label: purchaseRecords[0].date,
  };
}

function hasPurchase(record) {
  return (record.salesAmount ?? 0) > 0 || (record.boxes ?? 0) > 0 || (record.volumeUc ?? 0) > 0;
}

function compareRecordsDesc(a, b) {
  if (a.year !== b.year) {
    return b.year - a.year;
  }

  if ((a.outputNumber ?? -1) !== (b.outputNumber ?? -1)) {
    return (b.outputNumber ?? -1) - (a.outputNumber ?? -1);
  }

  if (a.dayOfPeriod !== b.dayOfPeriod) {
    return b.dayOfPeriod - a.dayOfPeriod;
  }

  return b.date.localeCompare(a.date);
}

function isWithinCutoff(record, cutoffField, minCutoff, maxCutoff) {
  const value = record[cutoffField];

  if (!Number.isInteger(value)) {
    return false;
  }

  return value >= minCutoff && value <= maxCutoff;
}

function getCategoryDecline(currentRecords, previousRecords) {
  const currentByCategory = totalsByField(currentRecords, "category");
  const previousByCategory = totalsByField(previousRecords, "category");
  let strongestDecline = null;

  for (const [key, previousItem] of previousByCategory.entries()) {
    const previousValue = previousItem.value;

    if (previousValue <= 0) {
      continue;
    }

    const currentValue = currentByCategory.get(key)?.value ?? 0;
    const trend = (currentValue - previousValue) / previousValue;

    if (trend <= STRONG_CATEGORY_DROP && (!strongestDecline || trend < strongestDecline.trend)) {
      strongestDecline = {
        name: previousItem.name,
        trend,
        currentValue,
        previousValue,
      };
    }
  }

  return strongestDecline;
}

function getAbandonedSku(currentRecords, previousRecords) {
  const currentSkus = new Set(
    currentRecords
      .map((record) => getCommercialSkuIdentity(record.sku).key)
      .filter(Boolean),
  );
  const previousSkus = topByField(previousRecords, "sku");

  return previousSkus.find((sku) => !currentSkus.has(sku.key)) ?? null;
}

function getPremiumOpportunity(records, currentRecords, salesLast28) {
  const hasPremiumCategory = records.some(isPremiumRecord);

  if (!hasPremiumCategory || salesLast28 <= 0) {
    return null;
  }

  const premiumSales = currentRecords
    .filter(isPremiumRecord)
    .reduce((total, record) => total + (record.salesAmount ?? 0), 0);
  const share = premiumSales / salesLast28;

  if (share < LOW_PREMIUM_SHARE) {
    return { share };
  }

  return null;
}

function topByField(records, field) {
  return Array.from(totalsByField(records, field).entries())
    .map(([key, item]) => ({ key, name: item.name, value: item.value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

function totalsByField(records, field) {
  const totals = new Map();

  for (const record of records) {
    const { key, label } = getInsightGroupingIdentity(record, field);

    if (!key) {
      continue;
    }

    const value = (record.salesAmount ?? 0) || (record.boxes ?? 0);
    const existing = totals.get(key);
    totals.set(key, {
      name: existing?.name ?? label,
      value: (existing?.value ?? 0) + value,
    });
  }

  return totals;
}

function getInsightGroupingIdentity(record, field) {
  if (field === "sku") {
    return getCommercialSkuIdentity(record.sku);
  }

  const value = record[field];

  return {
    key: String(value ?? ""),
    label: String(value ?? ""),
  };
}

function sumField(records, field) {
  return records.reduce((total, record) => total + (record[field] ?? 0), 0);
}

function averageField(records, field) {
  const values = records.map((record) => record[field]).filter(isFiniteNumber);

  if (!values.length) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function mostCommonValue(records, field) {
  const counts = new Map();

  for (const record of records) {
    const value = record[field];

    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function buildSearchText(records, primaryRecord) {
  const values = [
    primaryRecord.customerName,
    primaryRecord.customerId,
    mostCommonValue(records, "channel"),
    mostCommonValue(records, "zone"),
    mostCommonValue(records, "city"),
    mostCommonValue(records, "office"),
    mostCommonValue(records, "priority"),
    mostCommonValue(records, "seller"),
    mostCommonValue(records, "route"),
  ];

  return normalizeColumnName(values.filter(Boolean).join(" "));
}

function isPremiumRecord(record) {
  const mixText = normalizeColumnName([record.category, record.segment, record.brand, record.sku].filter(Boolean).join(" "));
  return mixText.includes("premium") || mixText.includes("reserve");
}

function isBetween(isoDate, startDate, endDate) {
  return isoDate >= startDate && isoDate <= endDate;
}

function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDays(laterIsoDate, earlierIsoDate) {
  const later = parseIsoDate(laterIsoDate);
  const earlier = parseIsoDate(earlierIsoDate);

  if (!later || !earlier) {
    return null;
  }

  return Math.max(0, Math.round((later - earlier) / DAY_IN_MS));
}
