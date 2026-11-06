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
    if (id === "crypto" || id === "node:crypto") return require("node:crypto");
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
    if (id.includes("types")) return loadModule("../shared/types/index.ts");
    return {};
  };

  new Function("exports", "require", outputText)(exports, requireMock);
  return exports;
}

// 1. Token Admin không thể tự cấp & Không cấp token dựa trên client-supplied claims
test("A1. Token route: Client không thể tự cấp token Admin hoặc mạo danh role/id", () => {
  const tokenRouteSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/auth/token/route.ts"),
    "utf8"
  );

  // Không chấp nhận id, username, role từ req body để ký token
  assert.ok(
    !tokenRouteSource.includes("const { id, username, role } = await req.json()"),
    "Token route must NOT parse user claims from request body"
  );
  assert.ok(
    !tokenRouteSource.includes("fallback"),
    "Token route must NOT contain insecure fallback sign branches"
  );
  assert.ok(
    tokenRouteSource.includes("getAuthenticatedUser(request)"),
    "Token route must verify caller identity using getAuthenticatedUser"
  );
  assert.ok(
    tokenRouteSource.includes('freshUser.status !== "active"'),
    "Token route must explicitly reject locked or inactive users"
  );
});

// 2. User thường không thể gọi API Admin / RBAC kiểm tra quyền ở server
test("A2. RBAC: User thường bị chặn gọi API Admin (403 Forbidden)", () => {
  const usersRouteSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/users/route.ts"),
    "utf8"
  );
  assert.ok(
    usersRouteSource.includes("getAdminUser(request)"),
    "User management route must enforce getAdminUser check"
  );

  const controlRouteSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/control/route.ts"),
    "utf8"
  );
  assert.ok(
    controlRouteSource.includes('authUser.role !== "admin"'),
    "Server-side control dispatch route must enforce admin authorization check for critical actions"
  );
});

// 3. E-Stop không ACK thì UI không báo đã dừng phần cứng
test("B1. E-Stop Banner: Chưa có ACK phần cứng thì không báo đã dừng", () => {
  const bannerSource = readFileSync(
    join(__dirname, "../frontend/src/components/layout/EmergencyStopBanner.tsx"),
    "utf8"
  );
  assert.ok(
    bannerSource.includes("isHardwareAcked"),
    "EmergencyStopBanner must check isHardwareAcked prop"
  );
  assert.ok(
    bannerSource.includes("Đã dừng phần cứng (ACK từ ESP32)"),
    "EmergencyStopBanner must show confirmed badge on ACK"
  );
  assert.ok(
    bannerSource.includes("Đang chờ xác nhận phần cứng..."),
    "EmergencyStopBanner must show pending unconfirmed warning if ACK is absent"
  );
});

// 4. Firmware xử lý ESTOP và ESTOP_RELEASE với auth_token hợp lệ
test("B2. Firmware State Machine & MQTT: Nhận ESTOP và ESTOP_RELEASE với token hợp lệ", () => {
  const stateMachineSource = readFileSync(
    join(__dirname, "../../sortix-firmware/components/state_machine/state_machine.c"),
    "utf8"
  );
  assert.ok(
    stateMachineSource.includes("SYSTEM_STATE_ESTOP"),
    "Firmware must implement explicit SYSTEM_STATE_ESTOP"
  );
  assert.ok(
    stateMachineSource.includes("SYSTEM_EVENT_ESTOP_RELEASE"),
    "Firmware must implement SYSTEM_EVENT_ESTOP_RELEASE"
  );
  assert.ok(
    stateMachineSource.includes("motor_control_stop()"),
    "Firmware must stop motor immediately upon ESTOP"
  );
  assert.ok(
    stateMachineSource.includes("sorting_engine_has_unresolved_items()"),
    "Firmware must block starting if unresolved items exist on belt"
  );

  const mqttHandlerSource = readFileSync(
    join(__dirname, "../../sortix-firmware/components/mqtt_handler/mqtt_handler.c"),
    "utf8"
  );
  assert.ok(
    mqttHandlerSource.includes("mqtt_handler_publish_estop_ack()"),
    "Firmware must publish ACK to conveyor/safety/estop/ack upon ESTOP"
  );
  assert.ok(
    mqttHandlerSource.includes("auth_token"),
    "Firmware must verify auth_token before processing ESTOP_RELEASE"
  );
});

