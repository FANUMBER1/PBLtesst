import { NextResponse } from "next/server";
import { AdminUpdateUserSchema } from "@shared/schemas";
import { NextUsersStore, toSafeUser } from "../store";
import { getAdminUser } from "../../auth/session";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await props.params;
    const targetId = params.id;
    const user = NextUsersStore.findById(targetId) || NextUsersStore.findByUsername(targetId);
    if (!user) {
      return NextResponse.json({ success: false, message: "Tài khoản không tồn tại" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: toSafeUser(user) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tìm thông tin tài khoản";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = getAdminUser(request);
  if (!auth) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }

  try {
    const params = await props.params;
    const targetId = params.id;

    const body = await request.json();
    const parseResult = AdminUpdateUserSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const input = parseResult.data;
    const targetUser = NextUsersStore.findById(targetId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "Tài khoản không tồn tại" }, { status: 404 });
    }

    if (input.email && input.email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const conflict = NextUsersStore.findByEmail(input.email);
      if (conflict && conflict.id !== targetId) {
        return NextResponse.json(
          { success: false, message: "Địa chỉ email đã được sử dụng bởi tài khoản khác" },
          { status: 400 }
        );
      }
    }

    const updated = NextUsersStore.update(targetId, {
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      status: input.status,
      password_hash: input.new_password ? input.new_password : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, message: "Không thể cập nhật tài khoản" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin tài khoản thành công",
      data: toSafeUser(updated),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý cập nhật người dùng";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = getAdminUser(request);
  if (!auth) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }

  try {
    const params = await props.params;
    const targetId = params.id;

    const result = NextUsersStore.delete(targetId, auth.id);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: { id: targetId },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý xóa người dùng";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
