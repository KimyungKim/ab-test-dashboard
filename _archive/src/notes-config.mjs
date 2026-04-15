import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const notesPath = path.join(__dirname, "..", "notes.md");

const defaultRevenueMetricOrder = [
  "Purchase Count",
  "Payer Count",
  "Revenue",
  "ARPPU",
  "ARPDAU",
  "Conversion(F2P -> P2P) Rate",
  "Monetization",
  "ASP"
];

function extractRevenueMetricOrder(raw) {
  const candidates = defaultRevenueMetricOrder;
  const matched = candidates.filter(metric => raw.includes(metric));
  return matched.length ? matched : defaultRevenueMetricOrder;
}

export async function getNotesConfig() {
  try {
    const raw = await readFile(notesPath, "utf8");
    const metricOrder = extractRevenueMetricOrder(raw);

    return {
      revenueMetricOrder: metricOrder.length ? metricOrder : defaultRevenueMetricOrder,
      analysisFocusAnomalies: raw.includes("특이한 동향") || raw.includes("크게 빠지는 날"),
      analysisHideRules: raw.includes("작동 rule을 적지 말것")
    };
  } catch {
    return {
      revenueMetricOrder: defaultRevenueMetricOrder,
      analysisFocusAnomalies: true,
      analysisHideRules: true
    };
  }
}
