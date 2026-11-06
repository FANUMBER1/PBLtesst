const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const source = readFileSync(join(__dirname, "../frontend/src/lib/history.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

function createHistory(storage = new Map()) {
  const exports = {};
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  new Function("exports", "window", "localStorage", outputText)(exports, {}, localStorage);
  return { history: exports, storage };
}

function record(id, bin = 1) {
  return {
    id,
    product_id: id,
    brand_id: "brand_c",
    brand_name: "Coca-Cola",
    confidence: 0.99,
    target_bin: bin,
    actual_bin: bin,
    status: "success",
    timestamp: "2026-09-12T02:00:00.000Z",
  };
}

const emptyCounts = { bin1: 0, bin2: 0, bin3: 0 };

test("fresh simulation and reload start with no records or bin counts", () => {
  const { history, storage } = createHistory();
  assert.deepEqual(history.loadClassificationHistory(true), []);
  assert.deepEqual(history.loadBinCountsLocal(true), emptyCounts);
  assert.deepEqual(history.loadBrandCountsLocal(true), {
    med_syringe: 0, med_forceps: 0, med_scissors: 0, med_vial: 0,
  });
  assert.deepEqual(createHistory(storage).history.loadClassificationHistory(true), []);
});

test("old generated records and their cached counts are removed on load", () => {
  const { history, storage } = createHistory();
  const keys = history.STORAGE_KEYS;
  storage.set(keys.SIM_RECORDS, JSON.stringify([
    record("seed_today_1"), record("seed_yest_1", 2), record("seed_2days_1", 3),
  ]));
  storage.set(keys.SIM_BIN_COUNTS, JSON.stringify({ bin1: 8, bin2: 9, bin3: 18 }));
  // Loading counters first must also clean up the old data.
  assert.deepEqual(history.loadBinCountsLocal(true), emptyCounts);
  assert.deepEqual(history.loadClassificationHistory(true), []);
  assert.equal(storage.get(keys.SIM_RECORDS), "[]");
  assert.deepEqual(createHistory(storage).history.loadBinCountsLocal(true), emptyCounts);
});

test("migration keeps user records, real data and already cleared bins", () => {
  const { history, storage } = createHistory();
  const keys = history.STORAGE_KEYS;
  const userRecords = [record("sim_1"), record("sim_2", 2)];
  const realRecords = JSON.stringify([record("real_1", 3)]);
  const realCounts = JSON.stringify({ bin1: 0, bin2: 0, bin3: 1 });
  storage.set(keys.SIM_RECORDS, JSON.stringify([...userRecords, record("seed_today_1")]));
  storage.set(keys.SIM_BIN_COUNTS, JSON.stringify({ bin1: 0, bin2: 9, bin3: 18 }));
  storage.set(keys.REAL_RECORDS, realRecords);
  storage.set(keys.REAL_BIN_COUNTS, realCounts);
  assert.deepEqual(history.loadClassificationHistory(true), userRecords);
  assert.deepEqual(history.loadBinCountsLocal(true), { bin1: 0, bin2: 1, bin3: 0 });
  assert.equal(storage.get(keys.REAL_RECORDS), realRecords);
  assert.equal(storage.get(keys.REAL_BIN_COUNTS), realCounts);
});

test("legacy history imports user records without reintroducing generated records", () => {
  const { history, storage } = createHistory();
  const keys = history.STORAGE_KEYS;
  const userRecord = record("sim_legacy");
  storage.set(keys.LEGACY_RECORDS, JSON.stringify([userRecord, record("seed_yest_1")]));
  assert.deepEqual(history.loadClassificationHistory(true), [userRecord]);
  assert.deepEqual(history.loadBinCountsLocal(true), { bin1: 1, bin2: 0, bin3: 0 });
  history.clearClassificationHistory(true);
  const reloaded = createHistory(storage).history;
  assert.deepEqual(reloaded.loadClassificationHistory(true), []);
  assert.deepEqual(reloaded.loadBinCountsLocal(true), emptyCounts);
});

test("user simulation records persist after reload and clear stays empty", () => {
  const { history, storage } = createHistory();
  history.loadBinCountsLocal(true);
  const first = record("sim_first");
  assert.deepEqual(history.saveClassificationRecord(first, true), [first]);
  history.updateBinCountsLocal(1, true);
  const reloaded = createHistory(storage).history;
  assert.deepEqual(reloaded.loadClassificationHistory(true), [first]);
  assert.deepEqual(reloaded.loadBinCountsLocal(true), { bin1: 1, bin2: 0, bin3: 0 });
  reloaded.clearClassificationHistory(true);
  assert.deepEqual(reloaded.loadClassificationHistory(true), []);
  assert.deepEqual(reloaded.loadBinCountsLocal(true), emptyCounts);
});

test("batch save stores demo records in one history update", () => {
  const { history, storage } = createHistory();
  const records = [record("demo_1"), record("demo_2", 2), record("demo_3", 3)];
  assert.deepEqual(history.saveClassificationRecordsLocal(records, true), records);
  assert.deepEqual(createHistory(storage).history.loadClassificationHistory(true), records);
});

test("corrupted counter cache does not hide retained simulation history", () => {
  const { history, storage } = createHistory();
  const keys = history.STORAGE_KEYS;
  const userRecord = record("sim_saved");
  storage.set(keys.SIM_RECORDS, JSON.stringify([userRecord, record("seed_today_1")]));
  storage.set(keys.SIM_BIN_COUNTS, "invalid json");
  assert.deepEqual(history.loadClassificationHistory(true), [userRecord]);
  assert.deepEqual(history.loadBinCountsLocal(true), { bin1: 1, bin2: 0, bin3: 0 });
});

test("malformed records and counters are ignored and normalized safely", () => {
  const { history, storage } = createHistory();
  const keys = history.STORAGE_KEYS;
  storage.set(keys.SIM_RECORDS, JSON.stringify([
    record("valid"),
    { id: "missing-fields", actual_bin: 1 },
    null,
  ]));
  storage.set(keys.SIM_BIN_COUNTS, JSON.stringify({ bin1: -5, bin2: "not-a-number", bin3: 99.8 }));
  assert.deepEqual(history.loadClassificationHistory(true), [record("valid")]);
  assert.deepEqual(history.loadBinCountsLocal(true), { bin1: 0, bin2: 0, bin3: 50 });
});

test("invalid sorter config falls back to an isolated default object", () => {
  const { history, storage } = createHistory();
  storage.set(history.STORAGE_KEYS.CONFIG, JSON.stringify({ bins: "invalid" }));
  const first = history.loadSorterConfigLocal();
  first.bins[0].brand_ids.push("mutated");
  const second = history.loadSorterConfigLocal();
  assert.equal(second.bins[0].brand_ids.includes("mutated"), false);
});
