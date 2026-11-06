const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const source = readFileSync(join(__dirname, relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  const requireMock = (id) => {
    if (id === "zod") return require("zod");
    if (id.includes("schemas")) return loadModule("../shared/schemas/index.ts");
    if (id.startsWith("@/services/historyService")) return loadModule("../backend/src/services/historyService.ts");
    return {};
  };
  new Function("exports", "require", outputText)(exports, requireMock);
  return exports;
}

test("SorterConfigSchema validates valid config and passthrough fields", () => {
  const schemas = loadModule("../shared/schemas/index.ts");
  const validConfig = {
    schema_version: 1,
    config_version: 2,
    device_id: "sorter_01",
    catalog_version: "catalog_01",
    bins: [
      { bin_id: 1, brand_ids: ["brand_c"] },
      { bin_id: 2, brand_ids: ["brand_a"] },
    ],
    default_bin: 3,
    apply_mode: "when_line_empty",
    timestamp: "2026-09-17T12:00:00Z",
    extra_firmware_flag: "active", // passthrough
  };

  const parsed = schemas.SorterConfigSchema.parse(validConfig);
  assert.equal(parsed.config_version, 2);
  assert.equal(parsed.extra_firmware_flag, "active");
});

test("ClassificationRecordSchema rejects invalid bins and validates status", () => {
  const schemas = loadModule("../shared/schemas/index.ts");
  const validRecord = {
    id: "rec_100",
    product_id: "prod_100",
    brand_id: "brand_c",
    brand_name: "Coca-Cola",
    confidence: 0.98,
    target_bin: 1,
    actual_bin: 1,
    status: "success",
    timestamp: "2026-09-17T12:00:00Z",
  };

  assert.doesNotThrow(() => schemas.ClassificationRecordSchema.parse(validRecord));

  const invalidBin = { ...validRecord, actual_bin: 5 };
  assert.throws(() => schemas.ClassificationRecordSchema.parse(invalidBin));
});

test("HistoryQuerySchema correctly coerces query string params", () => {
  const schemas = loadModule("../shared/schemas/index.ts");
  const query = {
    limit: "25",
    offset: "50",
    bin: "2",
    status: "success",
  };

  const parsed = schemas.HistoryQuerySchema.parse(query);
  assert.equal(parsed.limit, 25);
  assert.equal(parsed.offset, 50);
  assert.equal(parsed.bin, 2);
  assert.equal(parsed.status, "success");
});
