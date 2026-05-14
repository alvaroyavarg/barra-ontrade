import { normalizeColumnName } from "./columnMapping.js";

export function getCommercialSkuIdentity(rawSku) {
  const label = stripLeadingSkuCode(rawSku);
  const key = normalizeColumnName(label);

  return {
    key: key || normalizeColumnName(rawSku),
    label: label || String(rawSku ?? "").trim(),
  };
}

function stripLeadingSkuCode(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  return text.replace(/^\d{4,}\s*[-:]\s*/, "").trim() || text;
}
