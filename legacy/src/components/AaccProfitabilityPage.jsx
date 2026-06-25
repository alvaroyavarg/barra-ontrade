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

const CARD = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
const CARD_TITLE = "text-base font-semibold tracking-tight text-slate-900";
const SECTION_TITLE = "text-[14px] font-semibold leading-tight text-slate-900";
const EYEBROW = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
const BODY_TEXT = "text-[13px] text-slate-700";
const META_TEXT = "text-[11px] text-slate-500";
const BTN_PRIMARY =
  "rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700";
const BTN_SECONDARY =
  "rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1";
const SEGMENT_BTN =
  "rounded-md px-3 py-1.5 text-[12px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1";
const SEGMENT_BTN_ACTIVE = "bg-slate-900 text-white shadow-sm";
const SEGMENT_BTN_INACTIVE = "text-slate-600 hover:bg-white hover:text-slate-900";
const SEGMENT_GROUP = "inline-flex w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1";
const INPUT =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10";

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
    <section className="flex flex-col gap-4" aria-label="Rentabilidad AACC">
      <div className="flex items-center justify-between gap-3 pb-2">
        <button className={BTN_SECONDARY} type="button" onClick={onBackHome}>
          Volver al inicio
        </button>
        <span className={EYEBROW}>Rentabilidad AACC</span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className={EYEBROW}>Pilar 2</span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Rentabilidad AACC</h1>
          <p className={`max-w-2xl ${BODY_TEXT}`}>
            Decisión por acuerdo comercial: mantener, potenciar, renegociar o no renovar.
          </p>
        </div>
        <label className={`${BTN_PRIMARY} cursor-pointer self-start sm:self-end`}>
          <input className="hidden" accept=".xlsx,.xls" type="file" onChange={handleSalesUpload} />
          {isLoading ? "Leyendo ventas..." : "Cargar sábana de ventas"}
        </label>
      </div>

      {error ? (
        <AlertCard tone="danger" title="No se pudo cargar el tracker">
          <p>{error}</p>
        </AlertCard>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SourceStripCell label="Fuente activa" value={trackerMeta ? trackerMeta.fileName : "Maestro DBA"} />
        <SourceStripCell label="Cuentas AACC" value={formatNumber(model.accounts.length)} />
        <SourceStripCell label="Con datos de venta" value={formatNumber(model.accounts.filter((a) => a.hasSalesData).length)} />
        <SourceStripCell label="Fuente futura" value="ProjectLighthouse" />
      </section>

      {trackerMeta && model.accounts.filter((a) => a.hasSalesData).length < model.accounts.length * 0.5 ? (
        <AlertCard tone="warning" title="Cruce parcial de datos">
          <p>
            {model.accounts.filter((a) => a.hasSalesData).length} de {model.accounts.length} cuentas AACC tienen datos de venta en este archivo.
            El archivo usa razón social y código de embotelladora; el Maestro usa código Diageo PDV.
            Para cruce completo se necesita un archivo con los mismos códigos PDV del Maestro.
          </p>
        </AlertCard>
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <section className={`${CARD} flex flex-col gap-2`}>
            <label className={`${EYEBROW}`} htmlFor="aacc-search">Buscar acuerdo</label>
            <input
              id="aacc-search"
              className={INPUT}
              placeholder="Cliente, cadena, ID, ciudad, estado o segmento"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <p className={META_TEXT}>
              {activeDecision
                ? `${filteredAccounts.length} de ${activeDecisionAccounts.length} acuerdos en ${activeDecision.label}`
                : `${filteredAccounts.length} de ${model.accounts.length} acuerdos`}
            </p>
          </section>

          <section className="flex flex-col gap-2" aria-label="Lista de acuerdos AACC">
            {filteredAccounts.map((account) => (
              <AccountRow
                key={account.agreementId}
                account={account}
                selected={account.agreementId === selectedAccount?.agreementId}
                onSelect={() => setSelectedId(account.agreementId)}
              />
            ))}
          </section>
        </aside>

        <div className="flex flex-col gap-4">
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

function AlertCard({ children, title, tone = "danger" }) {
  const tones = {
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 ${tones[tone] ?? tones.danger}`} role="alert">
      <strong className="text-[13px] font-semibold">{title}</strong>
      <div className={`text-[13px] leading-relaxed ${tone === "warning" ? "text-amber-700" : "text-rose-700"}`}>
        {children}
      </div>
    </div>
  );
}

function SourceStripCell({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={EYEBROW}>{label}</span>
      <strong className="text-[14px] font-semibold tracking-tight text-slate-900 break-words">{value}</strong>
    </div>
  );
}

function AccountRow({ account, onSelect, selected }) {
  const selectedClasses = selected
    ? "border-slate-900 ring-2 ring-slate-900/10"
    : "border-slate-200 hover:border-slate-300 hover:shadow";
  return (
    <button
      className={`flex w-full items-start justify-between gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${selectedClasses}`}
      type="button"
      onClick={onSelect}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <strong className="text-[13px] font-semibold text-slate-900">{account.customerName}</strong>
        <small className={META_TEXT}>{[account.bottler, account.city, account.subSegmentation].filter(Boolean).join(" · ")}</small>
      </span>
      <span className="flex flex-shrink-0 flex-col items-end gap-1">
        <StatusPill status={account.status} />
        {account.hasSalesData !== undefined ? (
          <b className={`text-[11px] font-semibold ${account.hasSalesData ? "text-emerald-600" : "text-slate-400"}`}>
            {account.hasSalesData ? "Con datos" : "Sin datos"}
          </b>
        ) : (
          <b className="text-[13px] font-semibold tabular-nums text-slate-900">{formatSharePercent(account.metrics.roi)}</b>
        )}
      </span>
    </button>
  );
}

function AaccSectionMarker({ copy, label, title, tone = "portfolio" }) {
  const toneStyles = {
    portfolio: "border-l-emerald-600 bg-emerald-50/60 border-emerald-100",
    account: "border-l-slate-700 bg-slate-50 border-slate-200",
  };
  const labelTone = tone === "account" ? "text-slate-700" : "text-emerald-700";
  return (
    <section
      className={`flex flex-col gap-1 rounded-xl border border-l-4 p-4 ${toneStyles[tone] ?? toneStyles.portfolio}`}
      aria-label={label}
    >
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${labelTone}`}>{label}</span>
      <div className="flex flex-col gap-1">
        <h2 className={CARD_TITLE}>{title}</h2>
        <p className={BODY_TEXT}>{copy}</p>
      </div>
    </section>
  );
}

function ControlGroup({ children, label }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={EYEBROW}>{label}</span>
      {children}
    </div>
  );
}

function SegmentedControl({ ariaLabel, options, value, onChange }) {
  return (
    <div className={SEGMENT_GROUP} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          aria-checked={value === option.key}
          className={`flex-1 ${SEGMENT_BTN} ${value === option.key ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_INACTIVE}`}
          role="radio"
          type="button"
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
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
    <section className={`${CARD} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`} aria-label="Controles de lectura AACC">
      <ControlGroup label="Lectura">
        <SegmentedControl
          ariaLabel="Lectura por volumen o valor"
          options={[
            { key: "volume", label: "Volumen" },
            { key: "value", label: "Valor" },
          ]}
          value={metricMode}
          onChange={onMetricModeChange}
        />
      </ControlGroup>

      <ControlGroup label="Vista">
        <SegmentedControl
          ariaLabel="Vista comercial o financiera"
          options={[
            { key: "commercial", label: "Comercial" },
            { key: "financial", label: "Financiera" },
          ]}
          value={lensMode}
          onChange={onLensModeChange}
        />
      </ControlGroup>

      <ControlGroup label="Embotellador">
        <SegmentedControl
          ariaLabel="Filtro por embotellador"
          options={BOTTLER_OPTIONS}
          value={bottlerFilter}
          onChange={onBottlerFilterChange}
        />
      </ControlGroup>

      <label className="flex flex-col gap-2">
        <span className={EYEBROW}>Desde</span>
        <input
          className={INPUT}
          max={dateRange.to}
          min={AACC_PERIODS[0].key}
          type="month"
          value={dateRange.from}
          onChange={(event) => onDateRangeChange((current) => ({ ...current, from: event.target.value }))}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={EYEBROW}>Hasta</span>
        <input
          className={INPUT}
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

function MetricCell({ label, tone = "", value }) {
  const toneStyles = {
    primary: "border-slate-900/20 bg-slate-50",
    good: "border-emerald-200 bg-emerald-50",
    danger: "border-rose-200 bg-rose-50",
  };
  const valueTone =
    tone === "good" ? "text-emerald-700" : tone === "danger" ? "text-rose-700" : "text-slate-900";
  return (
    <div className={`flex flex-col justify-between gap-2 rounded-xl border p-4 shadow-sm ${toneStyles[tone] ?? "border-slate-200 bg-white"}`}>
      <span className={EYEBROW}>{label}</span>
      <strong className={`text-[15px] font-semibold tabular-nums tracking-tight ${valueTone} break-words`}>{value}</strong>
    </div>
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
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <span className={EYEBROW}>Resumen ejecutivo</span>
        <h2 className={CARD_TITLE}>
          {lensMode === "commercial" ? "Lectura comercial de acuerdos" : "Salud financiera de acuerdos comerciales"}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value, tone]) => (
          <MetricCell key={label} label={label} tone={tone} value={value} />
        ))}
      </div>
    </section>
  );
}

