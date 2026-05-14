import XLSX from "xlsx";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/analyzeWorkbook.mjs <xlsx-file>");
  process.exit(1);
}

const workbook = XLSX.readFile(filePath, {
  cellDates: true,
  cellFormula: true,
  cellNF: true,
  cellStyles: true,
});

const result = {
  filePath,
  workbookSheets: workbook.SheetNames,
  workbookNames: workbook.Workbook?.Names ?? [],
  sheets: workbook.SheetNames.map((sheetName) => inspectSheet(workbook.Sheets[sheetName], sheetName)),
};

console.log(JSON.stringify(result, null, 2));

function inspectSheet(sheet, sheetName) {
  const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    header: 1,
    raw: false,
  });
  const formulaCells = [];
  const nonEmptyRows = rows.filter((row) => row.some((value) => value !== null && value !== ""));
  const likelyHeader = findLikelyHeader(nonEmptyRows);

  if (range) {
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[address];

        if (cell?.f) {
          formulaCells.push({
            address,
            formula: cell.f,
            value: formatCellValue(cell.v),
          });
        }
      }
    }
  }

  return {
    name: sheetName,
    ref: sheet["!ref"] ?? null,
    hidden: sheet["!hidden"] ?? 0,
    rowCount: range ? range.e.r - range.s.r + 1 : 0,
    columnCount: range ? range.e.c - range.s.c + 1 : 0,
    nonEmptyRowCount: nonEmptyRows.length,
    likelyHeader,
    firstRows: nonEmptyRows.slice(0, 8),
    formulaCount: formulaCells.length,
    formulaSamples: formulaCells.slice(0, 12),
    externalOrSheetRefs: summarizeFormulaRefs(formulaCells),
  };
}

function findLikelyHeader(rows) {
  let best = null;

  rows.slice(0, 30).forEach((row, index) => {
    const filled = row.filter((value) => value !== null && value !== "").length;
    const textCount = row.filter((value) => typeof value === "string" && value.trim()).length;
    const score = filled + textCount * 0.5;

    if (!best || score > best.score) {
      best = {
        columns: row,
        nonEmptyColumns: filled,
        rowIndexInNonEmptyRows: index,
        score,
      };
    }
  });

  return best;
}

function summarizeFormulaRefs(formulaCells) {
  const refs = new Map();

  for (const cell of formulaCells) {
    const matches = cell.formula.match(/(?:'[^']+'|[A-Za-z0-9_ .-]+)!/g) ?? [];

    for (const match of matches) {
      const sheetName = match.replace(/!$/, "").replace(/^'/, "").replace(/'$/, "");
      refs.set(sheetName, (refs.get(sheetName) ?? 0) + 1);
    }
  }

  return Array.from(refs.entries())
    .map(([sheet, count]) => ({ sheet, count }))
    .sort((a, b) => b.count - a.count);
}

function formatCellValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value ?? null;
}
