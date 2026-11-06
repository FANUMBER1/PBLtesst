import { NextResponse } from "next/server";
import { SyncService } from "@/services/syncService";
import { SyncActionSchema } from "@shared/schemas";
import { HistoryModel } from "@/services/historyService";
import { getAuthenticatedUser } from "@/app/api/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = SyncService.getState();
    const history = HistoryModel.getAll();
    return NextResponse.json({
      success: true,
      state,
      history,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "401 Unauthorized: Vui lòng đăng nhập để thực hiện đồng bộ" },
        { status: 401 }
      );
    }

    const action = SyncActionSchema.parse(await request.json());
    const { type } = action;

    const currentState = SyncService.getState();

    if (type === "update_state") {
        if (currentState.mode === "real" && user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Chỉ Quản trị viên mới có quyền cập nhật trạng thái hệ thống trong chế độ Thực tế" },
            { status: 403 }
          );
        }
        const state = SyncService.updateState(action.state, action.senderId);
        return NextResponse.json({ success: true, state });
    }
    if (type === "sync_records") {
        if (currentState.mode === "real" && user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Chỉ Quản trị viên mới có quyền đồng bộ ghi đè lịch sử sản xuất thực tế" },
            { status: 403 }
          );
        }
        SyncService.syncRecords(action.records, action.binCounts, action.brandCounts, action.senderId);
        return NextResponse.json({ success: true, state: SyncService.getState() });
    }
    if (type === "clear_history") {
        if (user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Truy cập bị từ chối: Thao tác xóa lịch sử yêu cầu quyền Quản trị viên (Admin)" },
            { status: 403 }
          );
        }
        SyncService.clearHistory(action.senderId);
        return NextResponse.json({ success: true, state: SyncService.getState() });
    }
    if (type === "spawn_item") {
        if (currentState.mode !== "sim") {
          return NextResponse.json(
            { success: false, error: "Hành động spawn_item chỉ được phép trong chế độ Mô phỏng (Simulation mode)" },
            { status: 400 }
          );
        }
        SyncService.spawnItem(action.item, action.senderId);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid sync action type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad Request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
