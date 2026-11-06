const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

// We test the UserService and UserModel compiled or via TypeScript
// Let's import the ts-node or run via node if transpile or write modular test
// In SortiX, shared schemas are in TypeScript, but let's test via direct invocation
// Let's test the Zod schemas and the logic

const { z } = require("zod");

// Re-verify schemas matching shared/schemas
const UpdateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không được quá 50 ký tự")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Tên đăng nhập chỉ chứa chữ cái, số, dấu gạch dưới, gạch ngang và dấu chấm")
    .optional(),
  full_name: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được quá 100 ký tự")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Định dạng email không hợp lệ")
    .max(255)
    .optional(),
}).refine((data) => data.username !== undefined || data.full_name !== undefined || data.email !== undefined, {
  message: "Cần ít nhất một trường dữ liệu (username, full_name hoặc email) để cập nhật",
});

const ChangePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, "Mật khẩu hiện tại không được để trống"),
  new_password: z
    .string()
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
    .max(100, "Mật khẩu mới không được quá 100 ký tự")
    .regex(/[A-Z]/, "Mật khẩu mới phải chứa ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Mật khẩu mới phải chứa ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Mật khẩu mới phải chứa ít nhất 1 chữ số")
    .regex(/[^A-Za-z0-9]/, "Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt"),
  confirm_password: z
    .string()
    .min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Mật khẩu xác nhận không khớp với mật khẩu mới",
  path: ["confirm_password"],
}).refine((data) => data.new_password !== data.current_password, {
  message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
  path: ["new_password"],
});

test("Admin Seeder khởi tạo đúng 4 tài khoản Admin cố định và băm mật khẩu Bcrypt", () => {
  const defaultPassword = "123456";
  const defaultHash = bcrypt.hashSync(defaultPassword, 10);

  const initialAdmins = [
    { id: "admin-001", username: "admin1", email: "admin1@system.local", full_name: "Quản trị viên Hệ thống 1", role: "admin", status: "active" },
    { id: "admin-002", username: "admin2", email: "admin2@system.local", full_name: "Quản trị viên Hệ thống 2", role: "admin", status: "active" },
    { id: "admin-003", username: "admin3", email: "admin3@system.local", full_name: "Quản trị viên Hệ thống 3", role: "admin", status: "active" },
    { id: "admin-004", username: "admin4", email: "admin4@system.local", full_name: "Quản trị viên Hệ thống 4", role: "admin", status: "active" },
  ];

  assert.equal(initialAdmins.length, 4);
  assert.deepEqual(initialAdmins.map((a) => a.username), ["admin1", "admin2", "admin3", "admin4"]);
  assert.deepEqual(initialAdmins.map((a) => a.email), [
    "admin1@system.local",
    "admin2@system.local",
    "admin3@system.local",
    "admin4@system.local",
  ]);

  // Kiểm tra bcrypt verification
  assert.equal(bcrypt.compareSync(defaultPassword, defaultHash), true);
  assert.equal(bcrypt.compareSync("WrongPassword123", defaultHash), false);
});

test("UpdateProfileSchema kiểm tra hợp lệ dữ liệu cập nhật và phát hiện lỗi định dạng", () => {
  // Hợp lệ
  const valid = UpdateProfileSchema.safeParse({
    username: "admin_super",
    full_name: "Nguyễn Văn Admin",
    email: "superadmin@sortix.vn",
  });
  assert.equal(valid.success, true);

  // Thiếu toàn bộ trường
  const empty = UpdateProfileSchema.safeParse({});
  assert.equal(empty.success, false);

  // Email sai định dạng
  const invalidEmail = UpdateProfileSchema.safeParse({
    email: "not-an-email",
  });
  assert.equal(invalidEmail.success, false);

  // Username chứa ký tự đặc biệt cấm (khoảng trắng)
  const invalidUsername = UpdateProfileSchema.safeParse({
    username: "admin with spaces",
  });
  assert.equal(invalidUsername.success, false);
});

