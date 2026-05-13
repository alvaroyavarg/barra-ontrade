import { useMemo, useState } from "react";
import { buildAaccModel, buildAaccModelFromLocals, buildAaccProfitabilityModel, buildAaccProfitabilityModelFromSales } from "../utils/aaccProfitabilityEngine.js";
import { parseAaccSalesBase } from "../utils/aaccSalesBaseParser.js";
import { normalizeColumnName } from "../utils/columnMapping.js";
import { formatNumber, formatSharePercent, formatUsd } from "../utils/formatters.js";

const STATUS_CLASS = {
  boost: "good",
  maintain: "good",
  renegotiate: "warning",
  freeze: "warning",
  exit: "danger",
};

const AACC_PERIODS = [
  { key: "2025-07", label: "Jul 25" },
  { key: "2025-08", label: "Ago 25" },
  { key: "2025-09", label: "Sep 25" },
  { key: "2025-10", label: "Oct 25" },
  { key: "2025-11", label: "Nov 25" },
  { key: "2025-12", label: "Dic 25" },
  { key: "2026-01", label: "Ene 26" },
  { key: "2026-02", label: "Feb 26" },
  { key: "2026-03", label: "Mar 26" },
  { key: "2026-04", label: "Abr 26" },
];

const DECISION_OPTIONS = [
  {
    description: "Acuerdos sanos donde conviene defender continuidad y buscar volumen incremental.",
    key: "boost",
    label: "Potenciar",
    tone: "good",
  },
  {
    description: "Acuerdos que cumplen los checks y no requieren cambio inmediato de condicion.",
    key: "maintain",
    label: "Mantener",
    tone: "good",
  },
  {
    description: "Acuerdos que necesitan ajuste de inversion, mix o volumen antes de renovar.",
    key: "renegotiate",
    label: "Renegociar",
    tone: "warning",
  },
  {
    description: "Acuerdos donde no conviene aumentar inversion hasta recuperar rentabilidad.",
    key: "freeze",
    label: "Congelar inversion",
    tone: "warning",
  },
  {
    description: "Acuerdos con baja justificacion financiera para renovar en las condiciones actuales.",
    key: "exit",
    label: "No renovar",
    tone: "danger",
  },
];

const ACCOUNT_MIX_DIMENSIONS = [
  { key: "brand", label: "Marca" },
  { key: "category", label: "Categoria" },
  { key: "productName", label: "SKU" },
];

const ACCOUNT_MIX_VIEWS = [
  { key: "rows", label: "Filas" },
  { key: "chart", label: "Grafico" },
];

const BOTTLER_OPTIONS = [
  { key: "all", label: "Ambos" },
  { key: "KOA", label: "KOA" },
  { key: "KOE", label: "KOE" },
];

