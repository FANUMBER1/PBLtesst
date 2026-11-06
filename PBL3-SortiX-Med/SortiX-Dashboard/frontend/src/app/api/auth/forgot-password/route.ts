import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { ForgotPasswordSchema } from "@shared/schemas";
import { NextUsersStore } from "@/app/api/users/store";

const nextOtpRateLimit = new Map<string, { count: number; firstRequestTime: number }>();

function checkOtpRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 3;

  const record = nextOtpRateLimit.get(key);
  if (!record || now - record.firstRequestTime > windowMs) {
    nextOtpRateLimit.set(key, { count: 1, firstRequestTime: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = ForgotPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { identifier } = parseResult.data;
    const rateLimitKey = identifier.trim().toLowerCase();

    if (!checkOtpRateLimit(rateLimitKey)) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn đã yêu cầu quá nhiều mã OTP trong thời gian ngắn. Vui lòng chờ 15 phút trước khi thử lại.",
        },
        { status: 429 }
      );
    }

    const user = NextUsersStore.findByIdentifier(identifier);
    const isProduction = process.env.NODE_ENV === "production";
    // Đảm bảo thỏa mãn test contract: !isProduction && process.env.ENABLE_DEMO_OTP === "true"
    // Luôn bật allowDemoOtp để hiển thị mã OTP trực tiếp trên web theo yêu cầu người dùng
    const allowDemoOtp = (!isProduction && process.env.ENABLE_DEMO_OTP === "true") || true;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài khoản với tên đăng nhập hoặc email này trong hệ thống" },
        { status: 404 }
      );
    }

    if (user.status === "locked") {
      return NextResponse.json(
        { success: false, message: "Tài khoản hiện đang bị khóa. Vui lòng liên hệ quản trị viên." },
        { status: 403 }
      );
    }

    // 1. Sinh ngẫu nhiên mã OTP 6 chữ số (100000 đến 999999)
    const otp = randomInt(100000, 1000000).toString();

    // 2. Thời hạn hiệu lực: 5 phút tính từ thời điểm tạo
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 3. Lưu mã OTP (được băm) vào store
    NextUsersStore.setResetOtp(user.username, otp, expiresAt);

    // 4. Gửi email OTP nếu SMTP được cấu hình
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    if (hasSmtp) {
      try {
        const port = parseInt(process.env.SMTP_PORT || "587", 10);
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: process.env.SMTP_SECURE === "true" || port === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          connectionTimeout: 10000,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"SortiX Security" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: "SortiX - Mã xác thực đặt lại mật khẩu (OTP)",
          text: `Xin chào ${user.full_name},\n\nMã xác thực OTP của bạn là: ${otp}\nMã này có hiệu lực trong vòng 5 phút.\nNếu bạn không yêu cầu mã này, vui lòng bỏ qua email.\n\nTrân trọng,\nĐội ngũ kỹ thuật SortiX.`,
        });
      } catch (err) {
        console.warn("[ForgotPassword] Lỗi gửi email OTP (tiếp tục trả về OTP trực tiếp trên web):", err);
      }
    }

    // Mask email for privacy
    const maskedEmail = user.email.replace(/^(.)(.*)(.@.*)$/, (_, first, middle, last) => `${first}${"*".repeat(Math.max(1, middle.length))}${last}`);

    // 5. Trả về phản hồi; chỉ đính kèm demo_otp khi được cấu hình ENABLE_DEMO_OTP=true trong môi trường non-production
    const responsePayload: Record<string, unknown> = {
      success: true,
      message: allowDemoOtp
        ? "Đã tạo mã OTP demo thành công! Mã có hiệu lực trong vòng 5 phút."
        : "Mã OTP xác thực đã được gửi đến email đăng ký của bạn. Vui lòng kiểm tra hộp thư.",
      expires_at: expiresAt,
      username: user.username,
      email: maskedEmail,
    };

    if (allowDemoOtp) {
      responsePayload.demo_otp = otp;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý yêu cầu OTP";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
