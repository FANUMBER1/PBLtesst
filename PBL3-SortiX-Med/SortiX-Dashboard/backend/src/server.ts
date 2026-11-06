import http from "node:http";
import { URL } from "node:url";
import { ConfigRoutes } from "./routes/configRoutes";
import { HistoryRoutes } from "./routes/historyRoutes";
import { StatsRoutes } from "./routes/statsRoutes";
import { AlertRoutes } from "./routes/alertRoutes";
import { UserRoutes } from "./routes/userRoutes";
import { AuthRoutes } from "./routes/authRoutes";
import { SafetyRoutes } from "./routes/safetyRoutes";
import { SSEService, shutdownSSE } from "./services/sseService";
import { initBackendMQTT, shutdownBackendMQTT, publishControlCommand } from "./services/mqttService";
import { resolveUserFromRequest, checkRolePermission, requireAdmin } from "./middlewares/authMiddleware";
import { formatErrorResponse } from "./middlewares/errorMiddleware";
import { ENV } from "./config/env";
import { HistoryQuerySchema, SyncActionSchema } from "@shared/schemas";
import { SyncService } from "./services/syncService";
import { HistoryModel } from "./models/historyModel";
import { TelemetryController } from "./controllers/telemetryController";

function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        const error = Object.assign(new Error("Payload Too Large"), { statusCode: 413 });
        reject(error);
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400, cause: err }));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, X-User-Role",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, X-User-Role",
    });
    res.end();
    return;
  }

  const reqUrl = req.url || "/";
  const parsedUrl = new URL(reqUrl, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;
  const method = req.method?.toUpperCase();

  try {
    const authUser = resolveUserFromRequest(req);

    // Health Check
    if (pathname === "/api/health" && method === "GET") {
      sendJson(res, 200, { status: "ok", uptime: process.uptime() });
      return;
    }

    // Telemetry Route (ESP32-C5 on-chip internal temperature & sensor status for AI Copilot / Diagnostics)
    if (pathname === "/api/telemetry" && method === "GET") {
      const result = SafetyRoutes.handleGetTelemetry();
      const syncState = SyncService.getState();
      const isSim = syncState.mode === "sim";
      const enhancedBody = {
        ...(typeof result.body === "object" && result.body !== null ? result.body : {}),
        mode: syncState.mode,
        isSimulation: isSim,
        modeName: isSim ? "Mô phỏng (Simulation)" : "Thực tế (Real Hardware)",
        modeDescription: isSim
          ? "Hệ thống đang hoạt động ở chế độ MÔ PHỎNG (Simulation). Dữ liệu nhiệt độ và cảm biến là từ môi trường mô phỏng."
          : "Hệ thống đang hoạt động ở chế độ THỰC TẾ (Real Hardware). Dữ liệu nhiệt độ đo trực tiếp từ cảm biến nội vi tích hợp trên chip ESP32-C5 thật.",
      };
      sendJson(res, result.status, enhancedBody);
      return;
    }

    // Telemetry Ingestion via HTTP POST (ESP32 định kỳ 5s/lần đẩy dữ liệu cảm biến)
    if ((pathname === "/api/telemetry" || pathname === "/api/sensors") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = TelemetryController.handlePostTelemetry(body, req.headers as Record<string, string | string[] | undefined>);
      sendJson(res, result.status, result.body);
      return;
    }

    // Telemetry History Route (Minh chứng database ghi nhận HTTP POST)
    if (pathname === "/api/telemetry/history" && method === "GET") {
      const limit = parsedUrl.searchParams.get("limit") || undefined;
      const result = TelemetryController.handleGetTelemetryHistory({ limit });
      sendJson(res, result.status, result.body);
      return;
    }

    // Delete Telemetry History (Dọn dẹp log trước khi chạy demo)
    if (pathname === "/api/telemetry/history" && method === "DELETE") {
      const result = TelemetryController.handleDeleteTelemetryHistory();
      sendJson(res, result.status, result.body);
      return;
    }

    // Auth Routes (Sign Up & Sign In)
    if (pathname === "/api/auth/register" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = await AuthRoutes.handleRegister(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = await AuthRoutes.handleLogin(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      sendJson(res, 200, { success: true, message: "Đăng xuất thành công" });
      return;
    }

    if (pathname === "/api/auth/forgot-password" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = await AuthRoutes.handleForgotPassword(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/auth/reset-password" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = await AuthRoutes.handleResetPassword(body);
      sendJson(res, result.status, result.body);
      return;
    }

    // Config Routes (GET allowed for all, POST requires 'admin')
    if (pathname === "/api/config") {
      if (method === "GET") {
        sendJson(res, 200, ConfigRoutes.handleGet());
        return;
      }
      if (method === "POST") {
        const adminAuth = requireAdmin(req);
        if ("status" in adminAuth) {
          sendJson(res, adminAuth.status, { success: false, message: adminAuth.error });
          return;
        }
        const perm = checkRolePermission(authUser.role, ["admin"]);
        if (!perm.allowed) {
          sendJson(res, perm.status || 403, { success: false, message: perm.error });
          return;
        }
        const body = await parseJsonBody(req);
        const result = typeof body === "object" && body !== null && (body as Record<string, unknown>).action === "reset"
          ? ConfigRoutes.handleReset()
          : ConfigRoutes.handlePost(body);
        sendJson(res, result.success ? 200 : 400, result);
        return;
      }
    }

    // History Routes (DELETE requires 'admin')
    if (pathname === "/api/history") {
      if (method === "GET") {
        const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
        const validatedQuery = HistoryQuerySchema.safeParse(queryParams);
        if (!validatedQuery.success) {
          sendJson(res, 400, { success: false, message: "Tham số history không hợp lệ", errors: validatedQuery.error.format() });
          return;
        }
        const result = HistoryRoutes.handleGet(validatedQuery.data);
        sendJson(res, 200, result);
        return;
      }
      if (method === "POST") {
        const body = await parseJsonBody(req);
        const result = HistoryRoutes.handlePost(body);
        sendJson(res, result.success ? 201 : 400, result);
        return;
      }
      if (method === "DELETE") {
        const adminAuth = requireAdmin(req);
        if ("status" in adminAuth) {
          sendJson(res, adminAuth.status, { success: false, message: adminAuth.error });
          return;
        }
        sendJson(res, 200, HistoryRoutes.handleDelete());
        return;
      }
    }

    // Stats Routes
    if (pathname === "/api/stats" && method === "GET") {
      sendJson(res, 200, StatsRoutes.handleGet());
      return;
    }

    // Alert Routes (POST requires 'admin')
    if (pathname === "/api/email-alert" && method === "POST") {
      const perm = checkRolePermission(authUser.role, ["admin"]);
      if (!perm.allowed) {
        sendJson(res, perm.status || 403, { success: false, message: perm.error });
        return;
      }
      const body = await parseJsonBody(req);
      const result = await AlertRoutes.handleEmail(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/telegram-alert" && method === "POST") {
      const perm = checkRolePermission(authUser.role, ["admin"]);
      if (!perm.allowed) {
        sendJson(res, perm.status || 403, { success: false, message: perm.error });
        return;
      }
      const body = await parseJsonBody(req);
      const result = await AlertRoutes.handleTelegram(body);
      sendJson(res, result.status, result.body);
      return;
    }

    // AI Copilot Chat Telegram Forward Endpoint
    if (pathname === "/api/chat/telegram" && (method === "POST" || method === "GET")) {
      if (!authUser.isAuthenticated) {
        sendJson(res, 401, { success: false, message: "401 Unauthorized: Vui lòng đăng nhập để sử dụng tính năng này" });
        return;
      }
      let body: { text?: string; title?: string } = {};
      if (method === "POST") {
        body = (await parseJsonBody(req)) as { text?: string; title?: string };
      } else {
        body = {
          text: parsedUrl.searchParams.get("text") || "",
          title: parsedUrl.searchParams.get("title") || undefined,
        };
      }
      const text = body?.text || "";
      const token = ENV.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
      const chatId = ENV.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
      if (!token || !chatId) {
        sendJson(res, 503, {
          success: false,
          message: "Cấu hình Telegram Bot chưa sẵn sàng. Vui lòng thiết lập TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong biến môi trường (.env)."
        });
        return;
      }
      if (!text.trim()) {
        sendJson(res, 400, { success: false, message: "Nội dung tin nhắn không được để trống" });
        return;
      }
      try {
        const header = body?.title ? `[SORTIX-MED] ${body.title.toUpperCase()}` : `[BÁO CÁO SORTIX-MED AI COPILOT]`;
        const formatted = `<b>🤖 ${header}</b>\n━━━━━━━━━━━━━━━━━━━━\n${text}\n━━━━━━━━━━━━━━━━━━━━\n⏰ <i>Gửi từ AI Copilot: ${new Date().toLocaleTimeString("vi-VN")}</i>`;
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: formatted, parse_mode: "HTML" }),
        });
        const tgData = await tgRes.json();
        sendJson(res, 200, { success: true, message: "Đã gửi Telegram thành công", data: tgData });
      } catch (err: unknown) {
        sendJson(res, 500, { success: false, message: "Lỗi kết nối Telegram" });
      }
      return;
    }

    // User & Account Routes (Self-Profile & Change Password)
    if (pathname === "/api/user/profile" || pathname === "/api/user/change-password") {
      if (!authUser.isAuthenticated) {
        sendJson(res, 401, { success: false, message: "Vui lòng đăng nhập để tiếp tục" });
        return;
      }
    }
    const currentUserId = authUser.userId;

    if (pathname === "/api/user/profile") {
      if (method === "GET") {
        const result = UserRoutes.handleGetProfile(currentUserId);
        sendJson(res, result.status, result.body);
        return;
      }
      if (method === "PUT") {
        const body = await parseJsonBody(req);
        const result = UserRoutes.handleUpdateProfile(currentUserId, body);
        sendJson(res, result.status, result.body);
        return;
      }
    }

    if (pathname === "/api/user/change-password" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = await UserRoutes.handleChangePassword(currentUserId, body);
      sendJson(res, result.status, result.body);
      return;
    }

    // Quản trị toàn bộ người dùng (Yêu cầu 'admin')
    if (pathname === "/api/users") {
      const adminAuth = requireAdmin(req);
      if ("status" in adminAuth) {
        sendJson(res, adminAuth.status, { success: false, message: adminAuth.error });
        return;
      }

      if (method === "GET") {
        const result = UserRoutes.handleGetAllUsers();
        sendJson(res, result.status, result.body);
        return;
      }

      if (method === "POST") {
        const body = await parseJsonBody(req);
        const result = await UserRoutes.handleCreateUser(body);
        sendJson(res, result.status, result.body);
        return;
      }
    }

    if (pathname.startsWith("/api/users/")) {
      const targetId = pathname.replace("/api/users/", "").trim();
      if (targetId) {
        const adminAuth = requireAdmin(req);
        if ("status" in adminAuth) {
          sendJson(res, adminAuth.status, { success: false, message: adminAuth.error });
          return;
        }

        if (method === "PUT") {
          const body = await parseJsonBody(req);
          const result = await UserRoutes.handleUpdateUser(targetId, body);
          sendJson(res, result.status, result.body);
          return;
        }

        if (method === "DELETE") {
          const result = UserRoutes.handleDeleteUser(targetId, authUser.userId);
          sendJson(res, result.status, result.body);
          return;
        }
      }
    }

    // SSE Stream Route (Server-Sent Events)
    if (pathname === "/api/events" && method === "GET") {
      SSEService.addClient(res);
      return;
    }

    // Safety & Emergency Stop Routes
    if (pathname === "/api/safety/status" && method === "GET") {
      const result = SafetyRoutes.handleGetStatus();
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/safety/estop" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostEstop(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/safety/jam" && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostJam(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/bin-full" || pathname === "/api/storage/bin-status") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostBinFull(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/temp-warning" || pathname === "/api/telemetry/temp") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostTemperatureWarning(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/device-offline" || pathname === "/api/device/offline") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostDeviceOffline(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/heartbeat" || pathname === "/api/heartbeat" || pathname === "/api/telemetry/heartbeat") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostHeartbeat(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/shift-summary" || pathname === "/api/shift/summary") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostShiftSummary(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/mqtt-disconnected" || pathname === "/api/mqtt/disconnected") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostMqttDisconnected(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if ((pathname === "/api/safety/mqtt-connected" || pathname === "/api/mqtt/connected") && method === "POST") {
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostMqttConnected(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === "/api/safety/unlock" && method === "POST") {
      const adminAuth = requireAdmin(req);
      if ("status" in adminAuth) {
        sendJson(res, adminAuth.status, { success: false, message: adminAuth.error });
        return;
      }
      const body = await parseJsonBody(req);
      const result = SafetyRoutes.handlePostUnlock(
        { userId: authUser.userId, username: authUser.username || authUser.userId, role: authUser.role },
        body
      );
      sendJson(res, result.status, result.body);
      return;
    }

    // Notifications Route
    if (pathname === "/api/notifications" && method === "GET") {
      const statusParam = parsedUrl.searchParams.get("status") || undefined;
      const result = SafetyRoutes.handleGetNotifications(statusParam);
      sendJson(res, result.status, result.body);
      return;
    }

    // Bins Status Route (Cross-Device Real-time Tray Capacity & Counts for AI & Clients)
    if (pathname === "/api/bins" && method === "GET") {
      const state = SyncService.getState();
      const binCounts = state.binCounts || { bin1: 0, bin2: 0, bin3: 0 };
      const binCapacities = state.binCapacities || { bin1: 38, bin2: 50, bin3: 50 };
      const totalInBins = (binCounts.bin1 || 0) + (binCounts.bin2 || 0) + (binCounts.bin3 || 0);
      const isSim = state.mode === "sim";
      const r1 = Number(((binCounts.bin1 / (binCapacities.bin1 || 1)) * 100).toFixed(1));
      const r2 = Number(((binCounts.bin2 / (binCapacities.bin2 || 1)) * 100).toFixed(1));
      const r3 = Number(((binCounts.bin3 / (binCapacities.bin3 || 1)) * 100).toFixed(1));

      sendJson(res, 200, {
        success: true,
        mode: state.mode,
        isSimulation: isSim,
        modeName: isSim ? "Mô phỏng (Simulation)" : "Thực tế (Real Hardware)",
        modeDescription: isSim
          ? "Hệ thống đang hoạt động ở chế độ MÔ PHỎNG (Simulation). Dữ liệu 3 khay chứa là từ phần mềm mô phỏng."
          : "Hệ thống đang hoạt động ở chế độ THỰC TẾ (Real Hardware). Dữ liệu 3 khay chứa là từ dây chuyền phân loại thực tế.",
        binCounts,
        binCapacities,
        totalInBins,
        current_counts: binCounts,
        capacities: binCapacities,
        fillRates: {
          bin1: r1,
          bin2: r2,
          bin3: r3,
        },
        fillPercentages: {
          bin1: `${r1}%`,
          bin2: `${r2}%`,
          bin3: `${r3}%`,
        },
        trayStatus: {
          bin1: {
            name: "Khay 1 (Dao mổ & Kéo phẫu thuật)",
            count: binCounts.bin1,
            capacity: binCapacities.bin1,
            rate: r1,
            colorCode: binCounts.bin1 >= binCapacities.bin1 ? "🔴 ĐỎ (ĐẦY 100%)" : r1 >= 80 ? "🟡 VÀNG CAM (CẢNH BÁO >80%)" : "🟢 XANH LÁ (BÌNH THƯỜNG)",
            status: binCounts.bin1 >= binCapacities.bin1 ? "100% ĐẦY (CẦN THAY NGAY)" : r1 >= 80 ? "CẢNH BÁO (>80% ĐỊNH MỨC)" : "Bình thường / An toàn",
          },
          bin2: {
            name: "Khay 2 (Kẹp panh cầm máu)",
            count: binCounts.bin2,
            capacity: binCapacities.bin2,
            rate: r2,
            colorCode: binCounts.bin2 >= binCapacities.bin2 ? "🔴 ĐỎ (ĐẦY 100%)" : r2 >= 80 ? "🟡 VÀNG CAM (CẢNH BÁO >80%)" : "🟢 XANH LÁ (BÌNH THƯỜNG)",
            status: binCounts.bin2 >= binCapacities.bin2 ? "100% ĐẦY (CẦN THAY NGAY)" : r2 >= 80 ? "CẢNH BÁO (>80% ĐỊNH MỨC)" : "Bình thường / An toàn",
          },
          bin3: {
            name: "Khay 3 (Dụng cụ đặc biệt / Mặc định)",
            count: binCounts.bin3,
            capacity: binCapacities.bin3,
            rate: r3,
            colorCode: binCounts.bin3 >= binCapacities.bin3 ? "🔴 ĐỎ (ĐẦY 100%)" : r3 >= 80 ? "🟡 VÀNG CAM (CẢNH BÁO >80%)" : "🟢 XANH LÁ (BÌNH THƯỜNG)",
            status: binCounts.bin3 >= binCapacities.bin3 ? "100% ĐẦY (CẦN THAY NGAY)" : r3 >= 80 ? "CẢNH BÁO (>80% ĐỊNH MỨC)" : "Bình thường / An toàn",
          },
        },
        isRunning: state.isRunning,
        speed: state.speed,
        updatedAt: state.updatedAt,
      });
      return;
    }

    // Sync Routes (Cross-Device Realtime Sync)
    if (pathname === "/api/sync" && method === "GET") {
      sendJson(res, 200, {
        success: true,
        state: SyncService.getState(),
        history: HistoryModel.getAll(),
      });
      return;
    }

    // Control Route (Send command to hardware over MQTT via server)
    if (pathname === "/api/control" && method === "POST") {
      if (!authUser.isAuthenticated) {
        sendJson(res, 401, { success: false, message: "401 Unauthorized: Vui lòng đăng nhập để gửi lệnh điều khiển" });
        return;
      }
      const body = (await parseJsonBody(req)) as Record<string, unknown>;
      const command = typeof body?.command === "string" ? body.command.trim() : "";
      const value = typeof body?.value === "number" && Number.isFinite(body.value) ? body.value : null;

      if (!command) {
        sendJson(res, 400, { success: false, message: "Lệnh command không được để trống" });
        return;
      }

      if (command === "ESTOP_RELEASE" && authUser.role !== "admin") {
        sendJson(res, 403, { success: false, message: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền mở khóa an toàn" });
        return;
      }

      const published = publishControlCommand(command, value);
      sendJson(res, 200, {
        success: true,
        message: `Lệnh '${command}' đã được gửi an toàn tới thiết bị qua server`,
        command,
        dispatched: published,
      });
      return;
    }

    if (pathname === "/api/sync" && method === "POST") {
      if (!authUser.isAuthenticated) {
        sendJson(res, 401, { success: false, error: "401 Unauthorized: Vui lòng đăng nhập để thực hiện đồng bộ" });
        return;
      }
      const body = await parseJsonBody(req);
      const validated = SyncActionSchema.safeParse(body);
      if (!validated.success) {
        sendJson(res, 400, { success: false, error: "Invalid sync action payload", details: validated.error.format() });
        return;
      }
      const action = validated.data;
      const { type } = action;
      const currentState = SyncService.getState();

      if (type === "update_state") {
        if (currentState.mode === "real" && authUser.role !== "admin") {
          sendJson(res, 403, { success: false, error: "Chỉ Quản trị viên mới có quyền cập nhật trạng thái hệ thống trong chế độ Thực tế" });
          return;
        }
        const updated = SyncService.updateState(action.state, action.senderId);
        sendJson(res, 200, { success: true, state: updated });
        return;
      }
      if (type === "sync_records") {
        if (currentState.mode === "real" && authUser.role !== "admin") {
          sendJson(res, 403, { success: false, error: "Chỉ Quản trị viên mới có quyền đồng bộ ghi đè lịch sử sản xuất thực tế" });
          return;
        }
        SyncService.syncRecords(action.records, action.binCounts, action.brandCounts, action.senderId);
        sendJson(res, 200, { success: true, state: SyncService.getState() });
        return;
      }
      if (type === "clear_history") {
        if (authUser.role !== "admin") {
          sendJson(res, 403, { success: false, error: "Truy cập bị từ chối: Thao tác xóa lịch sử yêu cầu quyền Quản trị viên (Admin)" });
          return;
        }
        SyncService.clearHistory(action.senderId);
        sendJson(res, 200, { success: true, state: SyncService.getState() });
        return;
      }
      if (type === "spawn_item") {
        if (currentState.mode !== "sim") {
          sendJson(res, 400, { success: false, error: "Hành động spawn_item chỉ được phép trong chế độ Mô phỏng (Simulation mode)" });
          return;
        }
        SyncService.spawnItem(action.item, action.senderId);
        sendJson(res, 200, { success: true });
        return;
      }
      sendJson(res, 400, { success: false, error: "Invalid sync action type" });
      return;
    }

    // 404 Not Found
    sendJson(res, 404, { success: false, message: "Route Not Found" });
  } catch (err: unknown) {
    const statusCode = typeof err === "object" && err !== null && "statusCode" in err &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;
    sendJson(res, statusCode, formatErrorResponse(err, statusCode === 400 ? "Bad Request" : undefined));
  }
});

if (require.main === module) {
  initBackendMQTT();
  server.listen(ENV.PORT, () => {
    console.log(`[SortiX Backend] Running on http://localhost:${ENV.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[SortiX Backend] Nhận ${signal}, đang đóng server an toàn...`);
    shutdownBackendMQTT();
    shutdownSSE();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

export { server };
