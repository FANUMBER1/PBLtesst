import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { RegisterSchema } from "@shared/schemas";
import { NextUsersStore, toSafeUser } from "@/app/api/users/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = RegisterSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { full_name, username, email, password } = parseResult.data;
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Kiểm tra chống trùng lặp username trong kho tài khoản đồng bộ
    const existsUser = NextUsersStore.findByUsername(trimmedUsername);
    if (existsUser) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập đã tồn tại trong hệ thống" },
        { status: 400 }
      );
    }

    // 2. Kiểm tra chống trùng lặp email
    const existsEmail = NextUsersStore.findByEmail(trimmedEmail);
    if (existsEmail) {
      return NextResponse.json(
        { success: false, message: "Địa chỉ email đã được đăng ký tài khoản" },
        { status: 400 }
      );
    }

    // 3. Tạo tài khoản người dùng mới (BẢO MẬT: Luôn gán cứng role = 'user' chống leo thang đặc quyền)
    // Tự động lưu bền vững vào data/users.json và đồng bộ hiển thị sang bảng Admin
    const newUser = NextUsersStore.create({
      username: trimmedUsername,
      full_name: full_name.trim(),
      email: trimmedEmail,
      password_hash: await bcrypt.hash(password, 12),
      role: "user", // BẢO MẬT: Luôn gán cứng role = 'user'
      status: "active",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.",
        data: toSafeUser(newUser),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý đăng ký";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
