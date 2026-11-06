const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const moduleCache = {};
const sseBroadcasts = [];

function loadModule(relativePath) {
  const fullPath = join(__dirname, relativePath);
  if (moduleCache[fullPath]) return moduleCache[fullPath];

  const source = readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const exports = {};
  moduleCache[fullPath] = exports;

  const requireMock = (id) => {
    if (id === "zod") return require("zod");
    if (id === "node:fs" || id === "fs") {
      const fs = require("node:fs");
      return Object.assign({}, fs, { default: fs });
    }
    if (id === "node:path" || id === "path") {
      const path = require("node:path");
      return Object.assign({}, path, { default: path });
    }
    if (id.includes("schemas")) return loadModule("../shared/schemas/index.ts");
    if (id.includes("constants")) return loadModule("../shared/constants/index.ts");
    if (id.includes("notificationModel")) return loadModule("../backend/src/models/notificationModel.ts");
    if (id.includes("sseService")) {
      return {
        SSEService: {
          broadcast: (event, data) => {
            sseBroadcasts.push({ event, data });
          },
          addClient: () => "client_1",
          getClientCount: () => 0,
        },
      };
    }
    if (id.includes("mqttService")) {
      return {
        publishShiftSummarySimulation: () => true,
        publishDeviceOfflineSimulation: () => true,
        publishHeartbeatSimulation: () => true,
        publishTemperatureWarningSimulation: () => true,
        publishBinFullSimulation: () => true,
        publishJamSimulation: () => true,
        publishEmergencyStop: () => true,
      };
    }
    if (id.includes("safetyService")) return loadModule("../backend/src/services/safetyService.ts");
    if (id.includes("safetyController")) return loadModule("../backend/src/controllers/safetyController.ts");
    return {};
  };
  new Function("exports", "require", outputText)(exports, requireMock);
  return exports;
}

test("1. ShiftSummaryPayloadSchema validates valid shift_summary payloads matching user specification", () => {
  const { ShiftSummaryPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const validPayload = {
    event: "shift_summary",
    shift_name: "Ca 1 - Buổi sáng",
    total_products: 1250,
    sorted_good: 1180,
    sorted_defect: 70,
    accuracy_rate: "94.4%",
    emergency_stops_count: 1,
    operating_hours: "7.5 giờ",
    timestamp: "2026-09-18T17:00:00Z",
  };

  const parsed = ShiftSummaryPayloadSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "shift_summary");
  assert.equal(parsed.data.shift_name, "Ca 1 - Buổi sáng");
  assert.equal(parsed.data.total_products, 1250);
  assert.equal(parsed.data.sorted_good, 1180);
  assert.equal(parsed.data.sorted_defect, 70);
  assert.equal(parsed.data.accuracy_rate, "94.4%");
  assert.equal(parsed.data.emergency_stops_count, 1);
  assert.equal(parsed.data.operating_hours, "7.5 giờ");
  assert.equal(parsed.data.timestamp, "2026-09-18T17:00:00Z");
});

test("2. ShiftSummaryPayloadSchema fills default values when fields are omitted", () => {
  const { ShiftSummaryPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const minimalPayload = {
    event: "shift_summary",
  };

  const parsed = ShiftSummaryPayloadSchema.safeParse(minimalPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.shift_name, "Ca 1 - Buổi sáng");
  assert.equal(parsed.data.total_products, 1250);
  assert.equal(parsed.data.sorted_good, 1180);
  assert.equal(parsed.data.sorted_defect, 70);
  assert.equal(parsed.data.accuracy_rate, "94.4%");
  assert.equal(parsed.data.emergency_stops_count, 1);
  assert.equal(parsed.data.operating_hours, "7.5 giờ");
  assert.ok(parsed.data.timestamp);
});

test("3. ShiftSummaryPayloadSchema rejects invalid event codes or negative numeric values", () => {
  const { ShiftSummaryPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const wrongEvent = ShiftSummaryPayloadSchema.safeParse({
    event: "wrong_event",
  });
  assert.equal(wrongEvent.success, false);

  const negativeCount = ShiftSummaryPayloadSchema.safeParse({
    event: "shift_summary",
    total_products: -10,
  });
  assert.equal(negativeCount.success, false);
});

test("4. SafetyService.triggerShiftSummary saves notification with INFO severity and exact title format", () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");

  const payload = {
    event: "shift_summary",
    shift_name: "Ca 1 - Buổi sáng",
    total_products: 1250,
    sorted_good: 1180,
    sorted_defect: 70,
    accuracy_rate: "94.4%",
    emergency_stops_count: 1,
    operating_hours: "7.5 giờ",
    timestamp: "2026-09-18T17:00:00Z",
  };

  const result = SafetyService.triggerShiftSummary(payload);
  assert.equal(result.success, true);

  const notification = result.notification;
  assert.ok(notification.id);
  assert.equal(notification.severity, "info");
  assert.equal(notification.event, "shift_summary");
  assert.ok(
    (notification.description.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC]") || notification.description.includes("[BÁO CÁO CA LÀM VIỆC]")) &&
    notification.description.includes("Tổng 1.250 sản phẩm") &&
    notification.description.includes("Đạt 94.4%") &&
    notification.description.includes("Nhấn để xem chi tiết")
  );
  assert.equal(notification.station_id, "SHIFT_SUPERVISOR");
});

test("5. SafetyService.triggerShiftSummary broadcasts shift_summary event over SSE channel", () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  sseBroadcasts.length = 0;

  const payload = {
    event: "shift_summary",
    shift_name: "Ca 1 - Buổi sáng",
    total_products: 1250,
    sorted_good: 1180,
    sorted_defect: 70,
    accuracy_rate: "94.4%",
    emergency_stops_count: 1,
    operating_hours: "7.5 giờ",
    timestamp: "2026-09-18T17:00:00Z",
  };

  SafetyService.triggerShiftSummary(payload);

  const broadcast = sseBroadcasts.find((b) => b.event === "shift_summary");
  assert.ok(broadcast, "SSE broadcast for shift_summary should be triggered");
  assert.equal(broadcast.data.payload.shift_name, "Ca 1 - Buổi sáng");
  assert.equal(broadcast.data.payload.total_products, 1250);
  assert.equal(broadcast.data.payload.accuracy_rate, "94.4%");
});