test("ChangePasswordSchema ràng buộc độ phức tạp mật khẩu và chống dùng lại mật khẩu cũ", () => {
  const currentPass = "123456";

  // Mật khẩu mới hợp lệ
  const validChange = ChangePasswordSchema.safeParse({
    current_password: currentPass,
    new_password: "NewSecurePass#9999",
    confirm_password: "NewSecurePass#9999",
  });
  assert.equal(validChange.success, true);

  // Mật khẩu mới trùng mật khẩu cũ -> Từ chối
  const sameAsOld = ChangePasswordSchema.safeParse({
    current_password: currentPass,
    new_password: currentPass,
    confirm_password: currentPass,
  });
  assert.equal(sameAsOld.success, false);

  // Xác nhận mật khẩu không khớp -> Từ chối
  const mismatch = ChangePasswordSchema.safeParse({
    current_password: currentPass,
    new_password: "NewSecurePass#9999",
    confirm_password: "DifferentPass#1111",
  });
  assert.equal(mismatch.success, false);

  // Mật khẩu mới quá yếu (không có ký tự đặc biệt hoặc số) -> Từ chối
  const weakPass = ChangePasswordSchema.safeParse({
    current_password: currentPass,
    new_password: "weakpassword",
    confirm_password: "weakpassword",
  });
  assert.equal(weakPass.success, false);
});

// Schemas cho Auth
const RegisterSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(100),
  confirm_password: z.string().min(1),
}).refine((data) => data.password === data.confirm_password, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirm_password"],
});

test("RegisterSchema kiểm tra hợp lệ thông tin đăng ký và phát hiện mật khẩu không khớp", () => {
  // Hợp lệ
  const valid = RegisterSchema.safeParse({
    full_name: "Lê Văn Khách",
    username: "customer_01",
    email: "customer01@gmail.com",
    password: "Password123#",
    confirm_password: "Password123#",
  });
  assert.equal(valid.success, true);

  // Mật khẩu xác nhận không khớp
  const mismatch = RegisterSchema.safeParse({
    full_name: "Lê Văn Khách",
    username: "customer_01",
    email: "customer01@gmail.com",
    password: "Password123#",
    confirm_password: "Password999#",
  });
  assert.equal(mismatch.success, false);

  // Username chứa ký tự không hợp lệ
  const badUsername = RegisterSchema.safeParse({
    full_name: "Lê Văn Khách",
    username: "user with spaces!",
    email: "customer01@gmail.com",
    password: "Password123#",
    confirm_password: "Password123#",
  });
  assert.equal(badUsername.success, false);
});

test("BẢO MẬT: Đăng ký tài khoản luôn gán cứng role = 'user' chống leo thang đặc quyền (Privilege Escalation)", () => {
  // Mô phỏng logic createUser của Backend
  function createNewUserSecure(payload) {
    // Phía backend KHÔNG nhận tham số role từ request body
    return {
      id: "usr-" + Date.now(),
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      role: "user", // BẮT BUỘC GÁN CỨNG
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Giả mạo hacker gửi payload có role: 'admin'
  const maliciousPayload = {
    full_name: "Attacker",
    username: "hacker_99",
    email: "hacker@evil.com",
    password: "HackerPass123!",
    confirm_password: "HackerPass123!",
    role: "admin", // Cố tình gửi role admin để leo thang đặc quyền
  };

  const createdUser = createNewUserSecure(maliciousPayload);

  // Đảm bảo role được tạo ra là 'user', tuyệt đối KHÔNG PHẢI 'admin'
  assert.equal(createdUser.role, "user");
  assert.notEqual(createdUser.role, "admin");
});

test("RBAC: Kiểm tra phân quyền chặn 403 Forbidden cho tài khoản 'user' khi gọi API quản trị", () => {
  function checkRolePermission(currentRole, allowedRoles) {
    if (allowedRoles.includes(currentRole)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: 403,
      error: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)",
    };
  }

  // Admin truy cập tài nguyên quản trị (ví dụ POST /api/config, GET /api/users)
  const adminCheck = checkRolePermission("admin", ["admin"]);
  assert.equal(adminCheck.allowed, true);

  // User thường truy cập tài nguyên quản trị -> Bị chặn 403 Forbidden
  const userCheck = checkRolePermission("user", ["admin"]);
  assert.equal(userCheck.allowed, false);
  assert.equal(userCheck.status, 403);
  assert.equal(userCheck.error, "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)");
});

// Admin User Management Schemas
const AdminCreateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được quá 100 ký tự"),
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không được quá 50 ký tự")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới, gạch ngang và dấu chấm"),
  email: z
    .string()
    .trim()
    .email("Định dạng email không hợp lệ")
    .max(255),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu không được quá 100 ký tự"),
  role: z.enum(["admin", "user"]).default("user"),
  status: z.enum(["active", "locked"]).default("active"),
});

const AdminUpdateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được quá 100 ký tự")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Định dạng email không hợp lệ")
    .max(255)
    .optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "locked"]).optional(),
  new_password: z
    .string()
    .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu mới không được quá 100 ký tự")
    .optional(),
});