function AaccProfitabilityPage({ locals = [], onBackHome }) {
  const defaultModel = useMemo(() => {
    const aaccLocals = locals.filter((l) => l.hasAacc);
    return aaccLocals.length > 0 ? buildAaccModelFromLocals(aaccLocals) : buildAaccProfitabilityModel();
  }, [locals]);
  const [trackerModel, setTrackerModel] = useState(null);
  const [trackerMeta, setTrackerMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeDecisionKey, setActiveDecisionKey] = useState(null);
  const [metricMode, setMetricMode] = useState("volume");
  const [lensMode, setLensMode] = useState("commercial");
  const [bottlerFilter, setBottlerFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: AACC_PERIODS[0].key,
    to: AACC_PERIODS[AACC_PERIODS.length - 1].key,
  });
  const [selectedId, setSelectedId] = useState(defaultModel.accounts[0]?.agreementId ?? "");
  const sourceModel = trackerModel ?? defaultModel;
  const bottlerFilteredAccounts = useMemo(
    () => filterAccountsByBottler(sourceModel.accounts, bottlerFilter),
    [bottlerFilter, sourceModel.accounts],
  );
  const model = useMemo(
    () => buildAaccModel(applyPeriodFilterToAccounts(bottlerFilteredAccounts, dateRange)),
    [bottlerFilteredAccounts, dateRange],
  );
  const selectedPeriods = useMemo(() => getSelectedPeriods(dateRange), [dateRange]);
  const mixByCategory = useMemo(() => buildMix(model.accounts, "category", metricMode), [metricMode, model.accounts]);
  const mixByBrand = useMemo(() => buildMix(model.accounts, "brand", metricMode), [metricMode, model.accounts]);
  const monthlySeries = useMemo(
    () => buildMonthlySeries(bottlerFilteredAccounts, dateRange, metricMode, lensMode),
    [bottlerFilteredAccounts, dateRange, lensMode, metricMode],
  );
  const statusCounts = useMemo(() => buildStatusCounts(model.accounts), [model.accounts]);
  const searchedAccounts = useMemo(() => {
    const normalizedQuery = normalizeColumnName(query);

    if (!normalizedQuery) {
      return model.accounts;
    }

    return model.accounts.filter((account) =>
      normalizeColumnName(
        [
          account.customerName,
          account.chainName,
          account.diageoCustomerId,
          account.bottler,
          account.city,
          account.segmentation,
          account.subSegmentation,
          account.status.label,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery),
    );
  }, [model.accounts, query]);
  const filteredAccounts = useMemo(() => {
    if (!activeDecisionKey) {
      return searchedAccounts;
    }

    return searchedAccounts.filter((account) => account.status.key === activeDecisionKey);
  }, [activeDecisionKey, searchedAccounts]);
  const activeDecision = DECISION_OPTIONS.find((option) => option.key === activeDecisionKey) ?? null;
  const activeDecisionAccounts = useMemo(
    () => (activeDecisionKey ? model.accounts.filter((account) => account.status.key === activeDecisionKey) : []),
    [activeDecisionKey, model.accounts],
  );
  const selectedAccount =
    filteredAccounts.find((account) => account.agreementId === selectedId) ?? filteredAccounts[0] ?? null;
  const selectedSourceAccount = selectedAccount
    ? bottlerFilteredAccounts.find((account) => account.agreementId === selectedAccount.agreementId) ?? selectedAccount
    : null;

  async function handleSalesUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const parsed = await parseAaccSalesBase(file);
      const model = buildAaccProfitabilityModelFromSales(parsed.rows, locals);
      setTrackerModel({ accounts: model.accounts, rankings: model.rankings, summary: model.summary });
      setTrackerMeta({ fileName: parsed.fileName, rowCount: parsed.count, sheetName: parsed.sheetName });
      setActiveDecisionKey(null);
      setBottlerFilter("all");
      setSelectedId(model.accounts[0]?.agreementId ?? "");
      setQuery("");
    } catch (uploadError) {
      setError(uploadError.message || "No pude procesar la sábana de ventas.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="module-page aacc-page" aria-label="Rentabilidad AACC">
      <div className="module-topbar">
        <button className="back-button" type="button" onClick={onBackHome}>
          Volver al inicio
        </button>
        <span>Rentabilidad AACC</span>
      </div>

      <div className="module-hero aacc-module-hero">
        <div>
          <span className="eyebrow">Pilar 2</span>
          <h1>Rentabilidad AACC</h1>
          <p>Decisión por acuerdo comercial: mantener, potenciar, renegociar o no renovar.</p>
        </div>
        <label className="aacc-upload-button">
          <input accept=".xlsx,.xls" type="file" onChange={handleSalesUpload} />
          {isLoading ? "Leyendo ventas..." : "Cargar sábana de ventas"}
        </label>
      </div>

      {error ? (
        <div className="alert-card alert-card--error" role="alert">
          <strong>No se pudo cargar el tracker</strong>
          <p>{error}</p>
        </div>
      ) : null}

      <section className="aacc-source-strip">
        <div>
          <span>Fuente activa</span>
          <strong>{trackerMeta ? trackerMeta.fileName : "Maestro DBA"}</strong>
        </div>
        <div>
          <span>Cuentas AACC</span>
          <strong>{formatNumber(model.accounts.length)}</strong>
        </div>
        <div>
          <span>Con datos de venta</span>
          <strong>{formatNumber(model.accounts.filter((a) => a.hasSalesData).length)}</strong>
        </div>
        <div>
          <span>Fuente futura</span>
          <strong>ProjectLighthouse</strong>
        </div>
      </section>

      {trackerMeta && model.accounts.filter((a) => a.hasSalesData).length < model.accounts.length * 0.5 ? (
        <div className="alert-card alert-card--warning" role="alert">
          <strong>Cruce parcial de datos</strong>
          <p>
            {model.accounts.filter((a) => a.hasSalesData).length} de {model.accounts.length} cuentas AACC tienen datos de venta en este archivo.
            El archivo usa razón social y código de embotelladora; el Maestro usa código Diageo PDV.
            Para cruce completo se necesita un archivo con los mismos códigos PDV del Maestro.
          </p>
        </div>
      ) : null}

      <AaccSectionMarker
        copy={`Vista consolidada de ${formatNumber(model.accounts.length)} acuerdos filtrados. Sirve para leer cartera, oportunidades y riesgos antes de entrar al detalle.`}
        label="Resumen cartera"
        title="Lectura general AACC"
      />

      <AaccControls
        bottlerFilter={bottlerFilter}
        dateRange={dateRange}
        lensMode={lensMode}
        metricMode={metricMode}
        onBottlerFilterChange={setBottlerFilter}
        onDateRangeChange={setDateRange}
        onLensModeChange={setLensMode}
        onMetricModeChange={setMetricMode}
      />

      <AaccSummary accounts={model.accounts} lensMode={lensMode} metricMode={metricMode} summary={model.summary} />

      <AaccMixPanel
        categoryMix={mixByCategory}
        brandMix={mixByBrand}
        metricMode={metricMode}
        selectedPeriods={selectedPeriods}
      />

      <AaccPerformanceChart lensMode={lensMode} metricMode={metricMode} series={monthlySeries} />

      <section className="aacc-decision-board">
        {DECISION_OPTIONS.map((option) => (
          <DecisionCard
            key={option.key}
            active={activeDecisionKey === option.key}
            label={option.label}
            tone={option.tone}
            value={statusCounts[option.key] ?? 0}
            onSelect={() => {
              const accountsForDecision = model.accounts.filter((account) => account.status.key === option.key);
              setActiveDecisionKey(option.key);
              setSelectedId(accountsForDecision[0]?.agreementId ?? "");
            }}
          />
        ))}
      </section>

      <DecisionDetail
        accounts={activeDecisionAccounts}
        decision={activeDecision}
        selectedAccountId={selectedAccount?.agreementId ?? ""}
        onClear={() => {
          setActiveDecisionKey(null);
          setSelectedId(model.accounts[0]?.agreementId ?? "");
        }}
        onSelectAccount={setSelectedId}
      />

      <AaccSectionMarker
        copy="Desde aqui cambia la lectura: selecciona una cuenta y revisa su evolucion, mix y rentabilidad especifica."
        label="Detalle por cuenta"
        title={selectedAccount?.customerName ?? "Cuenta seleccionada"}
        tone="account"
      />

      <div className="aacc-workbench">
        <aside className="aacc-sidebar">
          <section className="card search-card">
            <label htmlFor="aacc-search">Buscar acuerdo</label>
            <input
              id="aacc-search"
              placeholder="Cliente, cadena, ID, ciudad, estado o segmento"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <p>
              {activeDecision
                ? `${filteredAccounts.length} de ${activeDecisionAccounts.length} acuerdos en ${activeDecision.label}`
                : `${filteredAccounts.length} de ${model.accounts.length} acuerdos`}
            </p>
          </section>

          <section className="aacc-account-list" aria-label="Lista de acuerdos AACC">
            {filteredAccounts.map((account) => (
              <button
                key={account.agreementId}
                className={account.agreementId === selectedAccount?.agreementId ? "aacc-account-row aacc-account-row--selected" : "aacc-account-row"}
                type="button"
                onClick={() => setSelectedId(account.agreementId)}
              >
                <span>
                  <strong>{account.customerName}</strong>
                  <small>{[account.bottler, account.city, account.subSegmentation].filter(Boolean).join(" · ")}</small>
                </span>
                <span>
                  <StatusPill status={account.status} />
                  {account.hasSalesData !== undefined
                    ? <b style={{ fontSize: "0.7rem", color: account.hasSalesData ? "#16a34a" : "#9ca3af" }}>{account.hasSalesData ? "Con datos" : "Sin datos"}</b>
                    : <b>{formatSharePercent(account.metrics.roi)}</b>}
                </span>
              </button>
            ))}
          </section>
        </aside>

        <div className="aacc-main-panel">
          <AaccAccountBrief
            account={selectedAccount}
            dateRange={dateRange}
            lensMode={lensMode}
            metricMode={metricMode}
            trendAccount={selectedSourceAccount}
          />
          <AaccRankings rankings={model.rankings} />
        </div>
      </div>
    </section>
  );
}

