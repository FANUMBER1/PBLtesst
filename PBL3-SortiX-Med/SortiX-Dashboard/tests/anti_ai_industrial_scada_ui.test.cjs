/**
 * anti_ai_industrial_scada_ui.test.cjs
 * Bộ kiểm thử hợp đồng mã nguồn cho Giao diện HMI Công Nghiệp Chuẩn ISA-101 (Anti-AI Cliché / Authentic SCADA)
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Industrial SCADA Anti-AI UX/UI Contracts (ISA-101 / IEC-62443)", () => {
  const frontendSrc = path.join(__dirname, "..", "frontend", "src");

  test("1. Hotkeys SCADA trong DashboardLayout.tsx: Shift+E, Space, D, M", () => {
    const layoutPath = path.join(frontendSrc, "components", "layout", "DashboardLayout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    // Hotkey Shift+E (Instant Emergency Stop)
    assert.ok(content.includes("Shift + E"), "DashboardLayout phải ghi nhận hotkey Shift + E");
    assert.ok(content.includes("triggerEmergencyStopRef.current"), "Shift + E phải kích hoạt E-Stop ngay lập tức");

    // Hotkey Space (Toggle Run)
    assert.ok(content.includes('e.code === "Space"'), "DashboardLayout phải ghi nhận phím Space để chạy/tạm dừng");
    assert.ok(content.includes("conveyor.handleToggleRun"), "Space phải gọi conveyor.handleToggleRun");

    // Hotkey D (Display Density)
    assert.ok(content.includes('e.key === "d" || e.key === "D"'), "Phím D phải chuyển đổi mật độ hiển thị");
    assert.ok(content.includes("toggleDisplayDensity()"), "Phím D phải gọi toggleDisplayDensity");

    // Hotkey M (Mute Siren)
    assert.ok(content.includes('e.key === "m" || e.key === "M"'), "Phím M phải tắt/bật còi báo");
    assert.ok(content.includes("handleToggleSound()"), "Phím M phải gọi handleToggleSound");

    // Bỏ qua input/textarea
    assert.ok(content.includes("target.tagName === \"INPUT\""), "Phím tắt phải bỏ qua khi người dùng đang nhập text");
  });

  test("2. KpiStatGrid.tsx: Loại bỏ hiệu ứng neon glow và áp dụng nhãn tag thiết bị chuẩn công nghiệp", () => {
    const kpiPath = path.join(frontendSrc, "components", "overview", "KpiStatGrid.tsx");
    const content = fs.readFileSync(kpiPath, "utf-8");

    // Không còn shadow neon tím hồng mờ ảo
    assert.ok(!content.includes("shadow-[0_0_15px_-3px_"), "KpiStatGrid không được chứa hiệu ứng neon glow viễn tưởng");
    assert.ok(!content.includes("<Sparkles"), "KpiStatGrid không được dùng icon Sparkles");

    // Chuẩn font số liệu không rung giật
    assert.ok(content.includes("tabular-nums") && content.includes("font-mono"), "Các chỉ số KPI phải sử dụng font mono tabular-nums");

    // Nhãn mã thiết bị kỹ thuật
    assert.ok(content.includes("[PROD-01]"), "KPI Sản lượng phải có mã thiết bị [PROD-01]");
    assert.ok(content.includes("[CONV-01]"), "KPI Băng tải phải có mã thiết bị [CONV-01]");
    assert.ok(content.includes("[IOT-01]"), "KPI Vi điều khiển phải có mã thiết bị [IOT-01]");
    assert.ok(content.includes("[VISION-01]"), "KPI Camera phải có mã thiết bị [VISION-01]");
  });

  test("3. ConveyorStations.tsx: Cổng kiểm tra CAM-01 khung nhôm định hình và 2 LED vật lý S1", () => {
    const stationsPath = path.join(frontendSrc, "components", "conveyor", "ConveyorStations.tsx");
    const content = fs.readFileSync(stationsPath, "utf-8");

    // Không dùng tia laser hologram viễn tưởng
    assert.ok(!content.includes("holographic-scan-cone"), "Trạm Camera không được dùng hình nón hologram viễn tưởng");

    // Cổng kiểm tra thị giác máy công nghiệp CAM-01
    assert.ok(content.includes("CAM-01"), "Trạm kiểm tra phải định danh mã trạm CAM-01");
    assert.ok(content.includes("2020"), "Mô tả kết cấu cơ khí nhôm định hình 2020");

    // Cảm biến quang S1 với 2 LED vật lý thật
    assert.ok(content.includes("LED PWR"), "Cảm biến S1 phải có LED báo nguồn PWR");
    assert.ok(content.includes("LED OUT"), "Cảm biến S1 phải có LED báo tín hiệu OUT");
    assert.ok(content.includes("S1:GPIO0"), "Cảm biến S1 phải hiển thị chân GPIO0 thực tế");
  });

  test("4. TemperatureGaugeWidget.tsx & ConveyorToolbar.tsx: Chuẩn hóa màu kiểm thử mô phỏng Test Rig sang Amber", () => {
    const tempWidgetPath = path.join(frontendSrc, "components", "ui", "TemperatureGaugeWidget.tsx");
    const tempContent = fs.readFileSync(tempWidgetPath, "utf-8");
    assert.ok(!tempContent.includes("bg-purple-500"), "TemperatureGaugeWidget không được dùng màu tím cho badge mô phỏng");
    assert.ok(tempContent.includes("bg-amber-500"), "TemperatureGaugeWidget phải dùng màu amber công nghiệp");

    const toolbarPath = path.join(frontendSrc, "components", "conveyor", "ConveyorToolbar.tsx");
    const toolbarContent = fs.readFileSync(toolbarPath, "utf-8");
    assert.ok(!toolbarContent.includes("<Sparkles"), "ConveyorToolbar không được dùng icon Sparkles");
    assert.ok(toolbarContent.includes("Test Rig Spawner"), "ConveyorToolbar phải dùng nhãn Test Rig Spawner kỹ thuật");
    assert.ok(toolbarContent.includes("Shuffle"), "ConveyorToolbar phải dùng icon Shuffle cho nạp ngẫu nhiên");
  });

  test("5. Loại bỏ triệt để icon Sparkles trong toàn bộ mã nguồn frontend", () => {
    const checkNoSparkles = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkNoSparkles(fullPath);
        } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
          const fileContent = fs.readFileSync(fullPath, "utf-8");
          assert.ok(
            !fileContent.includes("<Sparkles"),
            `Tập tin ${entry.name} vẫn còn chứa component <Sparkles>`
          );
        }
      }
    };

    checkNoSparkles(frontendSrc);
  });
});
