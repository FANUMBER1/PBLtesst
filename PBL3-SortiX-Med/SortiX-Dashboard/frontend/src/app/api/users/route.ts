import { NextResponse } from "next/server";
import { AdminCreateUserSchema } from "@shared/schemas";
import { NextUsersStore, toSafeUser } from "./store";
import { getAdminUser } from "../auth/session";

export async function GET(request: Request) {
  const auth = getAdminUser(request);
  if (!auth) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }

  const users = NextUsersStore.getAll();
  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: Request) {
  const auth = getAdminUser(request);
  if (!auth) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parseResult = AdminCreateUserSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const input = parseResult.data;
    if (NextUsersStore.findByUsername(input.username)) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập đã tồn tại trong hệ thống" },
        { status: 400 }
      );
    }
    if (NextUsersStore.findByEmail(input.email)) {
      return NextResponse.json(
        { success: false, message: "Địa chỉ email đã được sử dụng" },
        { status: 400 }
      );
    }

    const newUser = NextUsersStore.create({
      full_name: input.full_name,
      username: input.username,
      email: input.email,
      password_hash: input.password,
      role: input.role,
      status: input.status,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tạo tài khoản người dùng thành công",
        data: toSafeUser(newUser),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý tạo người dùng";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
