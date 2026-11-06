import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { UserModel, toSafeUser } from "../models/userModel";
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  RegisterSchema,
  LoginSchema,
  AdminCreateUserSchema,
  AdminUpdateUserSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@shared/schemas";
import { SafeUser } from "@shared/types";
import { createAuthToken } from "./authToken";

const otpRequestRateLimit = new Map<string, { count: number; firstRequestTime: number }>();

function checkOtpRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 phút
  const maxRequests = 3;

  const record = otpRequestRateLimit.get(key);
  if (!record || now - record.firstRequestTime > windowMs) {
    otpRequestRateLimit.set(key, { count: 1, firstRequestTime: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export const UserService = {
  getProfile(userId: string): ServiceResult<SafeUser> {
    const user = UserModel.findById(userId);
    if (!user) {
      return { success: false, message: "Không tìm thấy thông tin tài khoản người dùng" };
    }
    return { success: true, data: toSafeUser(user) };
  },

  getAllUsers(): ServiceResult<SafeUser[]> {
    return { success: true, data: UserModel.getAll() };
  },

  updateProfile(userId: string, rawInput: unknown): ServiceResult<SafeUser> {
    // 1. Validate payload qua Zod Schema
    const parseResult = UpdateProfileSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const input = parseResult.data;
    const currentUser = UserModel.findById(userId);
    if (!currentUser) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }

    // 2. Chống xung đột Username
    if (input.username && input.username.toLowerCase() !== currentUser.username.toLowerCase()) {
      const conflictUser = UserModel.findByUsername(input.username);
      if (conflictUser && conflictUser.id !== userId) {
        return { success: false, message: "Tên đăng nhập đã được sử dụng bởi tài khoản khác" };
      }
    }

    // 3. Chống xung đột Email
    if (input.email && input.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const conflictEmail = UserModel.findByEmail(input.email);
      if (conflictEmail && conflictEmail.id !== userId) {
        return { success: false, message: "Địa chỉ email đã được sử dụng bởi tài khoản khác" };
      }
    }

    // 4. Cập nhật dữ liệu
    const updated = UserModel.updateProfile(userId, input);
    if (!updated) {
      return { success: false, message: "Lỗi trong quá trình cập nhật hồ sơ" };
    }

    return {
      success: true,
      data: toSafeUser(updated),
      message: "Cập nhật thông tin tài khoản thành công",
    };
  },

  async changePassword(userId: string, rawInput: unknown): Promise<ServiceResult<{ updated_at: string }>> {
    // 1. Validate payload qua Zod Schema (đã bao gồm check độ phức tạp & xác nhận mật khẩu)
    const parseResult = ChangePasswordSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const input = parseResult.data;
    const user = UserModel.findById(userId);
    if (!user) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }

    // 2. So sánh mật khẩu hiện tại bằng Bcrypt (chống timing attack)
    const isCurrentValid = await bcrypt.compare(input.current_password, user.password_hash);
    if (!isCurrentValid) {
      return { success: false, message: "Mật khẩu hiện tại không chính xác" };
    }

    // 3. Băm mật khẩu mới với Salt Rounds 12
    const newPasswordHash = await bcrypt.hash(input.new_password, 12);

    // 4. Cập nhật vào DB/Model
    const updated = UserModel.updatePassword(userId, newPasswordHash);
    if (!updated) {
      return { success: false, message: "Không thể lưu mật khẩu mới" };
    }

    return {
      success: true,
      data: { updated_at: updated.updated_at },
      message: "Đổi mật khẩu thành công",
    };
  },

  async register(rawInput: unknown): Promise<ServiceResult<SafeUser>> {
    // 1. Validate payload qua RegisterSchema
    const parseResult = RegisterSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const input = parseResult.data;

    // 2. Chống trùng lặp Username
    if (UserModel.findByUsername(input.username)) {
      return { success: false, message: "Tên đăng nhập đã tồn tại trong hệ thống" };
    }

    // 3. Chống trùng lặp Email
    if (UserModel.findByEmail(input.email)) {
      return { success: false, message: "Địa chỉ email đã được đăng ký tài khoản" };
    }

    // 4. Băm mật khẩu bằng Bcrypt với 12 salt rounds
    const passwordHash = await bcrypt.hash(input.password, 12);

    // 5. Lưu người dùng mới vào Model/DB (BẢO MẬT: UserModel.createUser luôn gán role = 'user')
    const newUser = UserModel.createUser({
      full_name: input.full_name,
      username: input.username,
      email: input.email,
      password_hash: passwordHash,
    });

    return {
      success: true,
      data: toSafeUser(newUser),
      message: "Đăng ký tài khoản thành công!",
    };
  },

  async login(rawInput: unknown): Promise<ServiceResult<{ user: SafeUser; token: string }>> {
    // 1. Validate payload qua LoginSchema
    const parseResult = LoginSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const input = parseResult.data;

    // 2. Tìm người dùng theo Username hoặc Email
    const user = UserModel.findByUsername(input.identifier) || UserModel.findByEmail(input.identifier);
    if (!user) {
      return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác" };
    }

    // 3. Kiểm tra trạng thái tài khoản
    if (user.status === "locked") {
      return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác" };
    }

    if (input.password === "123456") {
      return { success: false, message: "Mật khẩu mặc định '123456' đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng sử dụng mật khẩu mạnh được cấp hoặc đổi mật khẩu." };
    }

    // Mật khẩu chỉ được xác minh bằng Bcrypt hash đã lưu.
    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác" };
    }

    const token = createAuthToken(user);

    return {
      success: true,
      data: {
        user: toSafeUser(user),
        token,
      },
      message: "Đăng nhập thành công",
    };
  },

  async adminCreateUser(rawInput: unknown): Promise<ServiceResult<SafeUser>> {
    const parseResult = AdminCreateUserSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const input = parseResult.data;

    // Chống trùng username
    if (UserModel.findByUsername(input.username)) {
      return { success: false, message: "Tên đăng nhập đã tồn tại trong hệ thống" };
    }

    // Chống trùng email
    if (UserModel.findByEmail(input.email)) {
      return { success: false, message: "Địa chỉ email đã được sử dụng" };
    }

    // Băm mật khẩu
    const passwordHash = await bcrypt.hash(input.password, 10);

    const newUser = UserModel.adminCreateUser({
      full_name: input.full_name,
      username: input.username,
      email: input.email,
      password_hash: passwordHash,
      role: input.role,
      status: input.status,
    });

    return {
      success: true,
      data: toSafeUser(newUser),
      message: "Tạo tài khoản người dùng thành công",
    };
  },

  async adminUpdateUser(targetId: string, rawInput: unknown): Promise<ServiceResult<SafeUser>> {
    const parseResult = AdminUpdateUserSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const input = parseResult.data;
    const targetUser = UserModel.findById(targetId);
    if (!targetUser) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }

    // Chống trùng email nếu đổi email
    if (input.email && input.email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const conflict = UserModel.findByEmail(input.email);
      if (conflict && conflict.id !== targetId) {
        return { success: false, message: "Địa chỉ email đã được sử dụng bởi tài khoản khác" };
      }
    }

    // Băm mật khẩu mới nếu admin yêu cầu reset
    let passwordHash: string | undefined;
    if (input.new_password) {
      passwordHash = await bcrypt.hash(input.new_password, 10);
    }

    const updated = UserModel.adminUpdateUser(targetId, {
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      status: input.status,
      password_hash: passwordHash,
    });

    if (!updated) {
      return { success: false, message: "Không thể cập nhật tài khoản" };
    }

    return {
      success: true,
      data: toSafeUser(updated),
      message: "Cập nhật thông tin tài khoản thành công",
    };
  },

  adminDeleteUser(targetId: string, currentAdminId: string): ServiceResult<{ id: string }> {
    const result = UserModel.adminDeleteUser(targetId, currentAdminId);
    if (!result.success) {
      return { success: false, message: result.message };
    }
    return { success: true, data: { id: targetId }, message: result.message };
  },

  async forgotPassword(rawInput: unknown): Promise<ServiceResult<{ demo_otp?: string; expires_at?: string; username?: string; email?: string }>> {
    const parseResult = ForgotPasswordSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const { identifier } = parseResult.data;
    const rateLimitKey = identifier.trim().toLowerCase();
    if (!checkOtpRateLimit(rateLimitKey)) {
      return {
        success: false,
        message: "Bạn đã yêu cầu quá nhiều mã OTP trong thời gian ngắn. Vui lòng chờ 15 phút trước khi thử lại.",
      };
    }

    const user = UserModel.findByIdentifier(identifier);
    const isProduction = process.env.NODE_ENV === "production";
    const allowDemoOtp = !isProduction && process.env.ENABLE_DEMO_OTP === "true";

    // BẢO MẬT: Tránh tiết lộ tài khoản có tồn tại hay không trong môi trường production
    if (!user || user.status === "locked" || user.role === "admin") {
      if (isProduction) {
        return {
          success: true,
          message: "Nếu thông tin khớp với tài khoản hợp lệ trong hệ thống, mã OTP đã được gửi đến email đăng ký.",
        };
      }
      if (!user) {
        return { success: false, message: "Không tìm thấy tài khoản với tên đăng nhập hoặc email này" };
      }
      if (user.status === "locked") {
        return { success: false, message: "Tài khoản hiện đang bị khóa. Vui lòng liên hệ quản trị viên." };
      }
      return {
        success: false,
        message: "Vì lý do an toàn bảo mật, tài khoản Quản trị viên (Admin) chỉ có thể đổi mật khẩu sau khi đã đăng nhập vào hệ thống.",
      };
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Lưu mã OTP (được băm) vào store
    UserModel.setResetOtp(user.username, otp, expiresAt);

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
        console.error("[UserService] Lỗi khi gửi email OTP:", err);
        return {
          success: false,
          message: "Không thể gửi email OTP đến hộp thư của bạn. Vui lòng thử lại sau.",
        };
      }
    } else if (isProduction) {
      return {
        success: false,
        message: "Dịch vụ máy chủ thư tín (SMTP) chưa được cấu hình trên môi trường sản xuất.",
      };
    }

    const maskedEmail = user.email.replace(/^(.)(.*)(.@.*)$/, (_, first, middle, last) => `${first}${"*".repeat(Math.max(1, middle.length))}${last}`);

    const responseData: { demo_otp?: string; expires_at: string; username: string; email: string } = {
      expires_at: expiresAt,
      username: user.username,
      email: maskedEmail,
    };
    if (allowDemoOtp) {
      responseData.demo_otp = otp;
    }

    return {
      success: true,
      data: responseData,
      message: allowDemoOtp
        ? "Đã tạo mã OTP demo thành công! Mã có hiệu lực trong vòng 5 phút."
        : "Mã OTP xác thực đã được gửi đến email đăng ký của bạn. Vui lòng kiểm tra hộp thư.",
    };
  },

  async resetPassword(rawInput: unknown): Promise<ServiceResult<SafeUser>> {
    const parseResult = ResetPasswordSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return { success: false, message: errorMsg };
    }

    const { identifier, otp, new_password } = parseResult.data;
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    const result = UserModel.resetPasswordWithOtp(identifier, otp, newPasswordHash);

    if (!result.success || !result.user) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      data: toSafeUser(result.user),
      message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới",
    };
  },
};
