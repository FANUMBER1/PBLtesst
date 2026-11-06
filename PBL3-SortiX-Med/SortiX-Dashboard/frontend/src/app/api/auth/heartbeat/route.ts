import { NextResponse } from "next/server";
import { NextUsersStore, toSafeUser } from "@/app/api/users/store";
import { getAuthenticatedUser } from "../session";

export async function POST(request: Request) {
  try {
    let user = getAuthenticatedUser(request);
    if (!user) {
      try {
        const body = await request.clone().json();
        if (body?.userId) {
          user = NextUsersStore.findById(body.userId) || null;
        } else if (body?.username) {
          user = NextUsersStore.findByUsername(body.username) || null;
        }
      } catch {
        // body not json
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    // Cập nhật trạng thái online và thời gian hoạt động thực tế
    NextUsersStore.setOnline(user.id, true);
    const refreshed = NextUsersStore.findById(user.id) || user;

    return NextResponse.json({
      success: true,
      data: toSafeUser(refreshed),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Lỗi heartbeat" },
      { status: 500 }
    );
  }
}
