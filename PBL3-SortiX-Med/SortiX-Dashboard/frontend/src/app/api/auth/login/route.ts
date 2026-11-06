import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { LoginSchema } from "@shared/schemas";
import { NextUsersStore, toSafeUser } from "@/app/api/users/store";
import { createSessionToken } from "../session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { identifier, password } = parseResult.data;
    const trimmed = identifier.trim().toLowerCase();

    // 1. Tìm user trong kho lưu trữ bền vững NextUsersStore (chứa cả Admin và User mới tạo)
    const user =
      NextUsersStore.findByUsername(trimmed) ||
      NextUsersStore.findByEmail(trimmed);

    if (user) {
      if (user.status === "locked") {
        return NextResponse.json(
          { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." },
          { status: 400 }
        );
      }

      if (password === "123456") {
        return NextResponse.json(
          {
            success: false,
            message: "Mật khẩu mặc định '123456' đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng sử dụng mật khẩu mạnh được cấp hoặc đổi mật khẩu.",
          },
          { status: 403 }
        );
      }

      const isMatch = NextUsersStore.verifyPassword(user, password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." },
          { status: 400 }
        );
      }

      NextUsersStore.setOnline(user.id, true);
      const updatedUser = NextUsersStore.findById(user.id) || user;

      const token = createSessionToken(updatedUser);

      return NextResponse.json({
        success: true,
        message: "Đăng nhập thành công",
        data: {
          user: toSafeUser(updatedUser),
          token,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý đăng nhập";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
