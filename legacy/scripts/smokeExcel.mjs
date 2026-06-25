import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseExcelFile } from "../src/utils/excelParser.js";
import { buildCustomerBriefs } from "../src/utils/insightEngine.js";
import { buildGeneralViews } from "../src/utils/overviewEngine.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/smokeExcel.mjs <excel-file>");
  process.exit(1);
}

const buffer = await readFile(filePath);
const file = {
  name: basename(filePath),
  async arrayBuffer() {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  },
};

const parsed = await parseExcelFile(file);
const customers = buildCustomerBriefs(parsed.records, parsed.summary);
const generalViews = buildGeneralViews(parsed.records, parsed.summary);

console.log(
  JSON.stringify(
    {
      summary: parsed.summary,
      warnings: parsed.warnings,
      generalViews,
      customerCount: customers.length,
      firstCustomers: customers.slice(0, 5).map((customer) => ({
        id: customer.customerId,
        name: customer.customerName,
        channel: customer.channel,
        zone: customer.zone,
        city: customer.city,
        route: customer.route,
        status: customer.statusLabel,
        salesCurrent: customer.metrics.salesLast28,
        salesPrevious: customer.metrics.salesPrevious28,
        trend: customer.metrics.salesTrendPercent,
        lastPurchase: customer.metrics.lastPurchaseLabel,
        bullets: customer.insights,
        nextBestAction: customer.nextBestAction,
        openingLine: customer.openingLine,
      })),
    },
    null,
    2,
  ),
);
