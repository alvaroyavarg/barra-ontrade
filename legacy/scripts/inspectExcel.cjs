const XLSX = require("xlsx");

const file = process.argv[2];

if (!file) {
  console.error("Usage: node scripts/inspectExcel.cjs <excel-file>");
  process.exit(1);
}

const workbook = XLSX.readFile(file, { cellDates: true });

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_./%-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeader(headers, wanted) {
  return headers.find((header) => normalize(header) === wanted);
}

const summary = {
  file,
  sheetNames: workbook.SheetNames,
  sheets: [],
};

for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const rowsArray = XLSX.utils.sheet_to_json(worksheet, {
    blankrows: false,
    defval: null,
    header: 1,
    raw: true,
  });
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: true,
  });
  const headers = Object.keys(rows[0] ?? {});
  const yearHeader = findHeader(headers, "ano");
  const dayHeader = findHeader(headers, "dia");
  const salesHeader = findHeader(headers, "ingreso");
  const boxesHeader = findHeader(headers, "cf");
  const volumeHeader = findHeader(headers, "volumen uc");

  const columns = headers.map((header) => {
    const values = rows
      .map((row) => row[header])
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
    const uniqueValues = [...new Set(values.map((value) => String(value)))];
    const numbers = values.filter((value) => typeof value === "number" && Number.isFinite(value));

    return {
      name: header,
      filled: values.length,
      unique: uniqueValues.length,
      samples: uniqueValues.slice(0, 12),
      min: numbers.length ? Math.min(...numbers) : null,
      max: numbers.length ? Math.max(...numbers) : null,
    };
  });

  const rowsByYearDay = {};

  if (yearHeader && dayHeader) {
    for (const row of rows) {
      const key = `${row[yearHeader]}-${String(row[dayHeader]).padStart(2, "0")}`;
      rowsByYearDay[key] = (rowsByYearDay[key] ?? 0) + 1;
    }
  }

  const totals = {
    sales: salesHeader ? rows.reduce((total, row) => total + (Number(row[salesHeader]) || 0), 0) : null,
    boxes: boxesHeader ? rows.reduce((total, row) => total + (Number(row[boxesHeader]) || 0), 0) : null,
    volumeUc: volumeHeader ? rows.reduce((total, row) => total + (Number(row[volumeHeader]) || 0), 0) : null,
  };

  summary.sheets.push({
    name: sheetName,
    ref: worksheet["!ref"],
    rowCountIncludingHeader: rowsArray.length,
    dataRowCount: rows.length,
    columnCount: headers.length,
    firstRows: rowsArray.slice(0, 8),
    columns,
    rowsByYearDay,
    totals,
  });
}

console.log(JSON.stringify(summary, null, 2));
