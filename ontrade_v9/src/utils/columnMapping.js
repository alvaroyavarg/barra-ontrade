export const COLUMN_ALIASES = {
  date: ["fecha", "fecha venta", "fecha documento", "dia", "día", "date", "periodo", "fecha factura"],
  year: ["año", "ano", "year"],
  month: ["mes", "month", "periodo mes", "mes venta"],
  dayOfPeriod: ["dia", "día", "day", "dia venta", "día venta"],
  outputNumber: ["salidas", "salida", "n salida", "numero salida", "número salida"],
  customerId: [
    "cliente_id",
    "cliente id",
    "codigo cliente",
    "código cliente",
    "cod cliente",
    "cod pdv",
    "codigo pdv",
    "código pdv",
    "id cliente",
    "rut cliente",
  ],
  customerName: [
    "cliente",
    "nombre cliente",
    "razon social",
    "razón social",
    "pdv",
    "punto de venta",
    "nombre pdv",
    "local",
    "cuenta",
    "customer",
  ],
  sku: [
    "sku",
    "producto",
    "material",
    "descripcion producto",
    "descripción producto",
    "descripcion material",
    "descripción material",
    "item",
    "producto nombre",
  ],
  category: [
    "categoria",
    "categoría",
    "familia",
    "segmento",
    "marca",
    "subcategoria",
    "subcategoría",
    "linea",
    "línea",
  ],
  brand: ["marca", "brand"],
  segment: ["segmento", "segment", "tier"],
  package: ["empaque", "formato", "pack", "package"],
  salesAmount: [
    "venta",
    "venta neta",
    "monto",
    "importe",
    "ingreso",
    "revenue",
    "net sales",
    "facturacion",
    "facturación",
    "valor venta",
  ],
  boxes: ["cajas", "cjs", "cases", "cf", "unidades", "cantidad", "volumen", "qty", "quantity"],
  volumeUc: ["volumen uc", "uc", "volumen unidades convertidas"],
  zone: ["zona", "territorio", "region", "región", "area", "área"],
  city: ["comuna", "ciudad", "localidad"],
  office: ["oficina de ventas", "oficina ventas", "oficina", "sucursal"],
  priority: ["ips", "prioridad", "priority"],
  channel: ["canal", "channel", "tipo cliente", "subcanal", "segmento cliente"],
  seller: ["vendedor", "ejecutivo", "kam", "representante", "asesor", "sales rep"],
  route: ["ruta", "route"],
  discount: ["descuento", "dto", "discount", "porcentaje descuento", "% descuento"],
  margin: ["margen", "margin", "margen %", "rentabilidad"],
};

const FIELD_LABELS = {
  date: "fecha",
  year: "año",
  month: "mes",
  dayOfPeriod: "día",
  outputNumber: "salida",
  customerId: "ID cliente",
  customerName: "cliente",
  sku: "SKU",
  category: "categoría",
  brand: "marca",
  segment: "segmento",
  package: "empaque",
  salesAmount: "venta",
  boxes: "cajas",
  volumeUc: "volumen UC",
  zone: "zona",
  city: "comuna",
  office: "oficina",
  priority: "prioridad",
  channel: "canal",
  seller: "ejecutivo",
  route: "ruta",
  discount: "descuento",
  margin: "margen",
};

const ALIAS_INDEX = Object.entries(COLUMN_ALIASES).flatMap(([field, aliases]) =>
  aliases.map((alias) => ({
    field,
    alias,
    normalizedAlias: normalizeColumnName(alias),
  })),
);

export function normalizeColumnName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_./%-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}

export function mapColumns(headerRow = []) {
  const candidates = [];

  headerRow.forEach((headerCell, columnIndex) => {
    const normalizedHeader = normalizeColumnName(headerCell);

    if (!normalizedHeader) {
      return;
    }

    let bestCandidate = null;

    for (const aliasEntry of ALIAS_INDEX) {
      const score = getMatchScore(normalizedHeader, aliasEntry.normalizedAlias);

      if (score > 0 && (!bestCandidate || score > bestCandidate.score)) {
        bestCandidate = {
          field: aliasEntry.field,
          score,
          columnIndex,
          header: String(headerCell).trim(),
        };
      }
    }

    if (bestCandidate) {
      candidates.push(bestCandidate);
    }
  });

  candidates.sort((a, b) => b.score - a.score);

  const mapping = {};
  const detectedLabels = {};
  const usedColumns = new Set();

  for (const candidate of candidates) {
    if (mapping[candidate.field] !== undefined || usedColumns.has(candidate.columnIndex)) {
      continue;
    }

    mapping[candidate.field] = candidate.columnIndex;
    detectedLabels[candidate.field] = candidate.header;
    usedColumns.add(candidate.columnIndex);
  }

  return {
    mapping,
    detectedLabels,
    score: scoreMapping(mapping),
  };
}

export function detectHeaderRow(rows) {
  const rowsToScan = rows.slice(0, 20);
  let bestResult = null;

  rowsToScan.forEach((row, index) => {
    const result = mapColumns(row);

    if (!bestResult || result.score > bestResult.score) {
      bestResult = {
        ...result,
        headerRowIndex: index,
      };
    }
  });

  return bestResult?.score > 0 ? bestResult : null;
}

function getMatchScore(header, alias) {
  if (!header || !alias) {
    return 0;
  }

  if (header === alias) {
    return 1000 + alias.length;
  }

  const headerWithSpaces = ` ${header} `;
  const aliasWithSpaces = ` ${alias} `;

  if (headerWithSpaces.includes(aliasWithSpaces)) {
    return 500 + alias.length;
  }

  if (aliasWithSpaces.includes(headerWithSpaces) && header.length >= 4) {
    return 120 + header.length;
  }

  return 0;
}

function scoreMapping(mapping) {
  const fields = Object.keys(mapping);
  let score = fields.length;

  if (mapping.date !== undefined) {
    score += 3;
  }

  if (mapping.customerName !== undefined || mapping.customerId !== undefined) {
    score += 3;
  }

  if (mapping.salesAmount !== undefined || mapping.boxes !== undefined) {
    score += 3;
  }

  return score;
}
