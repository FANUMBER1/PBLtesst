const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

test("1. TemperatureGaugeWidget Source Code Contract: Props and Simulation vs Real Mode Logic", () => {
  const filePath = join(__dirname, "../frontend/src/components/ui/TemperatureGaugeWidget.tsx");
  const content = readFileSync(filePath, "utf8");

  // Verify props interface
  assert.ok(content.includes("isSimulation?: boolean;"), "TemperatureGaugeWidgetProps must include isSimulation");
  assert.ok(content.includes("onSimulateTempChange?: (temp: number) => void;"), "TemperatureGaugeWidgetProps must include onSimulateTempChange");
  assert.ok(content.includes("onCoolDown?: () => void;"), "TemperatureGaugeWidgetProps must include onCoolDown");

  // Verify Simulation Mode elements: Slider, Range, Quick Presets
  assert.ok(content.includes("Thanh chỉnh nhiệt độ ảo"), "Must contain virtual temperature slider title in simulation mode");
  assert.ok(content.includes("Mô Phỏng"), "Must contain Simulation badge");
  assert.ok(content.includes('type="range"'), "Must contain range input in simulation mode");
  assert.ok(content.includes('min="30.0"'), "Must have min 30.0 for slider");
  assert.ok(content.includes('max="95.0"'), "Must have max 95.0 for slider");
  assert.ok(content.includes("42.5°C An toàn"), "Must have 42.5°C preset button");
  assert.ok(content.includes("72.0°C Cận ngưỡng"), "Must have 72.0°C preset button");
  assert.ok(content.includes("78.5°C Quá nhiệt"), "Must have 78.5°C preset button");
  assert.ok(content.includes("Hạ nhiệt độ về 42.5°C (An toàn)"), "Must have cooldown button when overheat");

  // Verify Real Mode elements: No slider, Real Sensor Telemetry panel
  assert.ok(content.includes("Đo thực tế từ cảm biến"), "Must contain Real Sensor measurement header in real mode");
  assert.ok(content.includes("Thực Tế"), "Must contain Real mode badge");
  assert.ok(content.includes("Trực tuyến (Live Telemetry)"), "Must contain Live Telemetry status indicator");
  assert.ok(content.includes("Chế độ đo thực tế: Nhiệt độ được đo đạc liên tục từ cảm biến"), "Must explain hardware sensor measurement");
});

test("2. Dashboard Overview page.tsx Contract: Connects TemperatureGaugeWidget to useDashboard", () => {
  const filePath = join(__dirname, "../frontend/src/app/page.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("handleTriggerTemperatureWarning"), "page.tsx must destructure handleTriggerTemperatureWarning");
  assert.ok(content.includes("handleCoolDownTemperature"), "page.tsx must destructure handleCoolDownTemperature");
  assert.ok(content.includes("<TemperatureGaugeWidget"), "page.tsx must render TemperatureGaugeWidget");
  assert.ok(content.includes("isSimulation={isSimulation}"), "page.tsx must pass isSimulation to TemperatureGaugeWidget");
  assert.ok(content.includes("onSimulateTempChange="), "page.tsx must pass onSimulateTempChange to TemperatureGaugeWidget");
  assert.ok(content.includes("onCoolDown="), "page.tsx must pass onCoolDown to TemperatureGaugeWidget");
});

test("3. LiveHealthAndBinWidget Contract: Passes isSimulation to compact TemperatureGaugeWidget", () => {
  const filePath = join(__dirname, "../frontend/src/components/overview/LiveHealthAndBinWidget.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("<TemperatureGaugeWidget"), "LiveHealthAndBinWidget must render TemperatureGaugeWidget");
  assert.ok(content.includes("isSimulation={isSimulation}"), "LiveHealthAndBinWidget must pass isSimulation to TemperatureGaugeWidget");
});

test("4. ConfigAndDiagnostics Contract: Displays simulation slider in simulation and telemetry info in real mode", () => {
  const filePath = join(__dirname, "../frontend/src/components/ConfigAndDiagnostics.tsx");
  const content = readFileSync(filePath, "utf8");

  assert.ok(content.includes("onSimulateTemperatureChange && isSimulation"), "ConfigAndDiagnostics must guard simulation slider with isSimulation");
  assert.ok(content.includes("!isSimulation"), "ConfigAndDiagnostics must display real hardware telemetry info when not in simulation");
  assert.ok(content.includes("Nhiệt Độ Cảm Biến Thực Tế"), "ConfigAndDiagnostics must note real sensor measurement");
});