function AaccSectionMarker({ copy, label, title, tone = "portfolio" }) {
  return (
    <section className={`aacc-section-marker aacc-section-marker--${tone}`} aria-label={label}>
      <span>{label}</span>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </section>
  );
}

function AaccControls({
  bottlerFilter,
  dateRange,
  lensMode,
  metricMode,
  onBottlerFilterChange,
  onDateRangeChange,
  onLensModeChange,
  onMetricModeChange,
}) {
  return (
    <section className="card aacc-controls-card" aria-label="Controles de lectura AACC">
      <div className="basis-control-group">
        <span>Lectura</span>
        <div className="segmented-control segmented-control--two" role="radiogroup" aria-label="Lectura por volumen o valor">
          <button
            aria-checked={metricMode === "volume"}
            className={metricMode === "volume" ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
            role="radio"
            type="button"
            onClick={() => onMetricModeChange("volume")}
          >
            Volumen
          </button>
          <button
            aria-checked={metricMode === "value"}
            className={metricMode === "value" ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
            role="radio"
            type="button"
            onClick={() => onMetricModeChange("value")}
          >
            Valor
          </button>
        </div>
      </div>

      <div className="basis-control-group">
        <span>Vista</span>
        <div className="segmented-control segmented-control--two" role="radiogroup" aria-label="Vista comercial o financiera">
          <button
            aria-checked={lensMode === "commercial"}
            className={lensMode === "commercial" ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
            role="radio"
            type="button"
            onClick={() => onLensModeChange("commercial")}
          >
            Comercial
          </button>
          <button
            aria-checked={lensMode === "financial"}
            className={lensMode === "financial" ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
            role="radio"
            type="button"
            onClick={() => onLensModeChange("financial")}
          >
            Financiera
          </button>
        </div>
      </div>

      <div className="basis-control-group">
        <span>Embotellador</span>
        <div className="segmented-control segmented-control--three" role="radiogroup" aria-label="Filtro por embotellador">
          {BOTTLER_OPTIONS.map((option) => (
            <button
              key={option.key}
              aria-checked={bottlerFilter === option.key}
              className={bottlerFilter === option.key ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
              role="radio"
              type="button"
              onClick={() => onBottlerFilterChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="aacc-date-control">
        <span>Desde</span>
        <input
          max={dateRange.to}
          min={AACC_PERIODS[0].key}
          type="month"
          value={dateRange.from}
          onChange={(event) => onDateRangeChange((current) => ({ ...current, from: event.target.value }))}
        />
      </label>

      <label className="aacc-date-control">
        <span>Hasta</span>
        <input
          max={AACC_PERIODS[AACC_PERIODS.length - 1].key}
          min={dateRange.from}
          type="month"
          value={dateRange.to}
          onChange={(event) => onDateRangeChange((current) => ({ ...current, to: event.target.value }))}
        />
      </label>
    </section>
  );
}

function AaccSummary({ accounts, lensMode, metricMode, summary }) {
  const commercialSummary = buildCommercialSummary(accounts, metricMode);
  const metrics =
    lensMode === "commercial"
      ? [
          ["Cuentas activas", formatNumber(summary.accountCount), "primary"],
          [metricMode === "volume" ? "Volumen real" : "Valor venta", formatMetricValue(commercialSummary.primaryValue, metricMode), "primary"],
          ["Promedio por cuenta", formatMetricValue(commercialSummary.averagePerAccount, metricMode), ""],
          ["Top categoría", commercialSummary.topCategory?.name ?? "Sin dato", ""],
          ["Mix top categoría", formatSharePercent(commercialSummary.topCategory?.share), ""],
          ["Top marca", commercialSummary.topBrand?.name ?? "Sin dato", ""],
          ["Mix top marca", formatSharePercent(commercialSummary.topBrand?.share), ""],
          ["Cuentas en riesgo", formatNumber(summary.riskCount), summary.riskCount ? "danger" : "good"],
        ]
      : [
          ["Inversión anual", formatUsd(summary.totalInvestmentUsd), "primary"],
          ["Gross Sales", formatUsd(summary.grossSales), ""],
          ["NSV", formatUsd(summary.netSalesValue), ""],
          ["Total Trade Spend", formatUsd(summary.totalTradeSpend), "danger"],
          ["CAAP", formatUsd(summary.caap), summary.caap >= 0 ? "good" : "danger"],
          ["ROI cartera", formatSharePercent(summary.roi), summary.roi >= 0 ? "good" : "danger"],
          ["GM cartera", formatSharePercent(summary.grossMarginPct), summary.grossMarginPct >= 0.4 ? "good" : "danger"],
          ["Acuerdos OK", `${summary.healthyCount}/${summary.accountCount}`, "good"],
        ];

  return (
    <section className="card general-card">
      <div className="section-heading">
        <span className="eyebrow">Resumen ejecutivo</span>
        <h2>{lensMode === "commercial" ? "Lectura comercial de acuerdos" : "Salud financiera de acuerdos comerciales"}</h2>
      </div>
      <div className="metrics-grid">
        {metrics.map(([label, value, tone]) => (
          <div key={label} className={`metric-card ${tone ? `metric-card--${tone}` : ""}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function AaccMixPanel({ brandMix, categoryMix, metricMode, selectedPeriods }) {
  return (
    <section className="card aacc-mix-card">
      <div className="section-heading">
        <span className="eyebrow">Mix comercial</span>
        <h2>Participación por categoría y marca</h2>
        <p className="muted-copy">
          {selectedPeriods.length} meses seleccionados · lectura por {metricMode === "volume" ? "volumen" : "valor"}
        </p>
      </div>
      <div className="aacc-mix-grid">
        <MixList title="Mix de categoría" items={categoryMix} metricMode={metricMode} />
        <MixList title="Mix de marca" items={brandMix} metricMode={metricMode} />
      </div>
    </section>
  );
}

function MixList({ items, metricMode, title }) {
  return (
    <div className="aacc-mix-list">
      <span className="eyebrow">{title}</span>
      {items.length ? (
        items.slice(0, 7).map((item) => (
          <div key={item.name} className="aacc-mix-row">
            <div className="aacc-mix-row__label">
              <strong>{item.name}</strong>
              <span>
                {formatSharePercent(item.share)} · {formatMetricValue(item.value, metricMode)}
              </span>
            </div>
            <div className="aacc-mix-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(4, Math.round(item.share * 100))}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="muted-copy">Sin mix disponible.</p>
      )}
    </div>
  );
}

function AaccPerformanceChart({ lensMode, metricMode, series }) {
  const maxValue = Math.max(...series.map((item) => Math.abs(item.value)), 1);
  const label =
    lensMode === "financial"
      ? "CAAP mensual"
      : metricMode === "volume"
        ? "Volumen mensual"
        : "Valor mensual";

  return (
    <section className="card aacc-performance-card">
      <div className="aacc-detail-header">
        <div>
          <span className="eyebrow">Evolución mensual</span>
          <h2>{label}</h2>
          <p>Serie referencial para validar el esqueleto. Se reemplaza por períodos reales al conectar Lighthouse.</p>
        </div>
      </div>
      <div className="aacc-chart" role="img" aria-label={`Gráfico de ${label}`}>
        {series.map((item) => (
          <div key={item.key} className="aacc-chart-bar">
            <div className="aacc-chart-bar__track">
              <span
                className={item.value < 0 ? "aacc-chart-bar__fill aacc-chart-bar__fill--negative" : "aacc-chart-bar__fill"}
                style={{ height: `${Math.max(6, Math.round((Math.abs(item.value) / maxValue) * 100))}%` }}
              />
            </div>
            <strong>{item.label}</strong>
            <small>{formatMetricValue(item.value, lensMode === "financial" ? "value" : metricMode)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function AaccAccountTrendLine({ account, dateRange, lensMode, metricMode }) {
  const series = buildAccountLineSeries(account, dateRange, metricMode, lensMode);
  const label =
    lensMode === "financial"
      ? "CAAP mensual"
      : metricMode === "volume"
        ? "Volumen mensual"
        : "Valor mensual";
  const points = buildLinePoints(series);
  const firstValue = series[0]?.value ?? 0;
  const lastValue = series[series.length - 1]?.value ?? 0;
  const trend = firstValue ? (lastValue - firstValue) / Math.abs(firstValue) : null;

  return (
    <section className="aacc-account-trend" aria-label={`Evolución cuenta ${account.customerName}`}>
      <div className="aacc-account-trend__header">
        <div>
          <span className="eyebrow">Evolución cuenta</span>
          <strong>{label}</strong>
        </div>
        <div>
          <span>{formatMetricValue(lastValue, lensMode === "financial" ? "value" : metricMode)}</span>
          <small>{trend === null ? "Sin base" : `${formatSharePercent(trend)} vs inicio`}</small>
        </div>
      </div>

      <svg className="aacc-line-chart" viewBox="0 0 320 92" role="img" aria-label={`Línea de ${label}`}>
        <polyline className="aacc-line-chart__grid" points="0,72 320,72" />
        <polyline className="aacc-line-chart__area" points={`0,88 ${points} 320,88`} />
        <polyline className={lastValue < firstValue ? "aacc-line-chart__line aacc-line-chart__line--down" : "aacc-line-chart__line"} points={points} />
        {series.map((item, index) => {
          const [x, y] = points.split(" ")[index]?.split(",") ?? [0, 80];
          return <circle key={item.key} className="aacc-line-chart__dot" cx={x} cy={y} r="3" />;
        })}
      </svg>

      <div className="aacc-account-trend__axis">
        <span>{series[0]?.label ?? ""}</span>
        <span>{series[series.length - 1]?.label ?? ""}</span>
      </div>

      <div className="aacc-account-trend-table">
        <div className="aacc-account-trend-table__head">
          <span>Mes</span>
          <span>{lensMode === "financial" ? "CAAP" : metricMode === "volume" ? "Volumen" : "Valor"}</span>
          <span>Vs mes ant.</span>
        </div>
        {series.map((item, index) => {
          const previous = series[index - 1]?.value ?? null;
          const trend = previous ? (item.value - previous) / Math.abs(previous) : null;

          return (
            <div key={item.key} className="aacc-account-trend-table__row">
              <span>{item.label}</span>
              <strong>{formatMetricValue(item.value, lensMode === "financial" ? "value" : metricMode)}</strong>
              <span className={trend !== null && trend < 0 ? "trend-negative" : "trend-positive"}>
                {trend === null ? "Sin base" : formatSharePercent(trend)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AaccAccountBrief({ account, dateRange, lensMode, metricMode, trendAccount }) {
  const [mixDimension, setMixDimension] = useState("brand");
  const [mixView, setMixView] = useState("rows");

  if (!account) {
    return (
      <section className="card brief-empty">
        <span className="eyebrow">Ficha AACC</span>
        <h2>Selecciona un acuerdo</h2>
      </section>
    );
  }

  const accountMix = buildAccountMix(account, mixDimension, metricMode);
  const metrics = [
    ["Inversión anual", formatUsd(account.annualFeeUsd), "primary"],
    ["Volumen real", `${formatNumber(account.metrics.volumeEu)} EUs`, ""],
    ["Gross Sales", formatUsd(account.metrics.grossSales), ""],
    ["Total Trade Spend", formatUsd(account.metrics.totalTradeSpend), "danger"],
    ["NSV", formatUsd(account.metrics.netSalesValue), ""],
    ["Gross Profit", formatUsd(account.metrics.grossProfit), account.metrics.grossProfit >= 0 ? "good" : "danger"],
    ["GM %", formatSharePercent(account.metrics.grossMarginPct), account.checks.gmOk ? "good" : "danger"],
    ["ROI", formatSharePercent(account.metrics.roi), account.checks.roiOk ? "good" : "danger"],
    ["CAAP", formatUsd(account.metrics.caap), account.metrics.caap >= 0 ? "good" : "danger"],
  ];

  return (
    <section className="card aacc-brief-card">
      <div className="brief-title-row">
        <div>
          <span className="eyebrow">Ficha de rentabilidad</span>
          <h2>{account.customerName}</h2>
          <p className="scope-label">{[account.chainName, account.diageoCustomerId, account.subSegmentation].filter(Boolean).join(" · ")}</p>
        </div>
        <StatusPill status={account.status} />
      </div>

      <AaccAccountTrendLine
        account={trendAccount ?? account}
        dateRange={dateRange}
        lensMode={lensMode}
        metricMode={metricMode}
      />

      <div className="metrics-grid metrics-grid--compact">
        {metrics.map(([label, value, tone]) => (
          <div key={label} className={`metric-card ${tone ? `metric-card--${tone}` : ""}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="aacc-check-grid">
        <Check label="GM Check" ok={account.checks.gmOk} target={formatSharePercent(account.checks.grossMarginTarget)} />
        <Check label="ROI Check" ok={account.checks.roiOk} target={formatSharePercent(account.checks.roiTarget)} />
      </div>

      <div className="aacc-section">
        <span className="eyebrow">Lectura comercial</span>
        <ul className="insight-list">
          {account.insights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </div>

      <AaccAccountMixDetail
        dimension={mixDimension}
        items={accountMix}
        metricMode={metricMode}
        viewMode={mixView}
        onDimensionChange={setMixDimension}
        onViewChange={setMixView}
      />
    </section>
  );
}

function AaccAccountMixDetail({
  dimension,
  items,
  metricMode,
  onDimensionChange,
  onViewChange,
  viewMode,
}) {
  const visibleItems = items.slice(0, 8);

  return (
    <section className="aacc-account-mix-detail">
      <div className="aacc-account-mix-detail__header">
        <div>
          <span className="eyebrow">Mix de la cuenta</span>
          <h3>{ACCOUNT_MIX_DIMENSIONS.find((option) => option.key === dimension)?.label ?? "Mix"}</h3>
        </div>
        <div className="aacc-account-mix-controls">
          <div className="segmented-control" role="radiogroup" aria-label="Dimension de mix">
            {ACCOUNT_MIX_DIMENSIONS.map((option) => (
              <button
                key={option.key}
                aria-checked={dimension === option.key}
                className={dimension === option.key ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
                role="radio"
                type="button"
                onClick={() => onDimensionChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="segmented-control segmented-control--two" role="radiogroup" aria-label="Vista de mix">
            {ACCOUNT_MIX_VIEWS.map((option) => (
              <button
                key={option.key}
                aria-checked={viewMode === option.key}
                className={viewMode === option.key ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"}
                role="radio"
                type="button"
                onClick={() => onViewChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleItems.length ? (
        viewMode === "chart" ? (
          <div className="aacc-account-mix-chart" role="img" aria-label="Grafico de mix de la cuenta">
            {visibleItems.map((item) => (
              <div key={item.name} className="aacc-account-mix-chart__item">
                <div className="aacc-account-mix-chart__track">
                  <span style={{ height: `${Math.max(6, Math.round(item.share * 100))}%` }} />
                </div>
                <strong>{formatSharePercent(item.share)}</strong>
                <span>{item.name}</span>
                <small>{formatMetricValue(item.value, metricMode)}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="aacc-account-mix-rows">
            {visibleItems.map((item) => (
              <div key={item.name} className="aacc-account-mix-row">
                <div className="aacc-account-mix-row__top">
                  <strong>{item.name}</strong>
                  <span>{formatSharePercent(item.share)}</span>
                </div>
                <div className="aacc-account-mix-row__bar">
                  <span style={{ width: `${Math.max(4, Math.round(item.share * 100))}%` }} />
                </div>
                <small>{formatMetricValue(item.value, metricMode)}</small>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className="muted-copy">Sin mix disponible para esta cuenta.</p>
      )}
    </section>
  );
}

function AaccRankings({ rankings }) {
  return (
    <section className="card">
      <div className="section-heading">
        <span className="eyebrow">Prioridades de gestión</span>
        <h2>Dónde actuar primero</h2>
      </div>
      <div className="ranking-grid">
        <Ranking title="Mejor ROI" accounts={rankings.bestRoi} value={(account) => formatSharePercent(account.metrics.roi)} />
        <Ranking title="Mayor presión CAAP" accounts={rankings.caapPressure} value={(account) => formatUsd(account.metrics.caap)} danger />
        <Ranking title="Mayor inversión" accounts={rankings.biggestInvestment} value={(account) => formatUsd(account.totalInvestmentUsd)} />
      </div>
    </section>
  );
}

function Ranking({ accounts, danger = false, title, value }) {
  return (
    <div className="ranking-list-card">
      <span className="eyebrow">{title}</span>
      <ol className="top-list">
        {accounts.map((account, index) => (
          <li key={account.agreementId}>
            <span className="ranking-item-text">
              <span className="ranking-name">
                <b>{index + 1}.</b> {account.customerName}
              </span>
              <small>{account.status.label}</small>
            </span>
            <strong className={danger ? "ranking-value--danger" : ""}>{value(account)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DecisionCard({ active, label, onSelect, tone, value }) {
  return (
    <button
      aria-pressed={active}
      className={`aacc-decision-card aacc-decision-card--${tone} ${active ? "aacc-decision-card--active" : ""}`}
      type="button"
      onClick={onSelect}
    >
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>Ver detalle</small>
    </button>
  );
}

function DecisionDetail({ accounts, decision, onClear, onSelectAccount, selectedAccountId }) {
  if (!decision) {
    return null;
  }

  const summary = buildDecisionSummary(accounts);

  return (
    <section className="card aacc-decision-detail" aria-label={`Detalle ${decision.label}`}>
      <div className="aacc-detail-header">
        <div>
          <span className="eyebrow">Detalle de decisión</span>
          <h2>{decision.label}</h2>
          <p>{decision.description}</p>
        </div>
        <button className="filter-clear-button" type="button" onClick={onClear}>
          Ver todos
        </button>
      </div>

      <div className="aacc-detail-metrics">
        <DetailMetric label="Cuentas" value={formatNumber(accounts.length)} />
        <DetailMetric label="Inversión anual" value={formatUsd(summary.investment)} />
        <DetailMetric label="Volumen real" value={`${formatNumber(summary.volumeEu)} EUs`} />
        <DetailMetric label="CAAP" value={formatUsd(summary.caap)} tone={summary.caap >= 0 ? "good" : "danger"} />
        <DetailMetric label="ROI promedio" value={formatSharePercent(summary.roi)} tone={summary.roi >= 0 ? "good" : "danger"} />
        <DetailMetric label="GM promedio" value={formatSharePercent(summary.grossMarginPct)} tone={summary.grossMarginPct >= 0.4 ? "good" : "danger"} />
      </div>

      {accounts.length ? (
        <div className="aacc-detail-list" role="list">
          {accounts.map((account) => (
            <button
              key={account.agreementId}
              className={account.agreementId === selectedAccountId ? "aacc-detail-row aacc-detail-row--active" : "aacc-detail-row"}
              type="button"
              onClick={() => onSelectAccount(account.agreementId)}
            >
              <span>
                <strong>{account.customerName}</strong>
                <small>{[account.bottler, account.city, account.subSegmentation].filter(Boolean).join(" · ")}</small>
              </span>
              <span>
                <small>ROI</small>
                <strong>{formatSharePercent(account.metrics.roi)}</strong>
              </span>
              <span>
                <small>GM</small>
                <strong>{formatSharePercent(account.metrics.grossMarginPct)}</strong>
              </span>
              <span>
                <small>CAAP</small>
                <strong>{formatUsd(account.metrics.caap)}</strong>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="general-empty">
          <strong>Sin cuentas en este estado</strong>
          <p>La celda está en cero porque ningún acuerdo cae en esta clasificación con las reglas actuales.</p>
        </div>
      )}
    </section>
  );
}

function DetailMetric({ label, tone = "", value }) {
  return (
    <div className={`aacc-detail-metric ${tone ? `aacc-detail-metric--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Check({ label, ok, target }) {
  return (
    <div className={ok ? "aacc-check aacc-check--ok" : "aacc-check aacc-check--no"}>
      <span>{label}</span>
      <strong>{ok ? "OK" : "NO"}</strong>
      <small>Mínimo {target}</small>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`aacc-status-pill aacc-status-pill--${STATUS_CLASS[status.key] ?? "warning"}`}>{status.label}</span>;
}

function buildStatusCounts(accounts) {
  return accounts.reduce(
    (counts, account) => ({
      ...counts,
      [account.status.key]: (counts[account.status.key] ?? 0) + 1,
    }),
    { boost: 0, exit: 0, freeze: 0, maintain: 0, renegotiate: 0 },
  );
}

function buildDecisionSummary(accounts) {
  const investment = sumBy(accounts, (account) => account.annualFeeUsd);
  const volumeEu = sumBy(accounts, (account) => account.metrics.volumeEu);
  const caap = sumBy(accounts, (account) => account.metrics.caap);
  const grossProfit = sumBy(accounts, (account) => account.metrics.grossProfit);
  const netSalesValue = sumBy(accounts, (account) => account.metrics.netSalesValue);
  const totalTradeSpend = sumBy(accounts, (account) => account.metrics.totalTradeSpend);

  return {
    caap,
    grossMarginPct: netSalesValue ? grossProfit / netSalesValue : null,
    investment,
    roi: totalTradeSpend ? -caap / totalTradeSpend : null,
    volumeEu,
  };
}

function sumBy(items, getValue) {
  return items.reduce((total, item) => total + (getValue(item) ?? 0), 0);
}

function filterAccountsByBottler(accounts, bottlerFilter) {
  if (bottlerFilter === "all") {
    return accounts;
  }

  const targetBottler = normalizeColumnName(bottlerFilter);

  return accounts.filter((account) => normalizeColumnName(account.bottler).includes(targetBottler));
}

function applyPeriodFilterToAccounts(accounts, dateRange) {
  const selectedPeriods = getSelectedPeriods(dateRange);

  if (!selectedPeriods.length) {
    return [];
  }

  return accounts.map((account) => {
    const monthlyRows = buildAccountMonthlyRows(account);
    const selectedRows = monthlyRows.filter((row) => selectedPeriods.some((period) => period.key === row.key));
    const selectedMetrics = aggregateMonthlyRows(selectedRows);
    const volumeScale = account.metrics.volumeEu ? selectedMetrics.volumeEu / account.metrics.volumeEu : 0;
    const valueScale = account.metrics.grossSales ? selectedMetrics.grossSales / account.metrics.grossSales : volumeScale;
    const productScale = volumeScale || valueScale;

    return {
      ...account,
      annualFeeUsd: Math.abs(selectedMetrics.visibilityFee || account.annualFeeUsd * selectedPeriods.length / AACC_PERIODS.length),
      metrics: {
        ...account.metrics,
        ap: account.metrics.ap * valueScale,
        caap: selectedMetrics.caap,
        cogs: account.metrics.cogs * valueScale,
        fixedTradeSpend: account.metrics.fixedTradeSpend * valueScale,
        grossProfit: selectedMetrics.grossProfit,
        grossSales: selectedMetrics.grossSales,
        netSalesValue: selectedMetrics.netSalesValue,
        promoDiscount: account.metrics.promoDiscount * valueScale,
        rappel: account.metrics.rappel * valueScale,
        totalTradeSpend: selectedMetrics.totalTradeSpend,
        variableTradeSpend: account.metrics.variableTradeSpend * valueScale,
        visibilityFee: selectedMetrics.visibilityFee,
        volumeEu: selectedMetrics.volumeEu,
      },
      productMix: account.productMix.map((product) => ({
        ...product,
        grossSales: product.grossSales * valueScale,
        volumeEu: product.volumeEu * productScale,
      })),
      totalInvestmentUsd: Math.abs(selectedMetrics.visibilityFee || account.totalInvestmentUsd * selectedPeriods.length / AACC_PERIODS.length),
    };
  });
}

function getSelectedPeriods(dateRange) {
  const from = dateRange.from <= dateRange.to ? dateRange.from : dateRange.to;
  const to = dateRange.from <= dateRange.to ? dateRange.to : dateRange.from;
  return AACC_PERIODS.filter((period) => period.key >= from && period.key <= to);
}

function buildAccountMonthlyRows(account) {
  const seed = getAccountSeed(account);
  const weights = AACC_PERIODS.map((_, index) => {
    const seasonal = 1 + 0.18 * Math.sin((index + seed) * 0.9);
    const momentum = 0.88 + index * 0.035;
    const tactical = ((seed + index) % 5 === 0 ? 0.9 : 1) + ((seed + index) % 7 === 0 ? 0.14 : 0);
    return Math.max(0.35, seasonal * momentum * tactical);
  });
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);

  return AACC_PERIODS.map((period, index) => {
    const share = weights[index] / totalWeight;

    return {
      key: period.key,
      label: period.label,
      caap: account.metrics.caap * share,
      grossProfit: account.metrics.grossProfit * share,
      grossSales: account.metrics.grossSales * share,
      netSalesValue: account.metrics.netSalesValue * share,
      totalTradeSpend: account.metrics.totalTradeSpend * share,
      visibilityFee: account.metrics.visibilityFee * share,
      volumeEu: account.metrics.volumeEu * share,
    };
  });
}

function buildMonthlySeries(accounts, dateRange, metricMode, lensMode) {
  const selectedPeriods = getSelectedPeriods(dateRange);
  const selectedKeys = new Set(selectedPeriods.map((period) => period.key));
  const rows = AACC_PERIODS.filter((period) => selectedKeys.has(period.key)).map((period) => ({
    key: period.key,
    label: period.label,
    value: 0,
  }));
  const rowByKey = new Map(rows.map((row) => [row.key, row]));

  accounts.forEach((account) => {
    buildAccountMonthlyRows(account).forEach((row) => {
      const target = rowByKey.get(row.key);

      if (!target) {
        return;
      }

      target.value += getMonthlyValue(row, metricMode, lensMode);
    });
  });

  return rows;
}

function buildAccountLineSeries(account, dateRange, metricMode, lensMode) {
  const selectedKeys = new Set(getSelectedPeriods(dateRange).map((period) => period.key));

  return buildAccountMonthlyRows(account)
    .filter((row) => selectedKeys.has(row.key))
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: getMonthlyValue(row, metricMode, lensMode),
    }));
}

function buildLinePoints(series) {
  if (!series.length) {
    return "";
  }

  const values = series.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const chart = {
    bottom: 76,
    height: 58,
    left: 12,
    width: 296,
  };

  return series
    .map((item, index) => {
      const x = series.length === 1 ? 160 : chart.left + (index * chart.width) / (series.length - 1);
      const y = range === 0 ? 46 : chart.bottom - ((item.value - min) / range) * chart.height;
      return `${roundChartPoint(x)},${roundChartPoint(y)}`;
    })
    .join(" ");
}

function getMonthlyValue(row, metricMode, lensMode) {
  if (lensMode === "financial") {
    return row.caap;
  }

  return metricMode === "volume" ? row.volumeEu : row.grossSales;
}

function aggregateMonthlyRows(rows) {
  return rows.reduce(
    (total, row) => ({
      caap: total.caap + row.caap,
      grossProfit: total.grossProfit + row.grossProfit,
      grossSales: total.grossSales + row.grossSales,
      netSalesValue: total.netSalesValue + row.netSalesValue,
      totalTradeSpend: total.totalTradeSpend + row.totalTradeSpend,
      visibilityFee: total.visibilityFee + row.visibilityFee,
      volumeEu: total.volumeEu + row.volumeEu,
    }),
    {
      caap: 0,
      grossProfit: 0,
      grossSales: 0,
      netSalesValue: 0,
      totalTradeSpend: 0,
      visibilityFee: 0,
      volumeEu: 0,
    },
  );
}

function buildMix(accounts, dimension, metricMode) {
  const grouped = new Map();

  accounts.forEach((account) => {
    account.productMix.forEach((product) => {
      const key = product[dimension] || "Sin dato";
      const current = grouped.get(key) ?? 0;
      grouped.set(key, current + (metricMode === "volume" ? product.volumeEu : product.grossSales));
    });
  });

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);

  return [...grouped.entries()]
    .map(([name, value]) => ({
      name,
      share: total ? value / total : null,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildAccountMix(account, dimension, metricMode) {
  const grouped = new Map();

  account.productMix.forEach((product) => {
    const key = product[dimension] || "Sin dato";
    const current = grouped.get(key) ?? 0;
    grouped.set(key, current + (metricMode === "volume" ? product.volumeEu : product.grossSales));
  });

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);

  return [...grouped.entries()]
    .map(([name, value]) => ({
      name,
      share: total ? value / total : null,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildCommercialSummary(accounts, metricMode) {
  const categoryMix = buildMix(accounts, "category", metricMode);
  const brandMix = buildMix(accounts, "brand", metricMode);
  const primaryValue = sumBy(accounts, (account) =>
    metricMode === "volume" ? account.metrics.volumeEu : account.metrics.grossSales,
  );

  return {
    averagePerAccount: accounts.length ? primaryValue / accounts.length : 0,
    primaryValue,
    topBrand: brandMix[0],
    topCategory: categoryMix[0],
  };
}

function formatMetricValue(value, metricMode) {
  return metricMode === "volume" ? `${formatNumber(value)} EUs` : formatUsd(value);
}

function getAccountSeed(account) {
  const text = `${account.agreementId}${account.customerName}${account.diageoCustomerId}`;
  return [...text].reduce((total, char) => total + char.charCodeAt(0), 0) % 11;
}

function roundChartPoint(value) {
  return Math.round(value * 10) / 10;
}

export default AaccProfitabilityPage;
