const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Telegram Copilot 2-Way Bot & SCADA Screen-Fit Verification", () => {
  it("Trụ cột 1: DashboardLayout hỗ trợ DisplayDensity (Compact/Comfortable) & SCADA Fullscreen F11", () => {
    const layoutPath = path.resolve(__dirname, "../frontend/src/components/layout/DashboardLayout.tsx");
    assert.strictEqual(fs.existsSync(layoutPath), true, "DashboardLayout.tsx must exist");
    const content = fs.readFileSync(layoutPath, "utf8");

    assert.match(content, /displayDensity/, "DashboardLayout must manage displayDensity");
    assert.match(content, /compact.*comfortable/i, "Must support compact and comfortable density modes");
    assert.match(content, /sortix_display_density/, "Must persist density preference in localStorage");
    assert.match(content, /1366/, "Must auto-activate compact mode for <= 1366px screens");
    assert.match(content, /h-\[100dvh\]/, "Must enforce 100dvh viewport height to prevent overflow");
    assert.match(content, /isFullscreen/, "Must provide isFullscreen state");
    assert.match(content, /toggleFullscreen/, "Must provide toggleFullscreen function");
  });

  it("Trụ cột 1: TopHeader có nút chuyển đổi Mật độ hiển thị và SCADA Kiosk Fullscreen", () => {
    const headerPath = path.resolve(__dirname, "../frontend/src/components/layout/TopHeader.tsx");
    assert.strictEqual(fs.existsSync(headerPath), true, "TopHeader.tsx must exist");
    const content = fs.readFileSync(headerPath, "utf8");

    assert.match(content, /displayDensity/, "TopHeader must accept displayDensity prop");
    assert.match(content, /onToggleDensity/, "TopHeader must accept onToggleDensity callback");
    assert.match(content, /isFullscreen/, "TopHeader must accept isFullscreen prop");
    assert.match(content, /onToggleFullscreen/, "TopHeader must accept onToggleFullscreen callback");
    assert.match(content, /Mật độ hiển thị/, "TopHeader must display density toggle button");
    assert.match(content, /Toàn màn hình SCADA/, "TopHeader must display SCADA fullscreen kiosk button");
  });

  it("Trụ cột 1: Trang Băng Tải fit màn hình zero-scroll", () => {
    const conveyorPagePath = path.resolve(__dirname, "../frontend/src/app/conveyor/page.tsx");
    assert.strictEqual(fs.existsSync(conveyorPagePath), true, "conveyor/page.tsx must exist");
    const content = fs.readFileSync(conveyorPagePath, "utf8");

    assert.match(content, /h-full.*overflow-y-auto.*lg:overflow-hidden/, "Must use responsive zero-scroll container");
  });

  it("Trụ cột 2: Dịch vụ Telegram Bot 2 chiều (telegramBotService.ts)", () => {
    const svcPath = path.resolve(__dirname, "../frontend/src/lib/telegramBotService.ts");
    assert.strictEqual(fs.existsSync(svcPath), true, "telegramBotService.ts must exist");
    const content = fs.readFileSync(svcPath, "utf8");

    assert.match(content, /TelegramBotService\s*=/, "Must export TelegramBotService");
    assert.match(content, /getScadaKeyboard/, "Must have getScadaKeyboard method");
    assert.match(content, /scada_status/, "Keyboard must contain scada_status action");
    assert.match(content, /scada_temp/, "Keyboard must contain scada_temp action");
    assert.match(content, /scada_estop/, "Keyboard must contain scada_estop action");
    assert.match(content, /executeScadaCommand/, "Must have executeScadaCommand method");
    assert.match(content, /isAuthorizedAdmin/, "Must enforce Chat ID Admin RBAC");
    assert.match(content, /buildTelemetrySummary/, "Must build real-time telemetry summary");
    assert.match(content, /queryGeminiAI/, "Must integrate Google Gemini 2.5 Flash");
    assert.match(content, /gemini-2\.5-flash/, "Must target gemini-2.5-flash model");
  });

  it("Trụ cột 2: Route Webhook Telegram (/api/telegram/webhook/route.ts)", () => {
    const routePath = path.resolve(__dirname, "../frontend/src/app/api/telegram/webhook/route.ts");
    assert.strictEqual(fs.existsSync(routePath), true, "webhook route must exist");
    const content = fs.readFileSync(routePath, "utf8");

    assert.match(content, /export async function POST/, "Must export POST handler");
    assert.match(content, /export async function GET/, "Must export GET handler");
    assert.match(content, /callback_query/, "POST must handle callback_query button clicks");
    assert.match(content, /executeScadaCommand/, "POST must dispatch SCADA commands");
    assert.match(content, /queryGeminiAI/, "POST must route questions to Gemini AI");
    assert.match(content, /setWebhook/, "GET must support webhook registration");
  });

  it("Trụ cột 2: AiCopilot Web hiển thị liên kết Telegram Bot 2 Chiều", () => {
    const copilotPath = path.resolve(__dirname, "../frontend/src/components/AiCopilot.tsx");
    assert.strictEqual(fs.existsSync(copilotPath), true, "AiCopilot.tsx must exist");
    const content = fs.readFileSync(copilotPath, "utf8");

    assert.match(content, /Telegram Bot 2 Chiều/, "Must include Telegram Bot 2 Chiều section");
    assert.match(content, /SortiX_Med_Bot/, "Must link to @SortiX_Med_Bot");
    assert.match(content, /\/api\/telegram\/webhook/, "Must reference webhook endpoint");
    assert.match(content, /Kiểm tra Webhook/, "Must have webhook check button");
  });
});