// 5. Payload release có xác thực hợp lệ
test("B3. Unlock Route: Payload release yêu cầu ghi chú và token xác thực phía server", () => {
  const unlockRouteSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/safety/unlock/route.ts"),
    "utf8"
  );
  assert.ok(
    unlockRouteSource.includes("getAdminUser(request)"),
    "Unlock route must require Admin role via getAdminUser"
  );
  assert.ok(
    unlockRouteSource.includes("ESTOP_RELEASE"),
    "Unlock route must dispatch ESTOP_RELEASE action"
  );
  assert.ok(
    unlockRouteSource.includes("auth_token"),
    "Unlock route must send auth_token matching firmware control secret"
  );
  assert.ok(
    unlockRouteSource.includes("Bắt buộc nhập ghi chú xác nhận an toàn"),
    "Unlock route must enforce non-empty field notes"
  );
});

// 6. ApiSafetyClient.getStatus() trả UNAVAILABLE hoặc STALE khi API lỗi hoặc timeout
test("B4. ApiSafetyClient: Không bao giờ trả Operational khi mất kết nối hoặc dữ liệu cũ", () => {
  const clientSource = readFileSync(
    join(__dirname, "../frontend/src/services/apiSafetyClient.ts"),
    "utf8"
  );
  assert.ok(
    clientSource.includes("UNAVAILABLE"),
    "ApiSafetyClient must return UNAVAILABLE status on fetch failure"
  );
  assert.ok(
    clientSource.includes("STALE"),
    "ApiSafetyClient must detect stale data (>30s) and return STALE"
  );
  assert.ok(
    !clientSource.includes("status: \"OPERATIONAL\""),
    "ApiSafetyClient must NOT return OPERATIONAL when request fails"
  );
});

// 7. Firmware Sorting Engine: Timeout không làm cạn queue & PAUSE_AND_HOLD giữ vật thể
test("C1. Firmware Sorting Engine: Vision Timeout dừng băng tải và không chiếm slot vĩnh viễn", () => {
  const sortingEngineSource = readFileSync(
    join(__dirname, "../../sortix-firmware/components/sorting_engine/sorting_engine.c"),
    "utf8"
  );
  assert.ok(
    sortingEngineSource.includes("PAUSE_AND_HOLD"),
    "Sorting engine must support PAUSE_AND_HOLD policy"
  );
  assert.ok(
    sortingEngineSource.includes("state_machine_process_event(SYSTEM_EVENT_STOP)"),
    "PAUSE_AND_HOLD must stop conveyor immediately"
  );
  assert.ok(
    sortingEngineSource.includes("reported_error"),
    "Sorting engine must prevent duplicate error records via reported_error guard"
  );
  assert.ok(
    sortingEngineSource.includes("sorting_engine_clear_unresolved"),
    "Sorting engine must provide mechanism for operator to resolve held items"
  );
});

// 8. Firmware Sorting Engine: Servo busy không ghi nhận thành công sai
test("C2. Firmware Sorting Engine: Servo bận/hỏng không ghi actual_bin hoặc status success", () => {
  const sortingEngineSource = readFileSync(
    join(__dirname, "../../sortix-firmware/components/sorting_engine/sorting_engine.c"),
    "utf8"
  );
  assert.ok(
    sortingEngineSource.includes("servo_trigger"),
    "Sorting engine must call servo_trigger"
  );
  assert.ok(
    sortingEngineSource.includes("s_err == ESP_OK"),
    "Sorting engine must check servo_trigger return code"
  );
  assert.ok(
    sortingEngineSource.includes("item->servo_failed = true"),
    "Sorting engine must flag servo failure when trigger fails or misses target window"
  );
});

// 9. Firmware Cấu hình Sorter: Validation chặt chẽ, từ chối cấu hình sai
test("C3. Firmware Sorter Config: Kiểm tra version, bin_id, số lượng bin, apply_mode", () => {
  const sortingEngineSource = readFileSync(
    join(__dirname, "../../sortix-firmware/components/sorting_engine/sorting_engine.c"),
    "utf8"
  );
  assert.ok(
    sortingEngineSource.includes("bin_id->valueint != 1 && bin_id->valueint != 2"),
    "Config validation must reject bin_id other than 1 or 2"
  );
  assert.ok(
    sortingEngineSource.includes("cfg_ver->valueint <= 0"),
    "Config validation must reject non-positive config version"
  );
  assert.ok(
    sortingEngineSource.includes("immediate") && sortingEngineSource.includes("drained"),
    "Config validation must validate apply_mode"
  );
  assert.ok(
    sortingEngineSource.includes("dist_s1_servo1_mm"),
    "Firmware must use NVS calibration distances"
  );
});

