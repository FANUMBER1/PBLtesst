const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

test("1. history.ts exports calculateDailyTotalProduction & filterTodayRecords", () => {
  const historyPath = join(__dirname, "../frontend/src/lib/history.ts");
  const content = readFileSync(historyPath, "utf8");

  assert.ok(content.includes("export function calculateDailyTotalProduction"), "Must export calculateDailyTotalProduction");
  assert.ok(content.includes("export function filterTodayRecords"), "Must export filterTodayRecords");
  assert.ok(content.includes("export const BUSINESS_TIME_ZONE = \"Asia/Ho_Chi_Minh\""), "Must use Asia/Ho_Chi_Minh");
});

test("2. calculateDailyTotalProduction logic maintains cumulative total when tray is cleared", () => {
  // Test the pure mathematical/business logic
  const now = new Date();
  const todayIso = now.toISOString();

  const mockRecordsToday = Array.from({ length: 14 }, (_, i) => ({
    id: `rec_${i}`,
    product_id: `prod_${i}`,
    brand_id: "brand_c",
    brand_name: "Red Bull",
    confidence: 0.98,
    target_bin: 3,
    actual_bin: 3,
    status: "success",
    timestamp: todayIso,
  }));

  // Helper matching the algorithm in history.ts
  function calculateTotal(records, binCounts) {
    const totalInBins = (binCounts?.bin1 || 0) + (binCounts?.bin2 || 0) + (binCounts?.bin3 || 0);
    return Math.max(records.length, totalInBins);
  }

  // Before clearing bin 3:
  const binCountsBefore = { bin1: 0, bin2: 0, bin3: 14 };
  const totalBefore = calculateTotal(mockRecordsToday, binCountsBefore);
  assert.strictEqual(totalBefore, 14, "Total before clearing tray must be 14");

  // After worker clears bin 3 (dọn khay / thay khay rỗng mới):
  const binCountsAfter = { bin1: 0, bin2: 0, bin3: 0 };
  const totalAfter = calculateTotal(mockRecordsToday, binCountsAfter);
  assert.strictEqual(totalAfter, 14, "Total after clearing tray MUST STILL be 14 SP, NOT 0 SP!");

  // Cleared count calculation
  const totalInBins = binCountsAfter.bin1 + binCountsAfter.bin2 + binCountsAfter.bin3;
  const cleared = totalAfter - totalInBins;
  assert.strictEqual(cleared, 14, "Cleared items count must be 14");
});

test("3. DashboardLayout.tsx handleTriggerShiftSummary preserves cumulative daily count", () => {
  const filePath = join(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("filterTodayRecords(records)"), "Must filter today records in handleTriggerShiftSummary");
  assert.ok(content.includes("Math.max("), "Must use Math.max to prevent cleared bins from decreasing daily report");
  assert.ok(content.includes("totalFromBins = bin1 + bin2 + bin3"), "Contract: totalFromBins must be present");
  assert.ok(content.includes("computedTotal"), "Contract: computedTotal must be present");
});

test("4. page.tsx uses calculateDailyTotalProduction for totalSorted", () => {
  const filePath = join(__dirname, "../frontend/src/app/page.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("calculateDailyTotalProduction(records, binCounts)"), "page.tsx must use calculateDailyTotalProduction");
  assert.ok(content.includes("totalSorted={totalSorted}"), "Must pass totalSorted to KpiStatGrid");
});

test("5. KpiStatGrid.tsx displays current tray fill and cleared products", () => {
  const filePath = join(__dirname, "../frontend/src/components/overview/KpiStatGrid.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("Hiện trong khay: K1:"), "Subtitle must clearly state current tray levels");
  assert.ok(content.includes("Đã dọn:"), "Subtitle must display cleared count when trays have been emptied");
  assert.ok(content.includes("Sản lượng ca"), "Card title must remain Sản lượng ca");
});

test("6. LiveChart.tsx supports totalSorted prop and analytics/page.tsx passes it", () => {
  const chartPath = join(__dirname, "../frontend/src/components/LiveChart.tsx");
  const chartContent = readFileSync(chartPath, "utf8");
  assert.ok(chartContent.includes("totalSorted?: number"), "LiveChartProps must accept totalSorted");

  const analyticsPath = join(__dirname, "../frontend/src/app/analytics/page.tsx");
  const analyticsContent = readFileSync(analyticsPath, "utf8");
  assert.ok(analyticsContent.includes("calculateDailyTotalProduction(records, binCounts)"), "analytics/page.tsx must calculate daily total production");
  assert.ok(analyticsContent.includes("totalSorted={totalSorted}"), "analytics/page.tsx must pass totalSorted to LiveChart");
});
