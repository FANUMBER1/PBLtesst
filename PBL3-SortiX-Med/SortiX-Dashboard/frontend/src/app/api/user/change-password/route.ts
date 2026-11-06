import { NextResponse } from "next/server";
import { ChangePasswordSchema } from "@shared/schemas";
import { NextUsersStore } from "@/app/api/users/store";
import { getAuthenticatedUser } from "../../auth/session";

export async function POST(request: Request) {
  try {
    const authenticatedUser = getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập để đổi mật khẩu" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { current_password, new_password } = parseResult.data;

    // Tìm user trong NextUsersStore hoặc theo ID/Email/Username
    const user = authenticatedUser;

    // Kiểm tra mật khẩu hiện tại bằng phương thức verifyPassword chuẩn
    const isCurrentValid = NextUsersStore.verifyPassword(user, current_password);

    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu hiện tại không chính xác" },
        { status: 400 }
      );
    }

    // Cập nhật mật khẩu mới vào store bền vững (users.json) và danh sách demo
    NextUsersStore.update(user.id, {
      password_hash: new_password,
    });

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công!",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi xử lý đổi mật khẩu";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
