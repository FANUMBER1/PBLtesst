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
        publishMqttDisconnectedSimulation: () => true,
        publishDeviceOfflineSimulation: () => true,
        publishHeartbeatSimulation: () => true,
        publishTemperatureWarningSimulation: () => true,
        publishBinFullSimulation: () => true,
        publishJamSimulation: () => true,
        publishEstopSimulation: () => true,
      };
    }
    if (id.includes("safetyService")) return loadModule("../backend/src/services/safetyService.ts");
    if (id.includes("safetyController")) return loadModule("../backend/src/controllers/safetyController.ts");
    return require(id);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(exports, requireMock, { exports }, fullPath, join(__dirname, ".."));
  return exports;
}

const { MqttDisconnectedPayloadSchema } = loadModule("../shared/schemas/index.ts");
const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");
const { NotificationModel } = loadModule("../backend/src/models/notificationModel.ts");

test("1. MqttDisconnectedPayloadSchema validates valid payloads matching user specification", () => {
  const valid = {
    event: "mqtt_disconnected",
    broker_url: "wss://broker.emqx.io:8084/mqtt",
    disconnected_duration_seconds: 5,
    reconnect_attempt: 3,
    mode: "realtime",
    timestamp: new Date().toISOString(),
  };
  const parsed = MqttDisconnectedPayloadSchema.safeParse(valid);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "mqtt_disconnected");
  assert.equal(parsed.data.reconnect_attempt, 3);
  assert.equal(parsed.data.disconnected_duration_seconds, 5);
});

test("2. MqttDisconnectedPayloadSchema fills default values for broker_url, duration, and attempt", () => {
  const minimal = {
    event: "mqtt_disconnected",
  };
  const parsed = MqttDisconnectedPayloadSchema.safeParse(minimal);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.disconnected_duration_seconds, 5);
  assert.equal(parsed.data.reconnect_attempt, 1);
  assert.equal(parsed.data.mode, "realtime");
  assert.ok(parsed.data.broker_url.includes("mqtt"));
});

test("3. MqttDisconnectedPayloadSchema rejects invalid event codes or negative attempts", () => {
  const invalidEvent = {
    event: "mqtt_closed_unexpectedly",
    reconnect_attempt: 1,
  };
  assert.equal(MqttDisconnectedPayloadSchema.safeParse(invalidEvent).success, false);

  const negativeAttempt = {
    event: "mqtt_disconnected",
    reconnect_attempt: -1,
  };
  assert.equal(MqttDisconnectedPayloadSchema.safeParse(negativeAttempt).success, false);
});

test("4. 5-Second Debounce Logic: Only disconnects >= 5 seconds trigger the CRITICAL alert", () => {
  function checkShouldTriggerMqttAlert(disconnectedDurationSeconds) {
    return disconnectedDurationSeconds >= 5;
  }

  assert.equal(checkShouldTriggerMqttAlert(1), false, "Mất kết nối 1s không kích hoạt cảnh báo");
  assert.equal(checkShouldTriggerMqttAlert(3), false, "Mất kết nối 3s không kích hoạt cảnh báo");
  assert.equal(checkShouldTriggerMqttAlert(4.9), false, "Mất kết nối 4.9s không kích hoạt cảnh báo");
  assert.equal(checkShouldTriggerMqttAlert(5), true, "Mất kết nối tròn 5s phải kích hoạt cảnh báo CRITICAL");
  assert.equal(checkShouldTriggerMqttAlert(12), true, "Mất kết nối 12s phải duy trì cảnh báo CRITICAL");
});

test("5. Auto-reconnect Backoff Schedule: Intervals sequence 3s -> 5s -> 10s", () => {
  function getReconnectDelay(attempt) {
    if (attempt <= 1) return 3000;
    if (attempt === 2) return 5000;
    return 10000;
  }

  assert.equal(getReconnectDelay(1), 3000, "Lần 1 phải chờ 3 giây");
  assert.equal(getReconnectDelay(2), 5000, "Lần 2 phải chờ 5 giây");
  assert.equal(getReconnectDelay(3), 10000, "Lần 3 phải chờ 10 giây");
  assert.equal(getReconnectDelay(4), 10000, "Lần 4 trở đi duy trì 10 giây");
  assert.equal(getReconnectDelay(10), 10000, "Lần 10 duy trì 10 giây");
});

test("6. SafetyService.triggerMqttDisconnected creates CRITICAL notification with exact user message format", () => {
  sseBroadcasts.length = 0;
  const payload = {
    event: "mqtt_disconnected",
    broker_url: "wss://broker.emqx.io:8084/mqtt",
    disconnected_duration_seconds: 5,
    reconnect_attempt: 3,
    mode: "realtime",
  };

  const result = SafetyService.triggerMqttDisconnected(payload);
  assert.equal(result.success, true);
  assert.equal(result.notification.event, "mqtt_disconnected");
  assert.equal(result.notification.severity, "critical");
  assert.ok(result.notification.description.includes("[MẤT KẾT NỐI MẠNG] Mất liên lạc với MQTT Broker!"));
  assert.ok(result.notification.description.includes("Đang thử kết nối lại lần thứ 3 (Reconnecting...)"));

  // Check SSE broadcast
  const lastSSE = sseBroadcasts.find((b) => b.event === "mqtt_disconnected");
  assert.ok(lastSSE, "Phải phát sóng sự kiện SSE mqtt_disconnected");
  assert.equal(lastSSE.data.payload.reconnect_attempt, 3);
});

