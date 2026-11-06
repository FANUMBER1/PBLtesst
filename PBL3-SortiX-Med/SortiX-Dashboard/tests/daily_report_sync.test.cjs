const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

test("1. ShiftSummaryToast Source Code Contract: Displays BÁO CÁO 1 NGÀY LÀM VIỆC", () => {
  const filePath = join(__dirname, "../frontend/src/components/ui/ShiftSummaryToast.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("BÁO CÁO 1 NGÀY LÀM VIỆC"), "Must render BÁO CÁO 1 NGÀY LÀM VIỆC in header");
  assert.ok(content.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC]"), "Must render [BÁO CÁO 1 NGÀY LÀM VIỆC] in description");
  assert.ok(content.includes("1 Ngày làm việc"), "Default fallback shiftName must be 1 Ngày làm việc");
});

test("2. ShiftSummaryModal Source Code Contract: Displays Báo Cáo 1 Ngày Làm Việc", () => {
  const filePath = join(__dirname, "../frontend/src/components/ui/ShiftSummaryModal.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("Báo Cáo 1 Ngày Làm Việc"), "Modal title must be Báo Cáo 1 Ngày Làm Việc");
});

test("3. TopHeader Source Code Contract: Button displays Báo cáo 1 ngày làm việc", () => {
  const filePath = join(__dirname, "../frontend/src/components/layout/TopHeader.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("Báo cáo 1 ngày làm việc"), "Header button text must be Báo cáo 1 ngày làm việc");
  assert.ok(content.includes("Xem báo cáo 1 ngày làm việc & Đồng bộ dữ liệu"), "Header button title must mention sync data");
});

test("4. DashboardLayout Data Synchronization Contract: Computes live values from binCounts and telemetry", () => {
  const filePath = join(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("liveBinCounts = sorterData.binCounts"), "Must read live binCounts from sorterData");
  assert.ok(content.includes("totalFromBins = bin1 + bin2 + bin3"), "Must sum bin1 + bin2 + bin3");
  assert.ok(content.includes("computedTotal"), "Must compute dynamic total from live state");
  assert.ok(content.includes("computedGood"), "Must compute dynamic good count from live state");
  assert.ok(content.includes("computedDefect"), "Must compute dynamic defect count from live state");
  assert.ok(content.includes("computedAccuracy"), "Must compute accuracy dynamically");
  assert.ok(content.includes("telemetry.uptime"), "Must compute operating hours from telemetry.uptime");
  assert.ok(content.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC]"), "Alert description must use [BÁO CÁO 1 NGÀY LÀM VIỆC]");
});

test("5. Export CSV & Print Template Contract: Formatted as BÁO CÁO 1 NGÀY LÀM VIỆC", () => {
  const filePath = join(__dirname, "../frontend/src/lib/exportCsv.ts");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("BÁO CÁO 1 NGÀY LÀM VIỆC - HỆ THỐNG SORTIX IOT"), "CSV must have BÁO CÁO 1 NGÀY LÀM VIỆC banner");
  assert.ok(content.includes("Báo Cáo 1 Ngày Làm Việc"), "Print template title must be Báo Cáo 1 Ngày Làm Việc");
});

test("6. Backend Safety Service Contract: Uses [BÁO CÁO 1 NGÀY LÀM VIỆC]", () => {
  const filePath = join(__dirname, "../backend/src/services/safetyService.ts");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC]"), "Backend description must use [BÁO CÁO 1 NGÀY LÀM VIỆC]");
});