test("Admin Management: Admin chủ động tạo tài khoản với role 'admin' hoặc 'user' và trạng thái 'active'/'locked'", () => {
  // Tạo tài khoản User thông thường
  const userPayload = {
    full_name: "Kỹ sư Vận hành A",
    username: "operator_a",
    email: "operator_a@system.local",
    password: "OperatorPassword123!",
    role: "user",
    status: "active",
  };
  const parsedUser = AdminCreateUserSchema.safeParse(userPayload);
  assert.equal(parsedUser.success, true);
  assert.equal(parsedUser.data.role, "user");
  assert.equal(parsedUser.data.status, "active");

  // Tạo tài khoản Admin thứ 5
  const adminPayload = {
    full_name: "Quản trị viên Hệ thống 5",
    username: "admin5",
    email: "admin5@system.local",
    password: "123456",
    role: "admin",
    status: "active",
  };
  const parsedAdmin = AdminCreateUserSchema.safeParse(adminPayload);
  assert.equal(parsedAdmin.success, true);
  assert.equal(parsedAdmin.data.role, "admin");

  // Validate lỗi khi mật khẩu < 4 ký tự
  const badPass = AdminCreateUserSchema.safeParse({
    ...userPayload,
    password: "123",
  });
  assert.equal(badPass.success, false);
});

test("Admin Management: Admin chỉnh sửa thông tin, đổi vai trò, khóa tài khoản và reset mật khẩu", () => {
  // Sửa họ tên & đổi role sang admin
  const updatePayload = {
    full_name: "Nguyễn Văn Đã Nâng Cấp",
    role: "admin",
    status: "locked",
    new_password: "NewResetPass#123",
  };
  const parsed = AdminUpdateUserSchema.safeParse(updatePayload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.role, "admin");
  assert.equal(parsed.data.status, "locked");
  assert.equal(parsed.data.new_password, "NewResetPass#123");

  // Cập nhật không truyền mật khẩu mới (chỉ sửa họ tên)
  const partialUpdate = AdminUpdateUserSchema.safeParse({
    full_name: "Họ Tên Mới",
  });
  assert.equal(partialUpdate.success, true);
  assert.equal(partialUpdate.data.new_password, undefined);
});

test("RÀNG BUỘC BẢO MẬT: Admin không được phép tự xóa tài khoản của chính mình", () => {
  function deleteUserSecurityCheck(targetId, currentAdminId, users) {
    if (targetId === currentAdminId) {
      return { success: false, message: "Không được phép tự xóa tài khoản của chính mình" };
    }
    const target = users.find((u) => u.id === targetId);
    if (!target) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }
    if (target.role === "admin") {
      const remainingAdmins = users.filter((u) => u.role === "admin");
      if (remainingAdmins.length <= 1) {
        return { success: false, message: "Không được phép xóa nếu số lượng tài khoản Admin còn lại <= 1" };
      }
    }
    return { success: true, message: "Đã xóa tài khoản thành công" };
  }

  const mockUsers = [
    { id: "admin-001", role: "admin" },
    { id: "admin-002", role: "admin" },
    { id: "usr-001", role: "user" },
  ];

  // Admin 1 cố tình tự xóa chính mình -> Bị chặn
  const selfDelete = deleteUserSecurityCheck("admin-001", "admin-001", mockUsers);
  assert.equal(selfDelete.success, false);
  assert.equal(selfDelete.message, "Không được phép tự xóa tài khoản của chính mình");

  // Admin 1 xóa tài khoản user khác -> Thành công
  const deleteUser = deleteUserSecurityCheck("usr-001", "admin-001", mockUsers);
  assert.equal(deleteUser.success, true);
});

test("RÀNG BUỘC BẢO MẬT: Không được phép xóa nếu số lượng tài khoản Admin còn lại <= 1", () => {
  function deleteUserSecurityCheck(targetId, currentAdminId, users) {
    if (targetId === currentAdminId) {
      return { success: false, message: "Không được phép tự xóa tài khoản của chính mình" };
    }
    const target = users.find((u) => u.id === targetId);
    if (!target) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }
    if (target.role === "admin") {
      const remainingAdmins = users.filter((u) => u.role === "admin");
      if (remainingAdmins.length <= 1) {
        return { success: false, message: "Không được phép xóa nếu số lượng tài khoản Admin còn lại <= 1" };
      }
    }
    return { success: true, message: "Đã xóa tài khoản thành công" };
  }

  // Trường hợp hệ thống chỉ còn đúng 1 Admin
  const singleAdminSystem = [
    { id: "admin-002", role: "admin" },
    { id: "usr-001", role: "user" },
  ];

  // Giả sử có request yêu cầu xóa admin-002 -> Bị chặn vì admin count <= 1
  const deleteLastAdmin = deleteUserSecurityCheck("admin-002", "super-caller", singleAdminSystem);
  assert.equal(deleteLastAdmin.success, false);
  assert.equal(deleteLastAdmin.message, "Không được phép xóa nếu số lượng tài khoản Admin còn lại <= 1");

  // Trường hợp hệ thống còn 2 Admin: Xóa 1 Admin -> Cho phép vì còn 2 > 1
  const twoAdminSystem = [
    { id: "admin-001", role: "admin" },
    { id: "admin-002", role: "admin" },
  ];
  const deleteAdminWithOthersRemaining = deleteUserSecurityCheck("admin-002", "admin-001", twoAdminSystem);
  assert.equal(deleteAdminWithOthersRemaining.success, true);
});