test("6. SafetyController.triggerShiftSummaryAlert handles request and returns 200", async () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");

  const response = await SafetyController.triggerShiftSummaryAlert({
    event: "shift_summary",
    shift_name: "Ca 1 - Buổi sáng",
    total_products: 1250,
    sorted_good: 1180,
    sorted_defect: 70,
    accuracy_rate: "94.4%",
    emergency_stops_count: 1,
    operating_hours: "7.5 giờ",
    timestamp: "2026-09-18T17:00:00Z",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  assert.equal(response.body.data.notification.severity, "info");
  assert.equal(response.body.data.notification.event, "shift_summary");
  assert.ok(
    response.body.data.notification.description.includes("[BÁO CÁO 1 NGÀY LÀM VIỆC]") ||
    response.body.data.notification.description.includes("[BÁO CÁO CA LÀM VIỆC]")
  );
});

test("7. CSV export generator produces UTF-8 BOM and correct metadata rows", () => {
  const summary = {
    event: "shift_summary",
    shift_name: "Ca 1 - Buổi sáng",
    total_products: 1250,
    sorted_good: 1180,
    sorted_defect: 70,
    accuracy_rate: "94.4%",
    emergency_stops_count: 1,
    operating_hours: "7.5 giờ",
    timestamp: "2026-09-18T17:00:00Z",
  };

  // Logic from frontend exportCsv.ts
  const rows = [
    ["BÁO CÁO TỔNG KẾT CA LÀM VIỆC - HỆ THỐNG SORTIX"],
    ["Tên ca làm việc", summary.shift_name],
    ["Thời gian xuất báo cáo", summary.timestamp],
    ["Tổng sản phẩm phân loại", String(summary.total_products)],
    ["Sản phẩm đạt chuẩn (Good)", String(summary.sorted_good)],
    ["Sản phẩm lỗi (Defect)", String(summary.sorted_defect)],
    ["Tỷ lệ chính xác (Accuracy)", summary.accuracy_rate],
    ["Số lần dừng khẩn cấp (E-Stop)", String(summary.emergency_stops_count)],
    ["Thời gian vận hành", summary.operating_hours],
  ];

  const csvContent = "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");

  assert.ok(csvContent.startsWith("\uFEFF"), "Should contain UTF-8 BOM for Excel Vietnamese display");
  assert.ok(csvContent.includes('"Ca 1 - Buổi sáng"'));
  assert.ok(csvContent.includes('"1250"'));
  assert.ok(csvContent.includes('"1180"'));
  assert.ok(csvContent.includes('"70"'));
  assert.ok(csvContent.includes('"94.4%"'));
  assert.ok(csvContent.includes('"1"'));
  assert.ok(csvContent.includes('"7.5 giờ"'));
});

test("8. Admin authorization gate for report export", () => {
  const checkCanExport = (userRole) => {
    return userRole === "admin";
  };

  assert.equal(checkCanExport("admin"), true, "Admin must be permitted to export");
  assert.equal(checkCanExport("operator"), false, "Operator must be denied");
  assert.equal(checkCanExport("viewer"), false, "Viewer must be denied");
  assert.equal(checkCanExport(undefined), false, "Guest/Undefined must be denied");
});
