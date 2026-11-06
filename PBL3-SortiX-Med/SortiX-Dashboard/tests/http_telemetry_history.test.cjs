const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { TelemetryModel } = require("../backend/dist/backend/src/models/telemetryModel.js");
const { TelemetryController } = require("../backend/dist/backend/src/controllers/telemetryController.js");
const { SafetyService } = require("../backend/dist/backend/src/services/safetyService.js");

test("HTTP Telemetry & Database History Test Suite", async (t) => {
  await t.test("1. TelemetryModel stores and persists records into telemetry_logs.json with Atomic Write", () => {
    TelemetryModel.clear();
    assert.equal(TelemetryModel.getCount(), 0);

    const record1 = TelemetryModel.addRecord({
      device_id: "ESP32_C5_TEST",
      temperature: 36.8,
      optical_sensor: "CLEAR",
      conveyor_speed: 55,
      is_running: true,
      estop_pressed: false,
      unit: "°C",
    });

    assert.equal(record1.device_id, "ESP32_C5_TEST");
    assert.equal(record1.temperature, 36.8);
    assert.equal(record1.protocol, "HTTP_POST");
    assert.equal(TelemetryModel.getCount(), 1);

    // Verify file exists on disk
    const logsFile = path.join(process.cwd(), "data", "telemetry_logs.json");
    assert.equal(fs.existsSync(logsFile), true);
    const content = JSON.parse(fs.readFileSync(logsFile, "utf-8"));
    assert.equal(Array.isArray(content), true);
    assert.equal(content.length >= 1, true);
    assert.equal(content[0].device_id, "ESP32_C5_TEST");
  });

  await t.test("2. TelemetryController.handlePostTelemetry parses flexible JSON and updates SafetyService", () => {
    const postPayload = {
      device_id: "ESP32_SORTIX_01",
      current_temp: 38.2,
      sensor_optical: 1, // Will be parsed to "BLOCKED"
      speed: 60,
      is_running: true,
    };

    const res = TelemetryController.handlePostTelemetry(postPayload);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.protocol, "HTTP_POST");
    assert.equal(res.body.record.temperature, 38.2);
    assert.equal(res.body.record.optical_sensor, "BLOCKED");
    assert.equal(res.body.record.conveyor_speed, 60);

    // Check SafetyService was synchronized
    const safetyTelemetry = SafetyService.getTelemetry();
    assert.equal(safetyTelemetry.current_temp, 38.2);
    assert.equal(safetyTelemetry.motor_speed, 60);
    assert.equal(safetyTelemetry.optical_sensor_02, "BLOCKED");
  });

  await t.test("3. TelemetryController.handleGetTelemetryHistory returns database history list", () => {
    const res = TelemetryController.handleGetTelemetryHistory({ limit: "10" });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.count >= 2, true);
    assert.equal(res.body.latest !== null, true);
  });

  await t.test("4. TopHeader Contract: Renders Team Name, HTTP POST Status, and Last Updated indicator", () => {
    const topHeaderSrc = fs.readFileSync(
      path.join(__dirname, "../frontend/src/components/layout/TopHeader.tsx"),
      "utf8"
    );
    assert.ok(topHeaderSrc.includes('data-testid="team-project-badge"'), "TopHeader phải có badge tên nhóm và tên đề tài");
    assert.ok(topHeaderSrc.includes('data-testid="http-badge-status"'), "TopHeader phải có badge trạng thái HTTP POST");
    assert.ok(topHeaderSrc.includes('data-testid="telemetry-last-updated"'), "TopHeader phải có nhãn thời gian cập nhật");
    assert.ok(topHeaderSrc.includes("HTTP: POST 5s"), "TopHeader phải hiển thị HTTP: POST 5s");
    assert.ok(topHeaderSrc.includes("Cập nhật:"), "TopHeader phải hiển thị text Cập nhật:");
  });

  await t.test("5. DashboardLayout Contract: Passes lastUpdated and registers SSE telemetry listener", () => {
    const layoutSrc = fs.readFileSync(
      path.join(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx"),
      "utf8"
    );
    assert.ok(layoutSrc.includes("lastUpdated={lastTelemetryTime}"), "DashboardLayout phải truyền lastUpdated={lastTelemetryTime} vào TopHeader");
    assert.ok(layoutSrc.includes('eventSource.addEventListener("telemetry"'), "DashboardLayout phải đăng ký SSE listener telemetry");
  });

  await t.test("6. TelemetryController.handleDeleteTelemetryHistory resets database logs", () => {
    const res = TelemetryController.handleDeleteTelemetryHistory();
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(TelemetryModel.getCount(), 0);
  });
});
