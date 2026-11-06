/**
 * Test suite: Kiểm thử Đồng bộ Dữ liệu và Thanh Trượt Điều Chỉnh Độ Rộng / Sức Chứa Khay (Bin Sliders Sync)
 * Xác minh:
 * 1. Logic cập nhật và lưu trữ localStorage (loadBinCapacitiesLocal, saveBinCapacitiesLocal) cho dung lượng tùy chỉnh (5 - 50 SP).
 * 2. Giới hạn clamp an toàn [5, 50] cho sức chứa từng khay.
 * 3. Logic cập nhật và lưu trữ localStorage (loadBinCountsLocal, saveBinCountsLocal) với giá trị 0 - 50 SP.
 * 4. Hook useSorterData tích hợp binCapacities, handleSetBinCapacity và handleSetBinCount.
 * 5. DashboardLayout cung cấp binCapacities, handleSetBinCapacity và handleSetBinCount qua DashboardContext.
 * 6. LiveHealthAndBinWidget tích hợp 3 thanh trượt điều chỉnh sức chứa định mức cho Khay 1, Khay 2, Khay 3.
 * 7. ConveyorVisualizer tích hợp 3 thanh trượt điều chỉnh độ rộng / sức chứa trên 3 máng trượt với nút preset 10, 30, 50 SP.
 * 8. ConfigAndDiagnostics tích hợp cụm thanh trượt điều chỉnh độ rộng / sức chứa định mức khay.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

// Mock LocalStorage environment for testing storage logic
const ts = require("typescript");

const historySource = readFileSync(join(__dirname, "../frontend/src/lib/history.ts"), "utf8");
const { outputText } = ts.transpileModule(historySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

const storageMap = new Map();
const mockLocalStorage = {
  getItem: (key) => storageMap.get(key) ?? null,
  setItem: (key, value) => storageMap.set(key, String(value)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

const historyExports = {};
new Function("exports", "window", "localStorage", outputText)(historyExports, {}, mockLocalStorage);

test("1. LocalStorage Bin Capacities Persistence: Lưu trữ và đồng bộ độ rộng / sức chứa tùy ý (5 - 50 SP) cho từng khay", () => {
  mockLocalStorage.clear();

  // Mặc định ban đầu khi chưa có lưu trữ
  const initial = historyExports.loadBinCapacitiesLocal(true);
  assert.equal(initial.bin1, 50, "Mặc định Khay 1 là 50 SP");
  assert.equal(initial.bin2, 50, "Mặc định Khay 2 là 50 SP");
  assert.equal(initial.bin3, 50, "Mặc định Khay 3 là 50 SP");

  // Kiểm tra lưu và đọc trạng thái sức chứa tùy chỉnh: Khay 1: 30 SP (ví dụ của người dùng), Khay 2: 20 SP, Khay 3: 40 SP
  const testCapacities = { bin1: 30, bin2: 20, bin3: 40 };
  historyExports.saveBinCapacitiesLocal(testCapacities, true);

  const loaded = historyExports.loadBinCapacitiesLocal(true);
  assert.equal(loaded.bin1, 30, "Khay 1 phải đạt định mức 30 SP (khi chỉnh 30 thì khay chứa tối đa 30 SP)");
  assert.equal(loaded.bin2, 20, "Khay 2 phải đạt định mức 20 SP");
  assert.equal(loaded.bin3, 40, "Khay 3 phải đạt định mức 40 SP");

  // Kiểm tra cập nhật riêng Khay 1 về 50 (Chuẩn)
  testCapacities.bin1 = 50;
  historyExports.saveBinCapacitiesLocal(testCapacities, true);
  const reloaded = historyExports.loadBinCapacitiesLocal(true);
  assert.equal(reloaded.bin1, 50, "Khay 1 phải cập nhật lại 50 SP");
  assert.equal(reloaded.bin2, 20, "Khay 2 vẫn giữ nguyên 20 SP");
});

test("2. Clamp logic: Giới hạn an toàn [5, 50] cho sức chứa khay khi thanh trượt nhận giá trị vượt biên", () => {
  mockLocalStorage.clear();

  // Test clamp dưới 5 SP
  historyExports.saveBinCapacitiesLocal({ bin1: 2, bin2: -5, bin3: 0 }, true);
  const loadedLow = historyExports.loadBinCapacitiesLocal(true);
  assert.equal(loadedLow.bin1, 5, "Khay 1 phải được clamp tối thiểu 5 SP");
  assert.equal(loadedLow.bin2, 5, "Khay 2 phải được clamp tối thiểu 5 SP");
  assert.equal(loadedLow.bin3, 5, "Khay 3 phải được clamp tối thiểu 5 SP");

  // Test clamp trên 50 SP
  historyExports.saveBinCapacitiesLocal({ bin1: 80, bin2: 120, bin3: 50 }, true);
  const loadedHigh = historyExports.loadBinCapacitiesLocal(true);
  assert.equal(loadedHigh.bin1, 50, "Khay 1 phải được clamp tối đa 50 SP");
  assert.equal(loadedHigh.bin2, 50, "Khay 2 phải được clamp tối đa 50 SP");
});

test("3. LocalStorage Bin Counts Persistence: Lưu trữ và đồng bộ mức số lượng hiện tại (0 - 50 SP) cho từng khay", () => {
  mockLocalStorage.clear();

  const testCounts = { bin1: 15, bin2: 30, bin3: 45 };
  historyExports.saveBinCountsLocal(testCounts, true);

  const loaded = historyExports.loadBinCountsLocal(true);
  assert.equal(loaded.bin1, 15, "Khay 1 phải đạt 15 SP");
  assert.equal(loaded.bin2, 30, "Khay 2 phải đạt 30 SP");
  assert.equal(loaded.bin3, 45, "Khay 3 phải đạt 45 SP");
});

test("4. Source Code Contract: useSorterData export binCapacities và handleSetBinCapacity", () => {
  const hookSource = readFileSync(join(__dirname, "../frontend/src/hooks/useSorterData.ts"), "utf8");

  assert.ok(hookSource.includes("handleSetBinCapacity"), "useSorterData phải định nghĩa handleSetBinCapacity");
  assert.ok(hookSource.includes("saveBinCapacitiesLocal"), "handleSetBinCapacity phải lưu vào localStorage");
  assert.ok(hookSource.includes("binCapacities,"), "useSorterData phải export binCapacities");
  assert.ok(hookSource.includes("handleSetBinCapacity,"), "useSorterData phải export handleSetBinCapacity");
  assert.ok(hookSource.includes("newCount >= targetCapacity"), "handleItemSorted phải so sánh với targetCapacity động");
});

test("5. Source Code Contract: DashboardLayout cung cấp binCapacities và handleSetBinCapacity qua Context", () => {
  const layoutSource = readFileSync(join(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx"), "utf8");

  assert.ok(layoutSource.includes("binCapacities: BinCapacities;"), "DashboardState phải khai báo binCapacities");
  assert.ok(layoutSource.includes("handleSetBinCapacity: (binIndex: 1 | 2 | 3, capacity: number) => void;"), "DashboardState phải khai báo handleSetBinCapacity");
  assert.ok(layoutSource.includes("binCapacitiesRef:"), "DashboardLayout phải truyền binCapacitiesRef vào useConveyorPhysics");
  assert.ok(layoutSource.includes("binCapacities:"), "DashboardContext phải cung cấp binCapacities");
  assert.ok(layoutSource.includes("handleSetBinCapacity,"), "DashboardContext phải cung cấp handleSetBinCapacity");
});

test("6. Source Code Contract: LiveHealthAndBinWidget tích hợp 3 thanh trượt điều chỉnh sức chứa định mức cho từng khay", () => {
  const widgetSource = readFileSync(join(__dirname, "../frontend/src/components/overview/LiveHealthAndBinWidget.tsx"), "utf8");

  assert.ok(widgetSource.includes("binCapacities?:"), "LiveHealthAndBinWidgetProps phải nhận binCapacities");
  assert.ok(widgetSource.includes("onSetBinCapacity?: (binIndex: 1 | 2 | 3, capacity: number) => void;"), "LiveHealthAndBinWidgetProps phải nhận onSetBinCapacity");
  assert.ok(widgetSource.includes("Sức chứa Khay 1:"), "Phải có nhãn Sức chứa Khay 1");
  assert.ok(widgetSource.includes("Sức chứa Khay 2:"), "Phải có nhãn Sức chứa Khay 2");
  assert.ok(widgetSource.includes("Sức chứa Khay 3:"), "Phải có nhãn Sức chứa Khay 3");
  assert.ok(widgetSource.includes('type="range"'), "Phải sử dụng thẻ range slider");
  assert.ok(widgetSource.includes("10 SP"), "Phải có nút preset 10 SP");
  assert.ok(widgetSource.includes("30 SP"), "Phải có nút preset 30 SP");
  assert.ok(widgetSource.includes("50 SP (Chuẩn)"), "Phải có nút preset 50 SP (Chuẩn)");
});

test("7. Source Code Contract: ConveyorVisualizer tích hợp 3 thanh trượt điều chỉnh độ rộng / sức chứa trên 3 máng trượt", () => {
  const visualizerSource = readFileSync(join(__dirname, "../frontend/src/components/ConveyorVisualizer.tsx"), "utf8");

  assert.ok(visualizerSource.includes("binCapacities?: { bin1: number; bin2: number; bin3: number };"), "ConveyorVisualizerProps phải nhận binCapacities");
  assert.ok(visualizerSource.includes("onSetBinCapacity?: (binIndex: 1 | 2 | 3, capacity: number) => void;"), "ConveyorVisualizerProps phải nhận onSetBinCapacity");
  assert.ok(visualizerSource.includes("Độ rộng / Sức chứa khay:"), "Phải có nhãn Độ rộng / Sức chứa khay");
  assert.ok(visualizerSource.includes("30 SP"), "Phải có preset 30 SP");
  assert.ok(visualizerSource.includes("e.stopPropagation()"), "Thanh trượt phải chặn bubble sự kiện để không mở nhầm dialog dọn khay");
  assert.ok(visualizerSource.includes("binCounts.bin1 >= cap1"), "Máng 1 phải so sánh với cap1 động");
  assert.ok(visualizerSource.includes("binCounts.bin2 >= cap2"), "Máng 2 phải so sánh với cap2 động");
  assert.ok(visualizerSource.includes("binCounts.bin3 >= cap3"), "Khay 3 phải so sánh với cap3 động");
});

test("8. Source Code Contract: ConfigAndDiagnostics tích hợp cụm thanh trượt điều chỉnh độ rộng / sức chứa định mức", () => {
  const configSource = readFileSync(join(__dirname, "../frontend/src/components/ConfigAndDiagnostics.tsx"), "utf8");

  assert.ok(configSource.includes("binCapacities?: { bin1: number; bin2: number; bin3: number };"), "ConfigAndDiagnosticsProps phải nhận binCapacities");
  assert.ok(configSource.includes("onSetBinCapacity?: (binIndex: 1 | 2 | 3, capacity: number) => void;"), "ConfigAndDiagnosticsProps phải nhận onSetBinCapacity");
  assert.ok(configSource.includes("Độ Rộng / Sức Chứa Định Mức Khay:"), "Phải có tiêu đề nhóm thanh trượt sức chứa định mức");
  assert.ok(configSource.includes("cap1"), "Phải sử dụng cap1 động cho Khay 1");
  assert.ok(configSource.includes("cap2"), "Phải sử dụng cap2 động cho Khay 2");
  assert.ok(configSource.includes("cap3"), "Phải sử dụng cap3 động cho Khay 3");
});
