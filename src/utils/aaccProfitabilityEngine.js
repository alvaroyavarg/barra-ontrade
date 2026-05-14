import {
  AACC_AGREEMENTS,
  AACC_LIGHTHOUSE_DEPLETIONS,
  AACC_PRODUCT_VALUE_CHAIN,
  AACC_RULES,
} from "../data/aaccMockData.js";

const DEFAULT_FIXED_TRADE_SPEND_RATE = -0.03;
const DEFAULT_PROMO_DISCOUNT_RATE = -0.05;
const DEFAULT_RAPPEL_RATE = 0;

const PRODUCT_BY_NAME = new Map(AACC_PRODUCT_VALUE_CHAIN.map((product) => [product.productName, product]));
const RULE_BY_SUBSEGMENT = new Map(AACC_RULES.map((rule) => [rule.subSegmentation, rule]));

function normalizeProductKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PRODUCT_BY_NORMALIZED = new Map(
  AACC_PRODUCT_VALUE_CHAIN.map((product) => [normalizeProductKey(product.productName), product])
);

function findValueChainProduct(productName) {
  const exact = PRODUCT_BY_NAME.get(productName);
  if (exact) return exact;
  const normalized = normalizeProductKey(productName);
  const normMatch = PRODUCT_BY_NORMALIZED.get(normalized);
  if (normMatch) return normMatch;
  for (const [key, product] of PRODUCT_BY_NORMALIZED) {
    if (normalized.includes(key) || key.includes(normalized)) return product;
  }
  return null;
}

export function buildAaccProfitabilityModel() {
  const accounts = AACC_AGREEMENTS.map((agreement) => buildAccountProfitability(agreement));

  return buildAaccModel(accounts);
}

// Palabras geográficas y genéricas que no ayudan a identificar una cuenta
const NAME_STOPWORDS = new Set([
  "BAR","PUB","CLUB","HOTEL","SPA","LTDA","SA","SAC","SAS","LIMITADA","SOCIEDAD","COMERCIAL",
  "RESTAURANT","RESTAURANTE","GASTRONOMIA","GASTRONOMICA","INVERSIONES","SERVICIOS","TURISMO",
  "CHILE","LAS","LOS","DEL","EL","LA","DE","Y","EN","CON",
  "ALTO","BAJO","NORTE","SUR","ESTE","OESTE","CENTRO",
  "MALL","PLAZA","PARQUE","COSTANERA","CONDES","PROVIDENCIA","VITACURA","MAIPU","EGANA",
  "TOBALABA","FLORIDA","GOLF","REINA","MONTT","MERCED","IRARRAZABAL","DOMINICOS",
  "SPORT","ITALIA","FACTORIA","ORREGO","BELLAVISTA","LUCO","BORDERIO",
]);

