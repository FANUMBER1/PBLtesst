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

test("DeviceOfflinePayloadSchema validates valid device_offline payloads matching specification", () => {
  const { DeviceOfflinePayloadSchema } = loadModule("../shared/schemas/index.ts");

  const validPayload = {
    event: "device_offline",
    device_id: "ESP32_MAIN_CONTROLLER",
    ip_address: "192.168.1.105",
    last_seen: "15 giây trước",
    mode: "realtime",
  };

  const parsed = DeviceOfflinePayloadSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "device_offline");
  assert.equal(parsed.data.device_id, "ESP32_MAIN_CONTROLLER");
  assert.equal(parsed.data.ip_address, "192.168.1.105");
  assert.equal(parsed.data.last_seen, "15 giây trước");
  assert.equal(parsed.data.mode, "realtime");
});

test("DeviceOfflinePayloadSchema fills default values when optional fields are omitted", () => {
  const { DeviceOfflinePayloadSchema } = loadModule("../shared/schemas/index.ts");

  const minimalPayload = {
    event: "device_offline",
  };

  const parsed = DeviceOfflinePayloadSchema.safeParse(minimalPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.device_id, "ESP32_MAIN_CONTROLLER");
  assert.equal(parsed.data.ip_address, "192.168.1.105");
  assert.equal(parsed.data.last_seen, "15 giây trước");
  assert.equal(parsed.data.mode, "realtime");
  assert.ok(parsed.data.timestamp);
});

test("DeviceOfflinePayloadSchema rejects invalid event codes", () => {
  const { DeviceOfflinePayloadSchema } = loadModule("../shared/schemas/index.ts");

  const invalidPayload = {
    event: "device_disconnected",
    device_id: "ESP32_MAIN_CONTROLLER",
  };

  const parsed = DeviceOfflinePayloadSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test("HeartbeatPayloadSchema validates valid heartbeat ping payloads", () => {
  const { HeartbeatPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const validHeartbeat = {
    event: "heartbeat",
    device_id: "ESP32_MAIN_CONTROLLER",
    uptime: 3600,
    wifi_rssi: -65,
    mode: "realtime",
  };

  const parsed = HeartbeatPayloadSchema.safeParse(validHeartbeat);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "heartbeat");
  assert.equal(parsed.data.device_id, "ESP32_MAIN_CONTROLLER");
  assert.equal(parsed.data.uptime, 3600);
  assert.equal(parsed.data.wifi_rssi, -65);
});

test("DEFAULT_MQTT_TOPICS includes HEARTBEAT on conveyor/heartbeat", () => {
  const { DEFAULT_MQTT_TOPICS } = loadModule("../shared/constants/index.ts");
  assert.equal(DEFAULT_MQTT_TOPICS.HEARTBEAT, "conveyor/heartbeat");
});

test("Watchdog 6-second timeout logic evaluates correctly for heartbeat intervals", () => {
  const HEARTBEAT_PING_INTERVAL_MS = 2000;
  const WATCHDOG_TIMEOUT_THRESHOLD_MS = 6000;

  // Case 1: Normal heartbeat received 2s ago -> Online
  const elapsedRecent = 2000;
  assert.equal(elapsedRecent > WATCHDOG_TIMEOUT_THRESHOLD_MS, false);

  // Case 2: Heartbeat received 5.9s ago -> Still within tolerance
  const elapsedNearThreshold = 5900;
  assert.equal(elapsedNearThreshold > WATCHDOG_TIMEOUT_THRESHOLD_MS, false);

  // Case 3: Heartbeat received > 6s ago (e.g. 6.1s or 15s) -> OFFLINE TRIGGERED
  const elapsedOffline = 6100;
  assert.equal(elapsedOffline > WATCHDOG_TIMEOUT_THRESHOLD_MS, true);

  const elapsedPromptSpec = 15000; // "15 giây trước"
  assert.equal(elapsedPromptSpec > WATCHDOG_TIMEOUT_THRESHOLD_MS, true);
});

test("SafetyService.triggerDeviceOffline creates ERROR notification and broadcasts via SSE", async () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  sseBroadcasts.length = 0;

  const result = SafetyService.triggerDeviceOffline({
    event: "device_offline",
    device_id: "ESP32_MAIN_CONTROLLER",
    ip_address: "192.168.1.105",
    last_seen: "15 giây trước",
    mode: "realtime",
  });

  assert.equal(result.success, true);
  assert.ok(result.notification);
  assert.equal(result.notification.severity, "error");
  assert.equal(result.notification.station_id, "ESP32_MAIN_CONTROLLER");
  assert.equal(
    result.notification.description,
    "[MẤT KẾT NỐI THIẾT BỊ] Vi điều khiển trung tâm (ESP32) đã ngoại tuyến! Dữ liệu cảm biến thời gian thực bị ngắt"
  );

  // Check SSE broadcast
  const lastBroadcast = sseBroadcasts[sseBroadcasts.length - 1];
  assert.ok(lastBroadcast);
  assert.equal(lastBroadcast.event, "device_offline");
  assert.equal(lastBroadcast.data.payload.device_id, "ESP32_MAIN_CONTROLLER");
  assert.equal(lastBroadcast.data.payload.ip_address, "192.168.1.105");
});

test("SafetyService.recoverDeviceOnline broadcasts SSE device_online event", async () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  sseBroadcasts.length = 0;

  const result = SafetyService.recoverDeviceOnline("ESP32_MAIN_CONTROLLER");

  assert.equal(result.success, true);
  assert.ok(result.message.includes("ESP32_MAIN_CONTROLLER"));

  const lastBroadcast = sseBroadcasts[sseBroadcasts.length - 1];
  assert.ok(lastBroadcast);
  assert.equal(lastBroadcast.event, "device_online");
  assert.equal(lastBroadcast.data.device_id, "ESP32_MAIN_CONTROLLER");
});

test("SafetyController.triggerDeviceOfflineAlert validates input and handles requests", async () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");

  const response = await SafetyController.triggerDeviceOfflineAlert({
    event: "device_offline",
    device_id: "ESP32_MAIN_CONTROLLER",
    ip_address: "192.168.1.105",
    last_seen: "15 giây trước",
    mode: "realtime",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  assert.equal(response.body.data.notification.severity, "error");
});

test("SafetyController.recordHeartbeat accepts valid ping payload", async () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");

  const response = await SafetyController.recordHeartbeat({
    event: "heartbeat",
    device_id: "ESP32_MAIN_CONTROLLER",
    uptime: 120,
    wifi_rssi: -58,
    mode: "realtime",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.device_id, "ESP32_MAIN_CONTROLLER");
});