function AaccMixPanel({ brandMix, categoryMix, metricMode, selectedPeriods }) {
  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <span className={EYEBROW}>Mix comercial</span>
        <h2 className={CARD_TITLE}>Participación por categoría y marca</h2>
        <p className={META_TEXT}>
          {selectedPeriods.length} meses seleccionados · lectura por {metricMode === "volume" ? "volumen" : "valor"}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <MixList title="Mix de categoría" items={categoryMix} metricMode={metricMode} />
        <MixList title="Mix de marca" items={brandMix} metricMode={metricMode} />
      </div>
    </section>
  );
}

function MixList({ items, metricMode, title }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={EYEBROW}>{title}</span>
      {items.length ? (
        items.slice(0, 7).map((item) => (
          <div key={item.name} className="flex flex-col gap-2 border-t border-slate-100 py-2 first:border-t-0">
            <div className="flex items-baseline justify-between gap-3">
              <strong className="text-[13px] font-semibold text-slate-900">{item.name}</strong>
              <span className={`${META_TEXT} flex-shrink-0 text-right tabular-nums`}>
                {formatSharePercent(item.share)} · {formatMetricValue(item.value, metricMode)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-slate-900"
                style={{ width: `${Math.max(4, Math.round(item.share * 100))}%` }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className={META_TEXT}>Sin mix disponible.</p>
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
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <span className={EYEBROW}>Evolución mensual</span>
        <h2 className={CARD_TITLE}>{label}</h2>
        <p className={META_TEXT}>
          Serie referencial para validar el esqueleto. Se reemplaza por períodos reales al conectar Lighthouse.
        </p>
      </div>
      <div
        className="grid items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(series.length, 1)}, minmax(0, 1fr))`, minHeight: "240px" }}
        role="img"
        aria-label={`Gráfico de ${label}`}
      >
        {series.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex h-44 w-full items-end overflow-hidden rounded-lg bg-slate-100">
              <span
                className={`block w-full rounded-t-lg ${item.value < 0 ? "bg-rose-500" : "bg-slate-900"}`}
                style={{ height: `${Math.max(6, Math.round((Math.abs(item.value) / maxValue) * 100))}%` }}
              />
            </div>
            <strong className="text-[11px] font-semibold text-slate-700">{item.label}</strong>
            <small className={`${META_TEXT} break-words text-center tabular-nums`}>
              {formatMetricValue(item.value, lensMode === "financial" ? "value" : metricMode)}
            </small>
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
  const lineDown = lastValue < firstValue;

  return (
    <section
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
      aria-label={`Evolución cuenta ${account.customerName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className={EYEBROW}>Evolución cuenta</span>
          <strong className="text-[13px] font-semibold text-slate-900">{label}</strong>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[13px] font-semibold tabular-nums text-slate-900">
            {formatMetricValue(lastValue, lensMode === "financial" ? "value" : metricMode)}
          </span>
          <small className={META_TEXT}>{trend === null ? "Sin base" : `${formatSharePercent(trend)} vs inicio`}</small>
        </div>
      </div>

      <svg className="block h-24 w-full" viewBox="0 0 320 92" role="img" aria-label={`Línea de ${label}`}>
        <polyline className="fill-none stroke-slate-200" strokeWidth="1" points="0,72 320,72" />
        <polyline className="fill-slate-900/5 stroke-none" points={`0,88 ${points} 320,88`} />
        <polyline
          className={`fill-none ${lineDown ? "stroke-rose-500" : "stroke-slate-900"}`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {series.map((item, index) => {
          const [x, y] = points.split(" ")[index]?.split(",") ?? [0, 80];
          return (
            <circle
              key={item.key}
              className={`fill-white ${lineDown ? "stroke-rose-500" : "stroke-slate-900"}`}
              strokeWidth="2"
              cx={x}
              cy={y}
              r="3"
            />
          );
        })}
      </svg>

      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
        <span>{series[0]?.label ?? ""}</span>
        <span>{series[series.length - 1]?.label ?? ""}</span>
      </div>

      <div className="max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white">
        <div className="sticky top-0 z-10 grid grid-cols-[0.8fr_minmax(0,1.2fr)_0.9fr] items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className={EYEBROW}>Mes</span>
          <span className={EYEBROW}>{lensMode === "financial" ? "CAAP" : metricMode === "volume" ? "Volumen" : "Valor"}</span>
          <span className={EYEBROW}>Vs mes ant.</span>
        </div>
        {series.map((item, index) => {
          const previous = series[index - 1]?.value ?? null;
          const trend = previous ? (item.value - previous) / Math.abs(previous) : null;

          return (
            <div
              key={item.key}
              className="grid grid-cols-[0.8fr_minmax(0,1.2fr)_0.9fr] items-center gap-2 border-t border-slate-100 px-3 py-2 text-[12px] text-slate-700 first:border-t-0"
            >
              <span>{item.label}</span>
              <strong className="font-semibold tabular-nums text-slate-900 break-words">
                {formatMetricValue(item.value, lensMode === "financial" ? "value" : metricMode)}
              </strong>
              <span
                className={`text-[12px] font-semibold tabular-nums ${
                  trend !== null && trend < 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
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
      <section className={`${CARD} flex min-h-[170px] flex-col gap-1`}>
        <span className={EYEBROW}>Ficha AACC</span>
        <h2 className={CARD_TITLE}>Selecciona un acuerdo</h2>
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
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className={EYEBROW}>Ficha de rentabilidad</span>
          <h2 className={CARD_TITLE}>{account.customerName}</h2>
          <p className={`${BODY_TEXT} font-medium`}>
            {[account.chainName, account.diageoCustomerId, account.subSegmentation].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusPill status={account.status} />
      </div>

      <AaccAccountTrendLine
        account={trendAccount ?? account}
        dateRange={dateRange}
        lensMode={lensMode}
        metricMode={metricMode}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value, tone]) => (
          <MetricCell key={label} label={label} tone={tone} value={value} />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Check label="GM Check" ok={account.checks.gmOk} target={formatSharePercent(account.checks.grossMarginTarget)} />
        <Check label="ROI Check" ok={account.checks.roiOk} target={formatSharePercent(account.checks.roiTarget)} />
      </div>

      <div className="flex flex-col gap-2">
        <span className={EYEBROW}>Lectura comercial</span>
        <ul className="flex flex-col gap-2">
          {account.insights.map((insight) => (
            <li key={insight} className="relative pl-5 text-[13px] leading-relaxed text-slate-700 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-amber-500 before:content-['']">
              {insight}
            </li>
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
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className={EYEBROW}>Mix de la cuenta</span>
          <h3 className={SECTION_TITLE}>
            {ACCOUNT_MIX_DIMENSIONS.find((option) => option.key === dimension)?.label ?? "Mix"}
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          <SegmentedControl
            ariaLabel="Dimension de mix"
            options={ACCOUNT_MIX_DIMENSIONS}
            value={dimension}
            onChange={onDimensionChange}
          />
          <SegmentedControl
            ariaLabel="Vista de mix"
            options={ACCOUNT_MIX_VIEWS}
            value={viewMode}
            onChange={onViewChange}
          />
        </div>
      </div>

      {visibleItems.length ? (
        viewMode === "chart" ? (
          <div
            className="grid items-end gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(visibleItems.length, 4)}, minmax(0, 1fr))`, minHeight: "230px" }}
            role="img"
            aria-label="Grafico de mix de la cuenta"
          >
            {visibleItems.map((item) => (
              <div key={item.name} className="flex min-w-0 flex-col items-center gap-1.5">
                <div className="flex h-32 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                  <span
                    className="block w-full rounded-t-lg bg-slate-900"
                    style={{ height: `${Math.max(6, Math.round(item.share * 100))}%` }}
                  />
                </div>
                <strong className="text-[13px] font-semibold tabular-nums text-slate-900">{formatSharePercent(item.share)}</strong>
                <span className="break-words text-center text-[11px] font-semibold leading-tight text-slate-700">{item.name}</span>
                <small className={`${META_TEXT} break-words text-center tabular-nums`}>{formatMetricValue(item.value, metricMode)}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleItems.map((item) => (
              <div key={item.name} className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="min-w-0 break-words text-[13px] font-semibold text-slate-900">{item.name}</strong>
                  <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-slate-900">{formatSharePercent(item.share)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className="block h-full rounded-full bg-slate-900"
                    style={{ width: `${Math.max(4, Math.round(item.share * 100))}%` }}
                  />
                </div>
                <small className={`${META_TEXT} tabular-nums`}>{formatMetricValue(item.value, metricMode)}</small>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className={META_TEXT}>Sin mix disponible para esta cuenta.</p>
      )}
    </section>
  );
}

function AaccRankings({ rankings }) {
  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <span className={EYEBROW}>Prioridades de gestión</span>
        <h2 className={CARD_TITLE}>Dónde actuar primero</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Ranking title="Mejor ROI" accounts={rankings.bestRoi} value={(account) => formatSharePercent(account.metrics.roi)} />
        <Ranking title="Mayor presión CAAP" accounts={rankings.caapPressure} value={(account) => formatUsd(account.metrics.caap)} danger />
        <Ranking title="Mayor inversión" accounts={rankings.biggestInvestment} value={(account) => formatUsd(account.totalInvestmentUsd)} />
      </div>
    </section>
  );
}

function Ranking({ accounts, danger = false, title, value }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={EYEBROW}>{title}</span>
      <ol className="flex flex-col gap-1">
        {accounts.map((account, index) => (
          <li key={account.agreementId} className="flex justify-between gap-3 border-t border-slate-100 py-2 first:border-t-0">
            <span className="flex min-w-0 flex-col gap-0.5 break-words text-slate-700">
              <span className="block text-[13px]">
                <b className="font-semibold text-slate-500">{index + 1}.</b> {account.customerName}
              </span>
              <small className={META_TEXT}>{account.status.label}</small>
            </span>
            <strong
              className={`flex-shrink-0 text-right text-[13px] font-semibold tabular-nums ${
                danger ? "text-rose-700" : "text-slate-900"
              }`}
            >
              {value(account)}
            </strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DecisionCard({ active, label, onSelect, tone, value }) {
  const valueTones = {
    good: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
  };
  const activeClasses = active
    ? "border-slate-900 ring-2 ring-slate-900/10"
    : "border-slate-200 hover:border-slate-300 hover:shadow";
  return (
    <button
      aria-pressed={active}
      className={`flex flex-col gap-1 rounded-xl border bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${activeClasses}`}
      type="button"
      onClick={onSelect}
    >
      <span className={EYEBROW}>{label}</span>
      <strong className={`text-2xl font-semibold tabular-nums tracking-tight ${valueTones[tone] ?? "text-slate-900"}`}>
        {formatNumber(value)}
      </strong>
      <small className={META_TEXT}>Ver detalle</small>
    </button>
  );
}

function DecisionDetail({ accounts, decision, onClear, onSelectAccount, selectedAccountId }) {
  if (!decision) {
    return null;
  }

  const summary = buildDecisionSummary(accounts);

  return (
    <section className={`${CARD} flex flex-col gap-4`} aria-label={`Detalle ${decision.label}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className={EYEBROW}>Detalle de decisión</span>
          <h2 className={CARD_TITLE}>{decision.label}</h2>
          <p className={BODY_TEXT}>{decision.description}</p>
        </div>
        <button className={BTN_SECONDARY} type="button" onClick={onClear}>
          Ver todos
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailMetric label="Cuentas" value={formatNumber(accounts.length)} />
        <DetailMetric label="Inversión anual" value={formatUsd(summary.investment)} />
        <DetailMetric label="Volumen real" value={`${formatNumber(summary.volumeEu)} EUs`} />
        <DetailMetric label="CAAP" value={formatUsd(summary.caap)} tone={summary.caap >= 0 ? "good" : "danger"} />
        <DetailMetric label="ROI promedio" value={formatSharePercent(summary.roi)} tone={summary.roi >= 0 ? "good" : "danger"} />
        <DetailMetric label="GM promedio" value={formatSharePercent(summary.grossMarginPct)} tone={summary.grossMarginPct >= 0.4 ? "good" : "danger"} />
      </div>

      {accounts.length ? (
        <div className="flex max-h-96 flex-col gap-2 overflow-auto pr-1" role="list">
          {accounts.map((account) => (
            <DetailRow
              key={account.agreementId}
              account={account}
              selected={account.agreementId === selectedAccountId}
              onSelect={() => onSelectAccount(account.agreementId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <strong className="text-[13px] font-semibold text-amber-800">Sin cuentas en este estado</strong>
          <p className="text-[13px] text-amber-700">
            La celda está en cero porque ningún acuerdo cae en esta clasificación con las reglas actuales.
          </p>
        </div>
      )}
    </section>
  );
}

function DetailRow({ account, onSelect, selected }) {
  const selectedClasses = selected
    ? "border-slate-900 bg-slate-50"
    : "border-slate-100 bg-white hover:border-slate-300 hover:shadow";
  return (
    <button
      className={`grid w-full grid-cols-1 gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] sm:items-center ${selectedClasses}`}
      type="button"
      onClick={onSelect}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <strong className="break-words text-[13px] font-semibold text-slate-900">{account.customerName}</strong>
        <small className={META_TEXT}>{[account.bottler, account.city, account.subSegmentation].filter(Boolean).join(" · ")}</small>
      </span>
      <span className="flex flex-col gap-0.5">
        <small className={EYEBROW}>ROI</small>
        <strong className="text-[13px] font-semibold tabular-nums text-slate-900">{formatSharePercent(account.metrics.roi)}</strong>
      </span>
      <span className="flex flex-col gap-0.5">
        <small className={EYEBROW}>GM</small>
        <strong className="text-[13px] font-semibold tabular-nums text-slate-900">{formatSharePercent(account.metrics.grossMarginPct)}</strong>
      </span>
      <span className="flex flex-col gap-0.5">
        <small className={EYEBROW}>CAAP</small>
        <strong className="text-[13px] font-semibold tabular-nums text-slate-900">{formatUsd(account.metrics.caap)}</strong>
      </span>
    </button>
  );
}

function DetailMetric({ label, tone = "", value }) {
  const toneStyles = {
    good: "border-emerald-200 bg-emerald-50",
    danger: "border-rose-200 bg-rose-50",
  };
  const valueTone =
    tone === "good" ? "text-emerald-700" : tone === "danger" ? "text-rose-700" : "text-slate-900";
  return (
    <div className={`flex min-h-[78px] flex-col justify-between gap-2 rounded-xl border p-3 ${toneStyles[tone] ?? "border-slate-200 bg-slate-50"}`}>
      <span className={EYEBROW}>{label}</span>
      <strong className={`break-words text-[15px] font-semibold tabular-nums ${valueTone}`}>{value}</strong>
    </div>
  );
}

function Check({ label, ok, target }) {
  const okStyles = ok
    ? "border-emerald-200 bg-emerald-50"
    : "border-rose-200 bg-rose-50";
  const valueTone = ok ? "text-emerald-700" : "text-rose-700";
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-3 ${okStyles}`}>
      <span className={EYEBROW}>{label}</span>
      <strong className={`text-lg font-semibold ${valueTone}`}>{ok ? "OK" : "NO"}</strong>
      <small className={META_TEXT}>Mínimo {target}</small>
    </div>
  );
}

function StatusPill({ status }) {
  const tone = STATUS_CLASS[status.key] ?? "warning";
  const tones = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {status.label}
    </span>
  );
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