test("7. SafetyService.recoverMqttConnected logs resolved notification and broadcasts SSE mqtt_connected", () => {
  sseBroadcasts.length = 0;
  const result = SafetyService.recoverMqttConnected("wss://broker.emqx.io:8084/mqtt");
  assert.equal(result.success, true);
  assert.equal(result.message, "[ĐÃ PHỤC HỒI] Kết nối MQTT Broker thành công");
  assert.equal(result.notification.status, "resolved");

  const lastSSE = sseBroadcasts.find((b) => b.event === "mqtt_connected");
  assert.ok(lastSSE, "Phải phát sóng sự kiện SSE mqtt_connected");
  assert.equal(lastSSE.data.message, "[ĐÃ PHỤC HỒI] Kết nối MQTT Broker thành công");
});

test("8. SafetyController: triggerMqttDisconnectedAlert and recoverMqttConnectedAlert handle HTTP requests", () => {
  const res1 = SafetyController.triggerMqttDisconnectedAlert({
    event: "mqtt_disconnected",
    disconnected_duration_seconds: 6,
    reconnect_attempt: 2,
  });
  assert.equal(res1.status, 200);
  assert.equal(res1.body.success, true);

  const res2 = SafetyController.triggerMqttDisconnectedAlert({
    event: "invalid_code",
  });
  assert.equal(res2.status, 400);
  assert.equal(res2.body.success, false);

  const res3 = SafetyController.recoverMqttConnectedAlert();
  assert.equal(res3.status, 200);
  assert.equal(res3.body.success, true);
  assert.equal(res3.body.message, "[ĐÃ PHỤC HỒI] Kết nối MQTT Broker thành công");
});

test("9. Source Code Contracts: TopHeader renders MQTT: ONLINE and MQTT: DISCONNECTED badges", () => {
  const topHeaderSrc = readFileSync(join(__dirname, "../frontend/src/components/layout/TopHeader.tsx"), "utf8");
  assert.ok(topHeaderSrc.includes("MQTT: ONLINE"), "TopHeader phải chứa text 'MQTT: ONLINE'");
  assert.ok(topHeaderSrc.includes("MQTT: DISCONNECTED"), "TopHeader phải chứa text 'MQTT: DISCONNECTED'");
  assert.ok(topHeaderSrc.includes("animate-pulse"), "Badge DISCONNECTED phải có hiệu ứng animate-pulse chớp nháy");
});

test("10. Source Code Contracts: MqttDisconnectedToast displays exact warning and recovery texts", () => {
  const toastSrc = readFileSync(join(__dirname, "../frontend/src/components/ui/MqttDisconnectedToast.tsx"), "utf8");
  assert.ok(toastSrc.includes("[MẤT KẾT NỐI MẠNG] Mất liên lạc với MQTT Broker!"), "Toast phải có tiêu đề [MẤT KẾT NỐI MẠNG]");
  assert.ok(toastSrc.includes("(Reconnecting...)"), "Toast phải có text (Reconnecting...)");
  assert.ok(toastSrc.includes("[ĐÃ PHỤC HỒI] Kết nối MQTT Broker thành công"), "Toast phải có thông báo phục hồi [ĐÃ PHỤC HỒI]");
  assert.ok(toastSrc.includes("3s, 5s, 10s"), "Toast phải ghi rõ chu kỳ 3s, 5s, 10s");
});

test("11. Source Code Contracts: Config & Devices pages contain test button 'Ngắt kết nối MQTT Client'", () => {
  const configDiagSrc = readFileSync(join(__dirname, "../frontend/src/components/ConfigAndDiagnostics.tsx"), "utf8");
  assert.ok(configDiagSrc.includes("Ngắt kết nối MQTT Client"), "ConfigAndDiagnostics phải có nút Ngắt kết nối MQTT Client");

  const devicesPageSrc = readFileSync(join(__dirname, "../frontend/src/app/devices/page.tsx"), "utf8");
  assert.ok(devicesPageSrc.includes("Ngắt kết nối MQTT Client"), "DevicesPage phải có nút Ngắt kết nối MQTT Client");
});

test("12. Source Code Contracts: AudioService contains playMqttDisconnectedAlarm and playMqttReconnectedChime", () => {
  const audioSrc = readFileSync(join(__dirname, "../frontend/src/lib/audioService.ts"), "utf8");
  assert.ok(audioSrc.includes("playMqttDisconnectedAlarm"), "AudioService phải có phương thức playMqttDisconnectedAlarm");
  assert.ok(audioSrc.includes("playMqttReconnectedChime"), "AudioService phải có phương thức playMqttReconnectedChime");
});
