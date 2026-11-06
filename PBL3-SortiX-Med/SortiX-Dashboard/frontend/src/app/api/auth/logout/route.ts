import { NextResponse } from "next/server";
import { NextUsersStore } from "@/app/api/users/store";
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

    if (user) {
      NextUsersStore.setOnline(user.id, false);
    }
    return NextResponse.json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Lỗi xử lý đăng xuất" },
      { status: 500 }
    );
  }
}
