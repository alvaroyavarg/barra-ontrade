import XLSX from "xlsx";

const IMPORTANT_SHEETS = [
  "Inversión solicitada",
  "Homologación Diageo",
  "Tracker",
  "P&L Proyectado",
  "LH",
  "Revision",
];

const filePath = process.argv[2];
const selectedSheets = process.argv.slice(3);

if (!filePath) {
  console.error("Usage: node scripts/summarizeCommercialTracking.mjs <xlsx-file>");
  process.exit(1);
}

const workbook = XLSX.readFile(filePath, {
  cellDates: true,
  cellFormula: true,
  cellNF: true,
  cellStyles: true,
});

const summary = {
  sheets: (selectedSheets.length ? selectedSheets : IMPORTANT_SHEETS).map((sheetName) =>
    summarizeSheet(workbook.Sheets[sheetName], sheetName),
  ),
  workbookNames: summarizeNames(workbook.Workbook?.Names ?? []),
};

console.log(JSON.stringify(summary, null, 2));

function summarizeSheet(sheet, sheetName) {
  if (!sheet) {
    return { name: sheetName, missing: true };
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    header: 1,
    raw: false,
  });
  const nonEmptyRows = rows.filter((row) => row.some((value) => value !== null && value !== ""));
  const formulaCells = collectFormulaCells(sheet, range);
  const likelyHeaderCandidates = findHeaderCandidates(nonEmptyRows);

  return {
    name: sheetName,
    ref: sheet["!ref"],
    rowCount: range.e.r - range.s.r + 1,
    columnCount: range.e.c - range.s.c + 1,
    nonEmptyRowCount: nonEmptyRows.length,
    firstRows: cleanRows(nonEmptyRows.slice(0, 12)),
    headerCandidates: likelyHeaderCandidates,
    formulaCount: formulaCells.length,
    formulaRefs: summarizeFormulaRefs(formulaCells),
    formulasByFunction: summarizeFormulaFunctions(formulaCells),
    formulaSamples: formulaCells.slice(0, 20),
  };
}

function collectFormulaCells(sheet, range) {
  const formulaCells = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[address];

      if (cell?.f) {
        formulaCells.push({
          address,
          formula: truncate(cell.f, 240),
          value: formatValue(cell.v),
        });
      }
    }
  }

  return formulaCells;
}

function findHeaderCandidates(rows) {
  return rows
    .slice(0, 40)
    .map((row, index) => {
      const filled = row.filter((value) => value !== null && value !== "").length;
      const textCount = row.filter((value) => typeof value === "string" && value.trim()).length;

      return {
        columns: row.map((value) => truncate(formatValue(value), 70)),
        nonEmptyColumns: filled,
        rowIndexInNonEmptyRows: index,
        score: filled + textCount * 0.5,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function summarizeNames(names) {
  return names
    .filter((name) =>
      ["SAP", "BEX", "IQ", "LH", "FilterDatabase", "RESERVE", "PREMIUM", "Mainstream"].some((needle) =>
        String(name.Name).toUpperCase().includes(needle.toUpperCase()) ||
        String(name.Ref).toUpperCase().includes(needle.toUpperCase()),
      ),
    )
    .map((name) => ({
      name: name.Name,
      hidden: Boolean(name.Hidden),
      ref: truncate(name.Ref, 160),
      sheet: name.Sheet ?? null,
    }));
}

function summarizeFormulaRefs(formulaCells) {
  const refs = new Map();

  for (const cell of formulaCells) {
    const matches = cell.formula.match(/(?:'[^']+'|[A-Za-z0-9_ .-]+)!/g) ?? [];

    for (const match of matches) {
      const sheet = match.replace(/!$/, "").replace(/^'/, "").replace(/'$/, "");
      refs.set(sheet, (refs.get(sheet) ?? 0) + 1);
    }
  }

  return Array.from(refs.entries())
    .map(([sheet, count]) => ({ sheet, count }))
    .sort((a, b) => b.count - a.count);
}

function summarizeFormulaFunctions(formulaCells) {
  const counts = new Map();

  for (const cell of formulaCells) {
    const matches = cell.formula.match(/\b[A-Z][A-Z0-9.]*\s*\(/g) ?? [];

    for (const match of matches) {
      const fn = match.replace(/\s*\($/, "");
      counts.set(fn, (counts.get(fn) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([fn, count]) => ({ fn, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function cleanRows(rows) {
  return rows.map((row) => row.map((value) => truncate(formatValue(value), 90)));
}

function formatValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value ?? null;
}

function truncate(value, length) {
  if (value === null || value === undefined) {
    return value;
  }

  const text = String(value);
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