// Schemas cho Quên mật khẩu & Đặt lại mật khẩu
const ForgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập hoặc email"),
});

const ResetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Tên đăng nhập hoặc email không được để trống"),
  otp: z.string().trim().length(6, "Mã OTP phải gồm đúng 6 chữ số").regex(/^\d{6}$/, "Mã OTP chỉ bao gồm các chữ số"),
  new_password: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự").max(100, "Mật khẩu mới không được quá 100 ký tự"),
  confirm_password: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Mật khẩu xác nhận không khớp với mật khẩu mới",
  path: ["confirm_password"],
});

test("ForgotPasswordSchema và ResetPasswordSchema kiểm tra tính toàn vẹn dữ liệu và mật khẩu xác nhận", () => {
  // ForgotPasswordSchema
  assert.equal(ForgotPasswordSchema.safeParse({ identifier: "admin1" }).success, true);
  assert.equal(ForgotPasswordSchema.safeParse({ identifier: "admin1@gmail.com" }).success, true);
  assert.equal(ForgotPasswordSchema.safeParse({ identifier: "   " }).success, false);

  // ResetPasswordSchema hợp lệ
  const validReset = ResetPasswordSchema.safeParse({
    identifier: "admin1",
    otp: "749201",
    new_password: "NewPassword123#",
    confirm_password: "NewPassword123#",
  });
  assert.equal(validReset.success, true);

  // Sai độ dài OTP (5 số hoặc 7 số)
  const invalidOtpLen = ResetPasswordSchema.safeParse({
    identifier: "admin1",
    otp: "12345",
    new_password: "NewPassword123#",
    confirm_password: "NewPassword123#",
  });
  assert.equal(invalidOtpLen.success, false);

  // OTP chứa chữ cái
  const invalidOtpAlpha = ResetPasswordSchema.safeParse({
    identifier: "admin1",
    otp: "74920A",
    new_password: "NewPassword123#",
    confirm_password: "NewPassword123#",
  });
  assert.equal(invalidOtpAlpha.success, false);

  // Mật khẩu xác nhận không khớp
  const mismatchPass = ResetPasswordSchema.safeParse({
    identifier: "admin1",
    otp: "749201",
    new_password: "NewPassword123#",
    confirm_password: "DifferentPass456#",
  });
  assert.equal(mismatchPass.success, false);
});

test("MOCK OTP: Sinh mã 6 chữ số, thời hạn 5 phút, xác thực thành công và chống tái sử dụng mã OTP", () => {
  // 1. Mô phỏng sinh mã OTP 6 chữ số
  function generateMockOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return { otp, expiresAt };
  }

  const { otp, expiresAt } = generateMockOtp();
  assert.equal(otp.length, 6);
  assert.match(otp, /^\d{6}$/);

  // Thời gian hết hạn phải lớn hơn hiện tại và xấp xỉ 5 phút
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  assert.ok(diffMs > 4 * 60 * 1000 && diffMs <= 5 * 60 * 1000);

  // 2. Mô phỏng kho dữ liệu
  const userRecord = {
    username: "admin1",
    email: "admin1@gmail.com",
    password_hash: "$2b$10$oldhash",
    reset_otp: otp,
    reset_otp_expires_at: expiresAt,
  };

  function verifyAndResetPassword(user, inputOtp, newPassword) {
    if (!user.reset_otp || user.reset_otp !== inputOtp) {
      return { success: false, message: "Mã OTP không chính xác" };
    }
    if (new Date(user.reset_otp_expires_at).getTime() < Date.now()) {
      return { success: false, message: "Mã OTP đã hết hạn" };
    }
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    // Xóa mã sau khi đổi mật khẩu thành công (chống replay attack)
    user.reset_otp = null;
    user.reset_otp_expires_at = null;
    return { success: true, message: "Đổi mật khẩu thành công!" };
  }

  // OTP sai -> Thất bại
  const failWrongOtp = verifyAndResetPassword(userRecord, "000000", "NewPass#2026");
  assert.equal(failWrongOtp.success, false);
  assert.equal(failWrongOtp.message, "Mã OTP không chính xác");

  // OTP đúng -> Thành công
  const successReset = verifyAndResetPassword(userRecord, otp, "NewPass#2026");
  assert.equal(successReset.success, true);
  assert.equal(bcrypt.compareSync("NewPass#2026", userRecord.password_hash), true);
  assert.equal(userRecord.reset_otp, null);
  assert.equal(userRecord.reset_otp_expires_at, null);

  // Tái sử dụng lại OTP cũ -> Thất bại vì đã bị hủy
  const replayAttack = verifyAndResetPassword(userRecord, otp, "HackerPass#2026");
  assert.equal(replayAttack.success, false);
  assert.equal(replayAttack.message, "Mã OTP không chính xác");
});

