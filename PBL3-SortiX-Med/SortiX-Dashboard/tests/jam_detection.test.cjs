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
    if (id.includes("safetyController")) return loadModule("../backend/src/controllers/safetyController.ts");
    return {};
  };
  new Function("exports", "require", outputText)(exports, requireMock);
  return exports;
}

const sseBroadcasts = [];

test("JamDetectedPayloadSchema validates valid jam payloads", () => {
  const { JamDetectedPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const validPayload = {
    event: "jam_detected",
    section: "Conveyor_Belt_Zone_A",
    duration_seconds: 5,
    sensor_id: "OPTICAL_JAM_02",
    mode: "realtime",
  };

  const parsed = JamDetectedPayloadSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "jam_detected");
  assert.equal(parsed.data.section, "Conveyor_Belt_Zone_A");
  assert.equal(parsed.data.duration_seconds, 5);
  assert.equal(parsed.data.sensor_id, "OPTICAL_JAM_02");
  assert.equal(parsed.data.mode, "realtime");
});

test("JamDetectedPayloadSchema fills default values when optional fields are omitted", () => {
  const { JamDetectedPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const minimalPayload = {
    event: "jam_detected",
  };

  const parsed = JamDetectedPayloadSchema.safeParse(minimalPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.section, "Conveyor_Belt_Zone_A");
  assert.equal(parsed.data.sensor_id, "OPTICAL_JAM_02");
  assert.equal(parsed.data.duration_seconds, 5);
  assert.equal(parsed.data.mode, "realtime");
});

test("JamDetectedPayloadSchema rejects invalid event codes", () => {
  const { JamDetectedPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const invalidPayload = {
    event: "invalid_event",
    section: "Conveyor_Belt_Zone_A",
    duration_seconds: 5,
  };

  const parsed = JamDetectedPayloadSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test("JamDetectedPayloadSchema rejects negative duration", () => {
  const { JamDetectedPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const invalidPayload = {
    event: "jam_detected",
    duration_seconds: -1,
  };

  const parsed = JamDetectedPayloadSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test("SafetyService.triggerJamAlert creates critical notification and broadcasts SSE", () => {
  sseBroadcasts.length = 0;
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  const { NotificationModel } = loadModule("../backend/src/models/notificationModel.ts");

  const jamPayload = {
    event: "jam_detected",
    section: "Conveyor_Belt_Zone_A",
    duration_seconds: 5,
    sensor_id: "OPTICAL_JAM_02",
    mode: "realtime",
    timestamp: new Date().toISOString(),
  };

  const result = SafetyService.triggerJamAlert(jamPayload);
  assert.equal(result.success, true);
  assert.ok(result.notification);
  assert.equal(result.notification.event, "jam_detected");
  assert.equal(result.notification.severity, "critical");
  assert.equal(result.notification.status, "unprocessed");
  assert.ok(result.notification.description.includes("Khu vực Conveyor_Belt_Zone_A"));
  assert.ok(result.notification.description.includes("OPTICAL_JAM_02"));

  // Check stored in NotificationModel
  const unprocessed = NotificationModel.getUnprocessed();
  const found = unprocessed.find((n) => n.id === result.notification.id);
  assert.ok(found, "Notification should be in unprocessed list");

  // Check SSE broadcast
  const jamBroadcast = sseBroadcasts.find((b) => b.event === "jam_detected");
  assert.ok(jamBroadcast, "jam_detected event must be broadcast over SSE");
  assert.equal(jamBroadcast.data.payload.event, "jam_detected");
});

test("DEFAULT_MQTT_TOPICS contains conveyor/sensor/jam topic", () => {
  const { DEFAULT_MQTT_TOPICS } = loadModule("../shared/constants/index.ts");
  assert.equal(DEFAULT_MQTT_TOPICS.JAM, "conveyor/sensor/jam");
});
