const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

// Mock Web Audio Context
class MockOscillator {
  constructor() {
    this.type = "sine";
    this.frequency = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    this.onended = null;
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockGain {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    };
  }
  connect() {}
  disconnect() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
  }
  createOscillator() {
    return new MockOscillator();
  }
  createGain() {
    return new MockGain();
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

global.window = {
  AudioContext: MockAudioContext,
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    getItem: () => "false",
    setItem: () => {},
  },
};
global.localStorage = global.window.localStorage;

function loadAudioService() {
  const fullPath = join(__dirname, "../frontend/src/lib/audioService.ts");
  const source = readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const exports = {};
  new Function("exports", "require", outputText)(exports, () => ({}));
  return exports.industrialAudio;
}

test("AudioService: Còi kẹt phôi startContinuousJamAlarm và stopContinuousJamAlarm hoạt động chính xác", () => {
  const audio = loadAudioService();
  audio.setMuted(false);
  assert.equal(audio.getMuted(), false);

  // Kích hoạt còi kẹt phôi liên tục
  audio.startContinuousJamAlarm();
  assert.ok(audio.continuousJamInterval !== null, "Interval còi kẹt phôi phải được kích hoạt");

  // Dập tắt còi kẹt phôi
  audio.stopContinuousJamAlarm();
  assert.equal(audio.continuousJamInterval, null, "Interval còi kẹt phôi phải được dọn dẹp sạch sẽ");
});

test("AudioService: Còi báo khay đầy startContinuousBinFullAlarm và stopContinuousBinFullAlarm hoạt động chính xác", () => {
  const audio = loadAudioService();
  audio.setMuted(false);

  // Kích hoạt còi báo khay đầy liên tục
  audio.startContinuousBinFullAlarm();
  assert.ok(audio.continuousBinFullInterval !== null, "Interval còi khay đầy phải được kích hoạt");

  // Dập tắt còi báo khay đầy
  audio.stopContinuousBinFullAlarm();
  assert.equal(audio.continuousBinFullInterval, null, "Interval còi khay đầy phải được dọn dẹp sạch sẽ");
});

test("AudioService: silenceAll và setMuted(true) dập tắt toàn bộ còi hú đồng thời", () => {
  const audio = loadAudioService();
  audio.setMuted(false);

  audio.startContinuousEmergencyAlarm();
  audio.startContinuousJamAlarm();
  audio.startContinuousBinFullAlarm();

  assert.ok(audio.continuousAlarmInterval !== null);
  assert.ok(audio.continuousJamInterval !== null);
  assert.ok(audio.continuousBinFullInterval !== null);

  // silenceAll() dập tắt cả 3 còi
  audio.silenceAll();
  assert.equal(audio.continuousAlarmInterval, null);
  assert.equal(audio.continuousJamInterval, null);
  assert.equal(audio.continuousBinFullInterval, null);

  // setMuted(true) cũng tự động dập tắt mọi âm thanh
  audio.startContinuousJamAlarm();
  audio.setMuted(true);
  assert.equal(audio.continuousJamInterval, null);
  assert.equal(audio.getMuted(), true);
});

test("UI Guard: ConfigAndDiagnostics và config/page chứa nút Giả lập kẹt phôi chỉ trong chế độ Simulation", () => {
  const configSource = readFileSync(join(__dirname, "../frontend/src/components/ConfigAndDiagnostics.tsx"), "utf8");
  const pageSource = readFileSync(join(__dirname, "../frontend/src/app/config/page.tsx"), "utf8");

  // Kiểm tra interface có hỗ trợ onSimulateJam và isJammed
  assert.ok(configSource.includes("onSimulateJam?: () => void;"), "ConfigAndDiagnosticsProps phải có onSimulateJam");
  assert.ok(configSource.includes("isJammed?: boolean;"), "ConfigAndDiagnosticsProps phải có isJammed");
  assert.ok(configSource.includes("onClearJam?: () => void;"), "ConfigAndDiagnosticsProps phải có onClearJam");

  // Kiểm tra điều kiện bảo vệ chế độ mô phỏng
  assert.ok(configSource.includes("onSimulateJam && isSimulation"), "Nút giả lập kẹt phôi phải có guard isSimulation");
  assert.ok(configSource.includes("⚠️ Giả Lập Kẹt Phôi (Simulation)"), "Nhãn nút giả lập kẹt phôi ở trạng thái bình thường");
  assert.ok(configSource.includes("⚠️ Đang Bị Kẹt Phôi • Bấm để Gỡ Kẹt"), "Nhãn nút chuyển sang cảnh báo khi đang bị kẹt");

  // Kiểm tra config/page.tsx kết nối useDashboard
  assert.ok(pageSource.includes("handleTriggerJam"), "config/page.tsx phải destructure handleTriggerJam từ useDashboard");
  assert.ok(pageSource.includes("onSimulateJam={isSimulation ? () => handleTriggerJam(undefined, \"user_action\") : undefined}"), "config/page.tsx phải truyền onSimulateJam được bảo vệ bởi isSimulation");
});

test("Unified Alert Architecture: DashboardLayout tích hợp JamIncidentBanner và JamUnlockToast duy nhất 1 lần, chống spam lặp", () => {
  const layoutSource = readFileSync(join(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx"), "utf8");
  const visualizerSource = readFileSync(join(__dirname, "../frontend/src/components/ConveyorVisualizer.tsx"), "utf8");

  // Kiểm tra DashboardLayout mount JamUnlockToast duy nhất và đã loại bỏ JamIncidentBanner trên đỉnh để tránh trùng lặp UI
  assert.ok(!layoutSource.includes("<JamIncidentBanner"), "DashboardLayout đã loại bỏ JamIncidentBanner để tránh trùng lặp với JamUnlockToast");
  assert.ok(layoutSource.includes("JamUnlockToast"), "DashboardLayout phải import và mount JamUnlockToast");

  // Kiểm tra cơ chế chống duplicate toast trong handleTriggerJam
  assert.ok(layoutSource.includes("if (isJammedRef.current)"), "handleTriggerJam phải có guard isJammedRef.current chống lặp sự cố");
  assert.ok(!layoutSource.includes("toast.error(\n        \"Vui lòng kiểm tra khay phân loại"), "handleTriggerJam không được gọi toast.error generic gây xếp chồng nhiều thông báo");

  // Kiểm tra ConveyorVisualizer đã dọn dẹp banner thừa và nút test trùng lặp
  assert.ok(!visualizerSource.includes("⚠️ Bấm test giả lập kẹt phôi"), "ConveyorVisualizer không được có nút test kẹt phôi trùng lặp");
});