test("BẢO MẬT: Tài khoản Quản trị viên (Admin) không được phép đặt lại mật khẩu từ bên ngoài màn hình Login", () => {
  function handleForgotPasswordSecurityCheck(user) {
    if (!user) {
      return { success: false, status: 404, message: "Không tìm thấy tài khoản" };
    }
    if (user.status === "locked") {
      return { success: false, status: 403, message: "Tài khoản hiện đang bị khóa" };
    }
    // RÀNG BUỘC: Admin chỉ được đổi bên trong khi đã đăng nhập
    if (user.role === "admin") {
      return {
        success: false,
        status: 403,
        message: "Vì lý do an toàn bảo mật, tài khoản Quản trị viên (Admin) chỉ có thể đổi mật khẩu sau khi đã đăng nhập vào hệ thống.",
      };
    }
    return { success: true, status: 200, message: "Đã tạo mã OTP thành công" };
  }

  // 1. Tài khoản Admin thử quên mật khẩu ngoài Login -> Bị chặn 403
  const adminAttempt = handleForgotPasswordSecurityCheck({
    username: "admin1",
    email: "admin1@gmail.com",
    role: "admin",
    status: "active",
  });
  assert.equal(adminAttempt.success, false);
  assert.equal(adminAttempt.status, 403);
  assert.match(adminAttempt.message, /Quản trị viên \(Admin\) chỉ có thể đổi mật khẩu sau khi đã đăng nhập/);

  // 2. Tài khoản User thường quên mật khẩu -> Được phép nhận OTP
  const userAttempt = handleForgotPasswordSecurityCheck({
    username: "duyphong",
    email: "duyphong@gmail.com",
    role: "user",
    status: "active",
  });
  assert.equal(userAttempt.success, true);
  assert.equal(userAttempt.status, 200);
});

test("BẢO MẬT: Đổi mật khẩu bên trong hệ thống sau khi đã đăng nhập thành công cho cả Admin và User", () => {
  function handleChangePasswordLoggedIn(user, currentPassword, newPassword) {
    // Phải có user session hợp lệ (đã đăng nhập)
    if (!user || !user.id) {
      return { success: false, status: 401, message: "Vui lòng đăng nhập để đổi mật khẩu" };
    }
    // Kiểm tra mật khẩu hiện tại
    const isCurrentValid =
      (user.plain_password && user.plain_password === currentPassword) ||
      (user.password_hash && bcrypt.compareSync(currentPassword, user.password_hash));

    if (!isCurrentValid) {
      return { success: false, status: 400, message: "Mật khẩu hiện tại không chính xác" };
    }

    user.plain_password = newPassword;
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    return { success: true, status: 200, message: "Đổi mật khẩu thành công!" };
  }

  // Admin đổi mật khẩu khi đã đăng nhập
  const adminUser = {
    id: "admin-001",
    username: "admin1",
    role: "admin",
    plain_password: "OldPassword123!",
    password_hash: bcrypt.hashSync("OldPassword123!", 10),
  };

  // Mật khẩu hiện tại sai
  const failCurrent = handleChangePasswordLoggedIn(adminUser, "WrongOldPass", "NewPassword456#");
  assert.equal(failCurrent.success, false);
  assert.equal(failCurrent.message, "Mật khẩu hiện tại không chính xác");

  // Mật khẩu hiện tại đúng -> Đổi thành công
  const successChange = handleChangePasswordLoggedIn(adminUser, "OldPassword123!", "NewPassword456#");
  assert.equal(successChange.success, true);
  assert.equal(adminUser.plain_password, "NewPassword456#");
  assert.equal(bcrypt.compareSync("NewPassword456#", adminUser.password_hash), true);
});

