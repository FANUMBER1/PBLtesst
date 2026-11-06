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

test("BinFullPayloadSchema validates valid bin_full payloads matching specification", () => {
  const { BinFullPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const validPayload = {
    event: "bin_full",
    bin_id: "BIN_RED_01",
    category: "Sản phẩm loại A",
    current_count: 50,
    max_capacity: 50,
    mode: "realtime",
  };

  const parsed = BinFullPayloadSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.event, "bin_full");
  assert.equal(parsed.data.bin_id, "BIN_RED_01");
  assert.equal(parsed.data.category, "Sản phẩm loại A");
  assert.equal(parsed.data.current_count, 50);
  assert.equal(parsed.data.max_capacity, 50);
  assert.equal(parsed.data.mode, "realtime");
});

test("BinFullPayloadSchema fills default values when optional fields are omitted", () => {
  const { BinFullPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const minimalPayload = {
    event: "bin_full",
  };

  const parsed = BinFullPayloadSchema.safeParse(minimalPayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.bin_id, "BIN_RED_01");
  assert.equal(parsed.data.category, "Sản phẩm loại A");
  assert.equal(parsed.data.current_count, 50);
  assert.equal(parsed.data.max_capacity, 50);
  assert.equal(parsed.data.mode, "realtime");
  assert.ok(parsed.data.timestamp);
});

test("BinFullPayloadSchema rejects invalid event codes", () => {
  const { BinFullPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const invalidPayload = {
    event: "wrong_event_code",
    bin_id: "BIN_RED_01",
    current_count: 50,
  };

  const parsed = BinFullPayloadSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test("BinFullPayloadSchema rejects negative counts or non-integer counts", () => {
  const { BinFullPayloadSchema } = loadModule("../shared/schemas/index.ts");

  const negativePayload = {
    event: "bin_full",
    current_count: -1,
  };

  const parsed = BinFullPayloadSchema.safeParse(negativePayload);
  assert.equal(parsed.success, false);
});

test("DEFAULT_MQTT_TOPICS includes BIN_STATUS on conveyor/storage/bin_status", () => {
  const { DEFAULT_MQTT_TOPICS } = loadModule("../shared/constants/index.ts");
  assert.equal(DEFAULT_MQTT_TOPICS.BIN_STATUS, "conveyor/storage/bin_status");
});

test("SafetyService.triggerBinFull creates warning notification and broadcasts via SSE", async () => {
  const { SafetyService } = loadModule("../backend/src/services/safetyService.ts");
  sseBroadcasts.length = 0;

  const result = await SafetyService.triggerBinFull({
    event: "bin_full",
    bin_id: "BIN_RED_01",
    category: "Sản phẩm loại A",
    current_count: 50,
    max_capacity: 50,
    mode: "realtime",
  });

  assert.equal(result.success, true);
  assert.ok(result.notification);
  assert.equal(result.notification.severity, "warning");
  assert.equal(result.notification.station_id, "BIN_RED_01");
  assert.ok(result.notification.description.includes("[ĐẦY KHAY CHỨA]"));
  assert.ok(result.notification.description.includes("50/50"));

  // Check SSE broadcast
  const lastBroadcast = sseBroadcasts[sseBroadcasts.length - 1];
  assert.ok(lastBroadcast);
  assert.equal(lastBroadcast.event, "bin_full");
  assert.equal(lastBroadcast.data.payload.bin_id, "BIN_RED_01");
  assert.equal(lastBroadcast.data.payload.current_count, 50);
});

test("SafetyController.triggerBinFullAlert validates input and handles requests", async () => {
  const { SafetyController } = loadModule("../backend/src/controllers/safetyController.ts");

  const response = await SafetyController.triggerBinFullAlert({
    event: "bin_full",
    bin_id: "BIN_BLUE_02",
    category: "Sản phẩm loại B",
    current_count: 50,
    max_capacity: 50,
    mode: "realtime",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data);
  assert.equal(response.body.data.notification.station_id, "BIN_BLUE_02");
});
