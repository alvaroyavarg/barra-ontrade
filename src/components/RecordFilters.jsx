import { useEffect, useMemo, useState } from "react";
import {
  FILTER_FIELDS,
  getFilterDisplayLabel,
  getFilterFieldLabel,
  getFilterOptions,
} from "../utils/filterEngine.js";
import { normalizeColumnName } from "../utils/columnMapping.js";
import { formatNumber } from "../utils/formatters.js";

const MAX_VISIBLE_OPTIONS = 120;

const FIELD_LABEL_CLASS = "flex flex-col gap-1 text-[11px] font-medium text-slate-600";
const FIELD_INPUT_CLASS =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function RecordFilters({
  baseRecords,
  filteredRecords,
  filters,
  onFiltersChange,
  scopeLabel = "la vista",
}) {
  const [selectedField, setSelectedField] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [valueQuery, setValueQuery] = useState("");

  const optionsByField = useMemo(() => {
    const entries = FILTER_FIELDS.map((fieldConfig) => [
      fieldConfig.field,
      getFilterOptions(baseRecords, fieldConfig.field),
    ]);

    return new Map(entries);
  }, [baseRecords]);

  const usedFields = useMemo(() => new Set(filters.map((filter) => filter.field)), [filters]);
  const availableFields = useMemo(
    () =>
      FILTER_FIELDS.filter(
        (fieldConfig) => !usedFields.has(fieldConfig.field) && (optionsByField.get(fieldConfig.field)?.length ?? 0) > 0,
      ),
    [optionsByField, usedFields],
  );

  useEffect(() => {
    if (availableFields.length === 0) {
      setSelectedField("");
      return;
    }

    if (!selectedField || !availableFields.some((fieldConfig) => fieldConfig.field === selectedField)) {
      setSelectedField(availableFields[0].field);
      setValueQuery("");
    }
  }, [availableFields, selectedField]);

  const allValueOptions = optionsByField.get(selectedField) ?? [];
  const normalizedValueQuery = normalizeColumnName(valueQuery);
  const matchedValueOptions = useMemo(() => {
    if (!normalizedValueQuery) {
      return allValueOptions;
    }

    return allValueOptions.filter((option) =>
      normalizeColumnName(`${option.label} ${option.value}`).includes(normalizedValueQuery),
    );
  }, [allValueOptions, normalizedValueQuery]);
  const visibleValueOptions = matchedValueOptions.slice(0, MAX_VISIBLE_OPTIONS);

  useEffect(() => {
    if (!visibleValueOptions.length) {
      setSelectedValue("");
      return;
    }

    if (!selectedValue || !matchedValueOptions.some((option) => option.value === selectedValue)) {
      setSelectedValue(visibleValueOptions[0].value);
    }
  }, [matchedValueOptions, selectedValue, visibleValueOptions]);

  function addFilter() {
    if (!selectedField || !selectedValue) {
      return;
    }

    const selectedOption = allValueOptions.find((option) => option.value === selectedValue);

    onFiltersChange([
      ...filters,
      {
        field: selectedField,
        label: selectedOption?.label ?? selectedValue,
        value: selectedValue,
      },
    ]);
    setValueQuery("");
  }

  function removeFilter(filterToRemove) {
    onFiltersChange(filters.filter((filter) => filter !== filterToRemove));
  }

  function clearFilters() {
    onFiltersChange([]);
    setValueQuery("");
  }

  if (!baseRecords.length) {
    return null;
  }

  return (
    <section
      aria-label="Filtros de detalle"
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Filtros
          </span>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Detalle de {scopeLabel}
          </h2>
        </div>
        <p className="text-[12px] text-slate-500">
          {formatNumber(filteredRecords.length)} de {formatNumber(baseRecords.length)} filas
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className={FIELD_LABEL_CLASS}>
          <span>Columna</span>
          <select
            className={FIELD_INPUT_CLASS}
            disabled={availableFields.length === 0}
            value={selectedField}
            onChange={(event) => {
              setSelectedField(event.target.value);
              setSelectedValue("");
              setValueQuery("");
            }}
          >
            {availableFields.map((fieldConfig) => (
              <option key={fieldConfig.field} value={fieldConfig.field}>
                {fieldConfig.label}
              </option>
            ))}
          </select>
        </label>

        <label className={FIELD_LABEL_CLASS}>
          <span>Buscar valor</span>
          <input
            className={FIELD_INPUT_CLASS}
            disabled={!selectedField}
            placeholder="Filtrar valores"
            type="search"
            value={valueQuery}
            onChange={(event) => setValueQuery(event.target.value)}
          />
        </label>

        <label className={FIELD_LABEL_CLASS}>
          <span>Valor</span>
          <select
            className={FIELD_INPUT_CLASS}
            disabled={!visibleValueOptions.length}
            value={selectedValue}
            onChange={(event) => setSelectedValue(event.target.value)}
          >
            {visibleValueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 active:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!selectedField || !selectedValue}
          type="button"
          onClick={addFilter}
        >
          Aplicar
        </button>
      </div>

      {selectedField && matchedValueOptions.length > MAX_VISIBLE_OPTIONS ? (
        <p className="text-[11px] italic text-slate-500">
          {formatNumber(matchedValueOptions.length)} valores en {getFilterFieldLabel(selectedField)}. Refina la búsqueda para acotar.
        </p>
      ) : null}

      {filters.length ? (
        <div aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={`${filter.field}-${filter.value}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
              type="button"
              onClick={() => removeFilter(filter)}
            >
              {getFilterDisplayLabel(filter)}
              <span aria-hidden="true" className="text-[12px] leading-none">×</span>
            </button>
          ))}
          <button
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
            type="button"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default RecordFilters;
