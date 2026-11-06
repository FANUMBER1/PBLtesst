const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const moduleCache = {};

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
    if (id === "node:http" || id === "http") return require("node:http");
    if (id === "mqtt") return { connect: () => ({ on: () => {}, subscribe: () => {}, publish: () => {} }) };
    if (id.includes("schemas")) return loadModule("../shared/schemas/index.ts");
    if (id.includes("constants")) return loadModule("../shared/constants/index.ts");
    if (id.includes("notificationModel")) return loadModule("../backend/src/models/notificationModel.ts");
    if (id.includes("sseService")) {
      return {
        SSEService: {
          broadcast: () => {},
          addClient: () => "client_1",
          getClientCount: () => 0,
        },
      };
    }
    if (id.includes("safetyService")) return loadModule("../backend/src/services/safetyService.ts");
    if (id.includes("mqttService")) {
      return {
        publishEstopSimulation: () => {},
        initBackendMQTT: () => {},
      };
    }
    if (id.includes("safetyController")) return loadModule("../backend/src/controllers/safetyController.ts");
    return {};
  };
  new Function("exports", "require", outputText)(exports, requireMock);
  return exports;
}

test("EmergencyStopPayloadSchema kiểm tra hợp lệ payload phần cứng và chế độ simulation", () => {
  const schemas = loadModule("../shared/schemas/index.ts");

  // 1. Hardware payload tiêu chuẩn từ đề bài
  const hardwarePayload = {
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    timestamp: "2026-09-18T10:15:30Z",
    mode: "realtime",
  };

  const parsedHw = schemas.EmergencyStopPayloadSchema.parse(hardwarePayload);
  assert.equal(parsedHw.event, "emergency_stop");
  assert.equal(parsedHw.station_id, "STATION_01");
  assert.equal(parsedHw.triggered_by, "Physical E-Stop Button #1");
  assert.equal(parsedHw.mode, "realtime");

  // 2. Simulation payload
  const simPayload = {
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Nút bấm giả lập Dashboard",
    timestamp: "2026-09-18T10:16:00Z",
    mode: "simulation",
  };
  const parsedSim = schemas.EmergencyStopPayloadSchema.parse(simPayload);
  assert.equal(parsedSim.mode, "simulation");

  // 3. Từ chối event không phải emergency_stop
  assert.throws(() => {
    schemas.EmergencyStopPayloadSchema.parse({
      event: "motor_stall",
      station_id: "STATION_01",
      triggered_by: "sensor",
      timestamp: "2026-09-18T10:15:30Z",
      mode: "realtime",
    });
  });
});

test("NotificationModel lưu trữ sự cố dừng khẩn cấp vào bảng notifications với status = unprocessed và severity = critical", () => {
  const { NotificationModel } = loadModule("../backend/src/models/notificationModel.ts");
  NotificationModel.clear();

  const record = NotificationModel.add({
    event: "emergency_stop",
    severity: "critical",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    description: "[NGUY HIỂM] NÚT DỪNG KHẨN CẤP ĐÃ ĐƯỢC KÍCH HOẠT TẠI TRẠM 01! BĂNG CHUYỀN ĐÃ NGẮT TOÀN BỘ.",
    timestamp: "2026-09-18T10:15:30Z",
    mode: "realtime",
    status: "unprocessed",
  });

  assert.ok(record.id.startsWith("notif_"));
  assert.equal(record.severity, "critical");
  assert.equal(record.status, "unprocessed");
  assert.equal(record.event, "emergency_stop");

  const unprocessed = NotificationModel.getUnprocessed();
  assert.equal(unprocessed.length, 1);
  assert.equal(unprocessed[0].id, record.id);
});

test("SafetyService: Kích hoạt E-Stop chuyển hệ thống sang SYSTEM_LOCKED và ghi nhận sự cố", () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  const { NotificationModel } = loadModule("../backend/src/models/notificationModel.ts");
  NotificationModel.clear();
  SafetyService.resetForTesting();

  assert.equal(SafetyService.isLocked(), false);

  const payload = {
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    timestamp: "2026-09-18T10:15:30Z",
    mode: "realtime",
  };

  const result = SafetyService.triggerEmergencyStop(payload);
  assert.equal(result.success, true);
  assert.equal(result.status, "SYSTEM_LOCKED");
  assert.equal(SafetyService.isLocked(), true);

  const status = SafetyService.getStatus();
  assert.equal(status.status, "SYSTEM_LOCKED");
  assert.equal(status.is_locked, true);
  assert.equal(status.active_incident?.station_id, "STATION_01");
  assert.ok(status.last_notification?.description.includes("NGUY HIỂM"));
});

test("BẢO MẬT & PHÂN QUYỀN: Chỉ tài khoản Quản trị viên (Admin) mới có quyền mở khóa hệ thống sau E-Stop", () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  SafetyService.resetForTesting();

  // Kích hoạt E-Stop trước
  const estopRes = SafetyController.triggerEmergencyStop({
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    timestamp: "2026-09-18T10:15:30Z",
    mode: "realtime",
  });
  assert.equal(estopRes.status, 200);
  assert.equal(SafetyService.isLocked(), true);

  // 1. Tài khoản User / Operator cố tình mở khóa -> Phải bị chặn 403 Forbidden
  const operatorUser = { userId: "usr-002", username: "operator1", role: "user" };
  const userResult = SafetyController.unlockSystem(operatorUser, { note: "Thử mở khóa" });
  assert.equal(userResult.status, 403);
  assert.equal(userResult.body.success, false);
  assert.equal(SafetyService.isLocked(), true);

  // 2. Tài khoản Admin mở khóa -> Cho phép 200 OK, phục hồi OPERATIONAL
  const adminUser = { userId: "admin-001", username: "admin1", role: "admin" };
  const adminResult = SafetyController.unlockSystem(adminUser, { note: "Đã kiểm tra an toàn hiện trường" });
  assert.equal(adminResult.status, 200);
  assert.equal(adminResult.body.success, true);
  assert.equal(SafetyService.isLocked(), false);
  assert.equal(SafetyService.getStatus().status, "OPERATIONAL");
});

test("CHỐNG KẸT THÔNG BÁO: Bỏ qua tín hiệu E-Stop trễ trong thời gian ân hạn sau khi Admin đã mở khóa", () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  SafetyService.resetForTesting();

  // Kích hoạt E-Stop
  SafetyService.triggerEmergencyStop({
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    timestamp: "2026-09-18T10:15:30Z",
    mode: "realtime",
  });
  assert.equal(SafetyService.isLocked(), true);

  // Admin mở khóa thành công
  SafetyService.unlockSystem("admin1", "Hiện trường an toàn");
  assert.equal(SafetyService.isLocked(), false);

  // Gói tin E-Stop trễ từ MQTT broker ngay lập tức dội về trong vòng < 2.5s
  SafetyService.triggerEmergencyStop({
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    timestamp: "2026-09-18T10:15:30Z",
    mode: "realtime",
  });

  // Hệ thống PHẢI giữ nguyên trạng thái OPERATIONAL, không bị khóa lại hay kẹt còi
  assert.equal(SafetyService.isLocked(), false);
  assert.equal(SafetyService.getStatus().status, "OPERATIONAL");
});

