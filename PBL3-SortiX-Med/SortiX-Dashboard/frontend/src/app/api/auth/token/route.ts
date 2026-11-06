import { NextResponse } from "next/server";
import { NextUsersStore } from "@/app/api/users/store";
import { createSessionToken, getAuthenticatedUser } from "../session";

export async function POST(request: Request) {
  try {
    // Chỉ cho phép làm mới phiên dựa trên Authorization Bearer token đã ký hợp lệ.
    // Tuyệt đối không cấp token dựa trên id, username hoặc role do client tự gửi lên trong body.
    const authenticatedUser = getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Phiên làm việc không hợp lệ, đã hết hạn hoặc tài khoản bị khóa. Vui lòng đăng nhập lại.",
        },
        { status: 401 }
      );
    }

    // Xác minh lại trạng thái mới nhất từ kho dữ liệu
    const freshUser = NextUsersStore.findById(authenticatedUser.id);
    if (!freshUser || freshUser.status !== "active" || freshUser.role !== authenticatedUser.role) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản không tồn tại, đã bị khóa hoặc thay đổi phân quyền. Vui lòng đăng nhập lại.",
        },
        { status: 403 }
      );
    }

    NextUsersStore.setOnline(freshUser.id, true);
    const token = createSessionToken({
      id: freshUser.id,
      username: freshUser.username,
      role: freshUser.role,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: freshUser.id,
        username: freshUser.username,
        full_name: freshUser.full_name,
        email: freshUser.email,
        role: freshUser.role,
        status: freshUser.status,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi cấp token";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

