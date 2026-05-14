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
    <section className="card filter-card" aria-label="Filtros de detalle">
      <div className="filter-card__header">
        <div className="section-heading">
          <span className="eyebrow">Filtros</span>
          <h2>Detalle de {scopeLabel}</h2>
        </div>
        <p>
          {formatNumber(filteredRecords.length)} de {formatNumber(baseRecords.length)} filas
        </p>
      </div>

      <div className="filter-controls">
        <label>
          <span>Columna</span>
          <select
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

        <label>
          <span>Buscar valor</span>
          <input
            disabled={!selectedField}
            placeholder="Filtrar valores"
            type="search"
            value={valueQuery}
            onChange={(event) => setValueQuery(event.target.value)}
          />
        </label>

        <label>
          <span>Valor</span>
          <select
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
          className="filter-add-button"
          disabled={!selectedField || !selectedValue}
          type="button"
          onClick={addFilter}
        >
          Aplicar
        </button>
      </div>

      {selectedField && matchedValueOptions.length > MAX_VISIBLE_OPTIONS ? (
        <p className="filter-note">
          {formatNumber(matchedValueOptions.length)} valores en {getFilterFieldLabel(selectedField)}. Refina la búsqueda para acotar.
        </p>
      ) : null}

      {filters.length ? (
        <div className="filter-chip-list" aria-label="Filtros activos">
          {filters.map((filter) => (
            <button
              key={`${filter.field}-${filter.value}`}
              className="filter-chip"
              type="button"
              onClick={() => removeFilter(filter)}
            >
              {getFilterDisplayLabel(filter)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button className="filter-clear-button" type="button" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default RecordFilters;