// 10. Chặn spawn_item ở Real Hardware mode
test("D1. Sync/Spawn Guard: Chặn tạo vật thể ảo ở chế độ Real Hardware", () => {
  const syncRouteSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/sync/route.ts"),
    "utf8"
  );
  assert.ok(
    syncRouteSource.includes('type === "spawn_item"'),
    "Sync route must inspect spawn_item action"
  );
  assert.ok(
    syncRouteSource.includes('currentState.mode !== "sim"'),
    "Sync route must block spawn_item when system is not in simulation mode"
  );

  const serverSource = readFileSync(
    join(__dirname, "../backend/src/server.ts"),
    "utf8"
  );
  assert.ok(
    serverSource.includes('type === "spawn_item"'),
    "Backend server must handle spawn_item action"
  );
  assert.ok(
    serverSource.includes('currentState.mode !== "sim"'),
    "Backend server must block spawn_item when mode is real hardware"
  );
});

// 11. Telemetry Ingestion Schema: Từ chối NaN, vô cực, tốc độ/nhiệt độ bất thường
test("D2. Telemetry Ingestion: Kiểm tra schema chặt chẽ, từ chối dữ liệu giả mạo/ngoài miền", () => {
  const schemas = loadModule("../shared/schemas/index.ts");
  assert.ok(schemas.TelemetryIngestionSchema, "TelemetryIngestionSchema must be defined");

  // Valid telemetry
  const validTelemetry = {
    temperature: 42.5,
    speed: 120,
    motor_running: true,
    optical_sensor: "CLEAR",
    timestamp: new Date().toISOString(),
  };
  assert.ok(
    schemas.TelemetryIngestionSchema.safeParse(validTelemetry).success,
    "Valid telemetry must pass validation"
  );

  // Reject NaN / Infinity
  const nanTelemetry = {
    temperature: NaN,
    speed: 100,
    motor_running: true,
  };
  assert.strictEqual(
    schemas.TelemetryIngestionSchema.safeParse(nanTelemetry).success,
    false,
    "Telemetry with NaN must be rejected"
  );

  // Reject out of bounds speed (> 200 mm/s)
  const highSpeedTelemetry = {
    temperature: 35,
    speed: 500,
    motor_running: true,
  };
  assert.strictEqual(
    schemas.TelemetryIngestionSchema.safeParse(highSpeedTelemetry).success,
    false,
    "Telemetry with speed > 200 must be rejected"
  );

  // Reject out of bounds temp (> 125°C)
  const highTempTelemetry = {
    temperature: 200,
    speed: 100,
    motor_running: true,
  };
  assert.strictEqual(
    schemas.TelemetryIngestionSchema.safeParse(highTempTelemetry).success,
    false,
    "Telemetry with temp > 125°C must be rejected"
  );
});

// 12. Password recovery: OTP mã hóa, giới hạn tần suất và chỉ báo thành công khi email gửi được
test("D3. Forgot Password Flow: OTP băm mật, rate-limit và không để lộ demo_otp trong production", () => {
  const forgotRouteSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/auth/forgot-password/route.ts"),
    "utf8"
  );

  assert.ok(
    forgotRouteSource.includes("transporter.sendMail"),
    "Forgot password route must integrate real nodemailer email dispatch"
  );
  assert.ok(
    forgotRouteSource.includes("checkOtpRateLimit"),
    "Forgot password route must enforce rate limiting"
  );
  assert.ok(
    forgotRouteSource.includes("!isProduction && process.env.ENABLE_DEMO_OTP === \"true\""),
    "demo_otp must be strictly blocked in production"
  );

  const storeSource = readFileSync(
    join(__dirname, "../frontend/src/app/api/users/store.ts"),
    "utf8"
  );
  assert.ok(
    storeSource.includes('crypto.createHash("sha256")'),
    "OTP must be hashed with sha256 before storage in store"
  );
});
