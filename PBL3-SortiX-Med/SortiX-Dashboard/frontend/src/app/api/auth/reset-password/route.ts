import { NextResponse } from "next/server";
import { ResetPasswordSchema } from "@shared/schemas";
import { NextUsersStore, toSafeUser } from "@/app/api/users/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = ResetPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { identifier, otp, new_password } = parseResult.data;

    const result = NextUsersStore.resetPasswordWithOtp(identifier, otp, new_password);

    if (!result.success || !result.user) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.",
        data: toSafeUser(result.user),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý đặt lại mật khẩu";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
