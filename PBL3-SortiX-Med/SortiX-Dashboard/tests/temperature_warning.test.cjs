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

test("TemperatureWarningPayloadSchema validates valid temperature_warning payloads matching specification", () => {
  const { TemperatureWarningPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const validPayload = {
    event: "temperature_warning",
    device_name: "Main_Drive_Motor / Edge_AI_Box",
    current_temp: 78.5,
    threshold_temp: 75.0,
    unit: "°C",
    mode: "realtime",
  };

  const parsed = TemperatureWarningPayloadSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "temperature_warning");
  assert.equal(parsed.data.device_name, "Main_Drive_Motor / Edge_AI_Box");
  assert.equal(parsed.data.current_temp, 78.5);
  assert.equal(parsed.data.threshold_temp, 75.0);
  assert.equal(parsed.data.unit, "°C");
  assert.equal(parsed.data.mode, "realtime");
});

test("TemperatureWarningPayloadSchema fills default values when optional fields are omitted", () => {
  const { TemperatureWarningPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const minimalPayload = {
    event: "temperature_warning",
  };

  const parsed = TemperatureWarningPayloadSchema.safeParse(minimalPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.device_name, "Main_Drive_Motor / Edge_AI_Box");
  assert.equal(parsed.data.current_temp, 78.5);
  assert.equal(parsed.data.threshold_temp, 75.0);
  assert.equal(parsed.data.unit, "°C");
  assert.equal(parsed.data.mode, "realtime");
  assert.ok(parsed.data.timestamp);
});

test("TemperatureWarningPayloadSchema rejects invalid event codes", () => {
  const { TemperatureWarningPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const invalidPayload = {
    event: "overheat_unsupported",
    current_temp: 85.0,
  };

  const parsed = TemperatureWarningPayloadSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test("TemperatureWarningPayloadSchema rejects non-numeric temperatures", () => {
  const { TemperatureWarningPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const invalidPayload = {
    event: "temperature_warning",
    current_temp: "hot",
  };

  const parsed = TemperatureWarningPayloadSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test("DEFAULT_MQTT_TOPICS includes TEMP on conveyor/telemetry/temp", () => {
  const { DEFAULT_MQTT_TOPICS } = loadModule("../shared/constants/index.ts");
  assert.equal(DEFAULT_MQTT_TOPICS.TEMP, "conveyor/telemetry/temp");
});

test("SafetyService.triggerTemperatureWarning creates warning notification and broadcasts via SSE", async () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  sseBroadcasts.length = 0;

  const result = SafetyService.triggerTemperatureWarning({
    event: "temperature_warning",
    device_name: "Main_Drive_Motor / Edge_AI_Box",
    current_temp: 78.5,
    threshold_temp: 75.0,
    unit: "°C",
    mode: "realtime",
  });

  assert.equal(result.success, true);
  assert.ok(result.notification);
  assert.equal(result.notification.severity, "warning");
  assert.equal(result.notification.station_id, "Main_Drive_Motor / Edge_AI_Box");
  assert.equal(
    result.notification.description,
    "[QUÁ NHIỆT] Động cơ truyền động chính đang ở mức 78.5°C (Ngưỡng an toàn: 75°C). Khuyến nghị kiểm tra quạt tản nhiệt hoặc giảm tải"
  );

  // Check SSE broadcast
  const lastBroadcast = sseBroadcasts[sseBroadcasts.length - 1];
  assert.ok(lastBroadcast);
  assert.equal(lastBroadcast.event, "temperature_warning");
  assert.equal(lastBroadcast.data.payload.current_temp, 78.5);
  assert.equal(lastBroadcast.data.payload.threshold_temp, 75.0);
});

test("SafetyService.triggerTemperatureWarning handles Edge AI Box device name correctly", async () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");

  const result = SafetyService.triggerTemperatureWarning({
    event: "temperature_warning",
    device_name: "Edge_AI_Box",
    current_temp: 82.0,
    threshold_temp: 75.0,
    unit: "°C",
    mode: "realtime",
  });

  assert.equal(result.success, true);
  assert.ok(result.notification.description.includes("CPU máy chủ Edge AI"));
  assert.ok(result.notification.description.includes("82°C"));
});

test("SafetyController.triggerTemperatureWarningAlert validates input and handles requests", async () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");

  const response = await SafetyController.triggerTemperatureWarningAlert({
    event: "temperature_warning",
    device_name: "Main_Drive_Motor / Edge_AI_Box",
    current_temp: 79.2,
    threshold_temp: 75.0,
    unit: "°C",
    mode: "realtime",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  assert.equal(response.body.data.notification.severity, "warning");
});
