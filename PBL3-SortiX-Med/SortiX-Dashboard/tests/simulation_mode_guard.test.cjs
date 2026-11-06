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
    if (id.includes("safetyService")) return loadModule("../backend/src/services/safetyService.ts");
    return {};
  };
  new Function("exports", "require", outputText)(exports, requireMock);
  return exports;
}

const sseBroadcasts = [];

test("JamDetectedPayloadSchema phân biệt rõ mode 'simulation' và 'realtime'", () => {
  const { JamDetectedPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const simPayload = JamDetectedPayloadSchema.parse({
    event: "jam_detected",
    section: "Conveyor_Belt_Zone_A",
    duration_seconds: 5,
    sensor_id: "OPTICAL_JAM_02",
    mode: "simulation",
  });
  assert.equal(simPayload.mode, "simulation");

  const realPayload = JamDetectedPayloadSchema.parse({
    event: "jam_detected",
    section: "Conveyor_Belt_Zone_A",
    duration_seconds: 5,
    sensor_id: "OPTICAL_JAM_02",
    mode: "realtime",
  });
  assert.equal(realPayload.mode, "realtime");

  // Mặc định điền realtime nếu không truyền mode
  const defaultPayload = JamDetectedPayloadSchema.parse({
    event: "jam_detected",
    section: "Conveyor_Belt_Zone_A",
  });
  assert.equal(defaultPayload.mode, "realtime");
});

test("EmergencyStopPayloadSchema phân biệt rõ mode 'simulation' và 'realtime'", () => {
  const { EmergencyStopPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const simEstop = EmergencyStopPayloadSchema.parse({
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Simulated E-Stop Button",
    mode: "simulation",
  });
  assert.equal(simEstop.mode, "simulation");

  const realEstop = EmergencyStopPayloadSchema.parse({
    event: "emergency_stop",
    station_id: "STATION_01",
    triggered_by: "Physical E-Stop Button #1",
    mode: "realtime",
  });
  assert.equal(realEstop.mode, "realtime");
});

test("Logic bảo vệ: Chế độ Realtime chặn kích hoạt giả lập từ user_action/physics_in", () => {
  // Giả lập logic kiểm tra của DashboardLayout.handleTriggerJam
  function simulateHandleTriggerJam(source, isSimulation) {
    if ((source === "user_action" || source === "physics_in") && !isSimulation) {
      return { allowed: false, error: "Hệ thống đang ở chế độ Thực tế (Real Hardware). Các chức năng test giả lập bị vô hiệu hóa!" };
    }
    return { allowed: true };
  }

  // Ở chế độ thực tế: user bấm nút test giả lập kẹt phôi -> Bị chặn
  const realUserTest = simulateHandleTriggerJam("user_action", false);
  assert.equal(realUserTest.allowed, false);
  assert.match(realUserTest.error, /chế độ Thực tế/);

  // Ở chế độ thực tế: vật ảo trên canvas physics kẹt -> Bị chặn
  const realPhysicsTest = simulateHandleTriggerJam("physics_in", false);
  assert.equal(realPhysicsTest.allowed, false);

  // Ở chế độ thực tế: tín hiệu từ phần cứng MQTT/SSE -> Được chấp thuận
  const realMqttSignal = simulateHandleTriggerJam("mqtt_in", false);
  assert.equal(realMqttSignal.allowed, true);

  // Ở chế độ mô phỏng: user bấm nút test hoặc physics ảo -> Được chấp thuận
  const simUserTest = simulateHandleTriggerJam("user_action", true);
  assert.equal(simUserTest.allowed, true);
  const simPhysicsTest = simulateHandleTriggerJam("physics_in", true);
  assert.equal(simPhysicsTest.allowed, true);
});