function normalizeCustomerName(name) {
  return String(name || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(name) {
  return normalizeCustomerName(name)
    .split(" ")
    .filter((w) => w.length > 3 && !NAME_STOPWORDS.has(w));
}

function findRowsByKeyword(byName, accountName) {
  const norm = normalizeCustomerName(accountName);
  const exact = byName.get(norm);
  if (exact) return exact;

  const keywords = extractKeywords(accountName);
  if (!keywords.length) return [];

  for (const [candidate, rows] of byName) {
    if (keywords.every((kw) => candidate.includes(kw))) return rows;
  }
  return [];
}

export function buildAaccProfitabilityModelFromSales(salesRows, maestroLocals = []) {
  // Índice de ventas por código de cliente
  const byCustomer = new Map();
  salesRows.forEach((row) => {
    if (!byCustomer.has(row.customerCode)) byCustomer.set(row.customerCode, []);
    byCustomer.get(row.customerCode).push(row);
  });

  // Índice de ventas por nombre normalizado (fallback cuando no hay match de código)
  const byName = new Map();
  byCustomer.forEach((rows) => {
    const normName = normalizeCustomerName(rows[0]?.customerName);
    if (normName && !byName.has(normName)) byName.set(normName, rows);
  });

  const agreementByCode = new Map(AACC_AGREEMENTS.map((a) => [a.diageoCustomerId, a]));
  const aaccMaestro = maestroLocals.filter((l) => l.hasAacc);

  const processedCodes = new Set();
  const accounts = [];

  // Base: cuentas AACC del Maestro — se enriquecen con ventas por código, nombre exacto o palabras clave
  aaccMaestro.forEach((local, idx) => {
    const code = local.accountCode;
    processedCodes.add(code);
    const base = agreementByCode.get(code);
    const rowsByCode = byCustomer.get(code) ?? [];
    const rows = rowsByCode.length > 0 ? rowsByCode : findRowsByKeyword(byName, local.name);
    const agreement = base ?? {
      agreementId: local.id || `MAESTRO-${code || idx}`,
      annualFeeUsd: 0,
      bottler: local.distributor || "",
      chainName: local.name,
      city: local.district || "",
      customerName: local.name,
      diageoCustomerId: code,
      durationMonths: 12,
      isChain: false,
      outletType: local.channel || "",
      segmentation: local.segment || "",
      subSegmentation: local.subchannel || "",
      totalInvestmentUsd: 0,
    };
    const account = buildAccountProfitabilityFromSales(agreement, rows);
    account.hasSalesData = rows.length > 0;
    accounts.push(account);
  });

  // También incluir AACC_AGREEMENTS que no estén en el Maestro (con fallback por nombre)
  AACC_AGREEMENTS.forEach((agreement) => {
    if (processedCodes.has(agreement.diageoCustomerId)) return;
    const rowsByCode = byCustomer.get(agreement.diageoCustomerId) ?? [];
    const rows = rowsByCode.length > 0 ? rowsByCode : findRowsByKeyword(byName, agreement.customerName);
    const account = buildAccountProfitabilityFromSales(agreement, rows);
    account.hasSalesData = rows.length > 0;
    accounts.push(account);
  });

  return buildAaccModel(accounts);
}

export function buildAaccModelFromLocals(aaccLocals) {
  const accounts = aaccLocals.map((local, idx) => {
    const agreement = {
      agreementId: local.id || `MAESTRO-${local.accountCode || idx}`,
      annualFeeUsd: 0,
      bottler: local.distributor || "",
      chainName: local.name,
      city: local.district || "",
      customerName: local.name,
      diageoCustomerId: local.accountCode || "",
      durationMonths: 12,
      isChain: false,
      outletType: local.channel || "",
      segmentation: local.segment || "",
      subSegmentation: local.subchannel || "",
      totalInvestmentUsd: 0,
    };
    return buildMetricsFromProductMix(agreement, []);
  });
  return buildAaccModel(accounts);
}

function buildAccountProfitabilityFromSales(agreement, salesRows) {
  const productTotals = new Map();

  salesRows.forEach((row) => {
    const key = row.productName;
    const existing = productTotals.get(key) ?? {
      brand: row.brand,
      category: row.category,
      grossSalesUsd: 0,
      productName: key,
      volumeEu: 0,
    };
    existing.volumeEu += row.volumeEu;
    existing.grossSalesUsd += row.grossSalesUsd;
    productTotals.set(key, existing);
  });

  const productMix = [...productTotals.values()]
    .map((item) => {
      const vc = findValueChainProduct(item.productName);
      const cogs = item.volumeEu * (vc?.cogsPerEu ?? 0) * -1;
      return {
        brand: vc?.brand ?? item.brand ?? "Sin marca",
        category: vc?.category ?? item.category ?? "Sin categoría",
        cogs,
        grossSales: item.grossSalesUsd,
        productName: item.productName,
        volumeEu: item.volumeEu,
      };
    })
    .filter((item) => item.volumeEu > 0);

  return buildMetricsFromProductMix(agreement, productMix);
}

export function buildAaccModel(accounts) {
  const summary = buildPortfolioSummary(accounts);

  return {
    accounts,
    rankings: buildRankings(accounts),
    summary,
  };
}

function buildAccountProfitability(agreement) {
  const depletionRows = AACC_LIGHTHOUSE_DEPLETIONS.filter((row) => row.customerId === agreement.diageoCustomerId);
  const productMix = depletionRows
    .map((row) => {
      const product = PRODUCT_BY_NAME.get(row.productName);
      const grossSales = row.volumeEu * (product?.grossSalesPerEu ?? 0);
      const cogs = row.volumeEu * (product?.cogsPerEu ?? 0) * -1;
      return {
        brand: product?.brand ?? "Sin marca",
        category: product?.category ?? "Sin categoría",
        cogs,
        grossSales,
        productName: row.productName,
        volumeEu: row.volumeEu,
      };
    })
    .filter((item) => item.volumeEu > 0);

  return buildMetricsFromProductMix(agreement, productMix);
}

function buildMetricsFromProductMix(agreement, productMix) {
  const volumeEu = sum(productMix, "volumeEu");
  const grossSales = sum(productMix, "grossSales");
  const cogs = sum(productMix, "cogs");
  const fixedTradeSpend = grossSales * DEFAULT_FIXED_TRADE_SPEND_RATE;
  const promoDiscount = grossSales * DEFAULT_PROMO_DISCOUNT_RATE;
  const rappel = grossSales * DEFAULT_RAPPEL_RATE;
  const visibilityFee = agreement.annualFeeUsd * -1;
  const variableTradeSpend = rappel + promoDiscount + visibilityFee;
  const totalTradeSpend = variableTradeSpend + fixedTradeSpend;
  const netSalesValue = grossSales + totalTradeSpend;
  const grossProfit = netSalesValue + cogs;
  const ap = 0;
  const caap = grossProfit + ap;
  const grossMarginPct = netSalesValue ? grossProfit / netSalesValue : null;
  const caapMarginPct = grossProfit ? caap / grossProfit : null;
  const roi = totalTradeSpend ? -caap / totalTradeSpend : null;
  const rule = RULE_BY_SUBSEGMENT.get(agreement.subSegmentation) ?? { grossMarginTarget: 0.4, roiTarget: 0 };
  const gmOk = grossMarginPct !== null && grossMarginPct >= rule.grossMarginTarget;
  const roiOk = roi !== null && roi >= rule.roiTarget;
  const status = getAaccStatus({ caap, gmOk, grossMarginPct, roi, roiOk, volumeEu });

  return {
    ...agreement,
    checks: {
      gmOk,
      grossMarginTarget: rule.grossMarginTarget,
      roiOk,
      roiTarget: rule.roiTarget,
    },
    insights: buildAccountInsights({
      agreement,
      caap,
      gmOk,
      grossMarginPct,
      netSalesValue,
      productMix,
      roi,
      roiOk,
      status,
      totalTradeSpend,
      volumeEu,
    }),
    metrics: {
      ap,
      caap,
      caapMarginPct,
      cogs,
      fixedTradeSpend,
      grossMarginPct,
      grossProfit,
      grossSales,
      netSalesValue,
      promoDiscount,
      rappel,
      roi,
      totalTradeSpend,
      variableTradeSpend,
      visibilityFee,
      volumeEu,
    },
    productMix: productMix.sort((a, b) => b.grossSales - a.grossSales),
    status,
  };
}

function buildPortfolioSummary(accounts) {
  const totalInvestmentUsd = sum(accounts, "totalInvestmentUsd");
  const volumeEu = sumMetric(accounts, "volumeEu");
  const grossSales = sumMetric(accounts, "grossSales");
  const totalTradeSpend = sumMetric(accounts, "totalTradeSpend");
  const netSalesValue = sumMetric(accounts, "netSalesValue");
  const cogs = sumMetric(accounts, "cogs");
  const grossProfit = sumMetric(accounts, "grossProfit");
  const caap = sumMetric(accounts, "caap");
  const grossMarginPct = netSalesValue ? grossProfit / netSalesValue : null;
  const roi = totalTradeSpend ? -caap / totalTradeSpend : null;
  const healthyAccounts = accounts.filter((account) => account.status.key === "maintain" || account.status.key === "boost");
  const riskAccounts = accounts.filter((account) => account.status.key === "renegotiate" || account.status.key === "freeze" || account.status.key === "exit");

  return {
    accountCount: accounts.length,
    caap,
    cogs,
    grossMarginPct,
    grossProfit,
    grossSales,
    healthyCount: healthyAccounts.length,
    netSalesValue,
    riskCount: riskAccounts.length,
    roi,
    totalInvestmentUsd,
    totalTradeSpend,
    volumeEu,
  };
}

function buildRankings(accounts) {
  return {
    bestRoi: [...accounts]
      .filter((account) => Number.isFinite(account.metrics.roi))
      .sort((a, b) => b.metrics.roi - a.metrics.roi)
      .slice(0, 5),
    biggestInvestment: [...accounts].sort((a, b) => b.totalInvestmentUsd - a.totalInvestmentUsd).slice(0, 5),
    caapPressure: [...accounts].sort((a, b) => a.metrics.caap - b.metrics.caap).slice(0, 5),
    renegotiation: [...accounts]
      .filter((account) => account.status.key !== "maintain" && account.status.key !== "boost")
      .sort((a, b) => a.metrics.roi - b.metrics.roi)
      .slice(0, 5),
  };
}

function buildAccountInsights({ agreement, caap, gmOk, grossMarginPct, netSalesValue, productMix, roi, roiOk, status, totalTradeSpend, volumeEu }) {
  const insights = [];
  const tradeSpendWeight = netSalesValue ? Math.abs(totalTradeSpend) / netSalesValue : null;
  const topProduct = productMix[0];

  insights.push(`${status.label}: ${status.reason}`);

  if (!roiOk) {
    insights.push("ROI bajo el mínimo: revisar condición comercial, volumen real o duración antes de renovar.");
  }

  if (!gmOk) {
    insights.push("Margen bajo el mínimo: priorizar mix de mayor margen o reducir presión de trade spend.");
  }

  if (tradeSpendWeight !== null && tradeSpendWeight > 0.45) {
    insights.push("Trade spend pesa demasiado sobre la venta neta. Hay riesgo de estar comprando volumen sin retorno suficiente.");
  }

  if (topProduct) {
    insights.push(`${topProduct.brand} explica la mayor parte de la venta del acuerdo con ${Math.round(topProduct.volumeEu)} EUs.`);
  }

  if (caap > 0 && roi > 1 && volumeEu > 100) {
    insights.push("Acuerdo saludable: usar como caso base para defender continuidad o negociar crecimiento incremental.");
  }

  if (agreement.durationMonths >= 24 && volumeEu < 100) {
    insights.push("Contrato largo con bajo volumen real. Conviene revisar si el compromiso comercial sigue vigente.");
  }

  return insights.slice(0, 5);
}

function getAaccStatus({ caap, gmOk, grossMarginPct, roi, roiOk, volumeEu }) {
  if (gmOk && roiOk && roi >= 2 && volumeEu >= 150) {
    return {
      key: "boost",
      label: "Potenciar",
      reason: "ROI y margen sanos con volumen relevante.",
    };
  }

  if (gmOk && roiOk) {
    return {
      key: "maintain",
      label: "Mantener",
      reason: "Cumple ROI y margen mínimo.",
    };
  }

  if (gmOk && !roiOk) {
    return {
      key: "renegotiate",
      label: "Renegociar",
      reason: "El margen aguanta, pero el retorno no paga la inversión.",
    };
  }

  if (!gmOk && roiOk && caap > 0) {
    return {
      key: "renegotiate",
      label: "Renegociar",
      reason: "El ROI se sostiene, pero el margen queda bajo el mínimo.",
    };
  }

  if (grossMarginPct !== null && grossMarginPct < 0 && volumeEu < 100) {
    return {
      key: "exit",
      label: "No renovar",
      reason: "Margen negativo y bajo volumen real.",
    };
  }

  return {
    key: "freeze",
    label: "Congelar inversión",
    reason: "No cumple los checks mínimos con la venta real disponible.",
  };
}

function sum(items, field) {
  return items.reduce((total, item) => total + (item[field] ?? 0), 0);
}

function sumMetric(items, field) {
  return items.reduce((total, item) => total + (item.metrics[field] ?? 0), 0);
}
