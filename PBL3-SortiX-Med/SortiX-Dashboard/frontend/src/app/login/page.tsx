"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FlaskConical,
  Layers,
  Loader2,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { LoginSchema, RegisterSchema } from "@shared/schemas";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearClassificationHistory,
  clearAlertHistory,
  saveOperatingMode,
} from "@/lib/history";
import { ForgotPasswordModal } from "@/components/ui/ForgotPasswordModal";
import { industrialAudio } from "@/lib/audioService";
import styles from "./login.module.css";

type Mode = "login" | "register";
type FieldErrors = Partial<Record<string, string>>;

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

function Field({ label, error, hint, id, type, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <input
          {...props}
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={isPassword ? styles.passwordInput : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
            disabled={props.disabled}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function LoginPage() {
  const { login, loginWithCredentials, register, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [notice, setNotice] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const submitting = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const showDemo =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  useEffect(() => {
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  useEffect(() => {
    industrialAudio.silenceAll();
    industrialAudio.stopContinuousEmergencyAlarm();
    industrialAudio.stopContinuousJamAlarm();
    industrialAudio.stopContinuousBinFullAlarm();
    industrialAudio.stopContinuousTemperatureAlarm();
    industrialAudio.stopContinuousDeviceOfflineAlarm();
  }, []);

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origHeight = document.body.style.height;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.height = origHeight;
    };
  }, []);

  useEffect(() => {
    if (serverError) errorRef.current?.focus();
  }, [serverError]);

  useEffect(() => {
    const first = Object.keys(errors)[0];
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    }
  }, [errors]);

  function changeMode(next: Mode) {
    if (submitting.current) return;
    setMode(next);
    setErrors({});
    setServerError("");
    setNotice("");
    setCapsLock(false);
    setPassword("");
    setRegistration((previous) => ({ ...previous, password: "", confirm_password: "" }));
  }

  function editRegistration(key: keyof typeof registration, value: string) {
    setRegistration((previous) => ({ ...previous, [key]: value }));
    setServerError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setErrors({});
    setServerError("");
    setNotice("");
    const parsed =
      mode === "login"
        ? LoginSchema.safeParse({ identifier, password })
        : RegisterSchema.safeParse(registration);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await loginWithCredentials(identifier.trim(), password);
        if (result.success) {
          clearClassificationHistory();
          clearAlertHistory();
          saveOperatingMode(false);
          try {
            localStorage.setItem("pbl3_theme_mode", "light");
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
          } catch {}
          setPassword("");
          router.replace("/");
        } else {
          setServerError(result.message || "Tài khoản hoặc mật khẩu không chính xác.");
        }
      } else {
        const result = await register(RegisterSchema.parse(registration));
        if (!result.success) {
          setServerError(result.message || "Chưa thể tạo tài khoản. Vui lòng thử lại.");
          return;
        }
        setIdentifier(registration.username.trim());
        setPassword("");
        setRegistration({
          full_name: "",
          username: "",
          email: "",
          password: "",
          confirm_password: "",
        });
        setMode("login");
        setNotice("Tài khoản đã được tạo thành công. Nhập mật khẩu để đăng nhập.");
      }
    } catch {
      setServerError("Không thể kết nối máy chủ. Kiểm tra kết nối mạng rồi thử lại.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const passwordTips = [
    { label: "Ít nhất 8 ký tự", met: registration.password.length >= 8 },
    {
      label: "Chữ hoa và chữ thường",
      met: /[A-Z]/.test(registration.password) && /[a-z]/.test(registration.password),
    },
    { label: "Số hoặc ký tự đặc biệt", met: /[^a-zA-Z\s]/.test(registration.password) },
  ];

  return (
    <div className={styles.page}>
      <a href="#auth-form" className={styles.skipLink}>
        Đến biểu mẫu đăng nhập
      </a>
      <section className={styles.formPanel} aria-labelledby="auth-title">
        <header className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <Layers size={22} />
          </span>
          <div>
            <span className={styles.brandName}>
              SortiX<span>·</span>Med
            </span>
            <p>Hệ thống phân loại y tế tự động</p>
          </div>
          <span className={styles.projectBadge}>Đồ án PBL3</span>
        </header>

        <div className={styles.formContent}>
          <div className={styles.eyebrow}>
            <span /> Cổng điều hành & Giám sát trung tâm
          </div>
          <h1 id="auth-title">
            {mode === "login" ? "Đăng Nhập Hệ Thống" : "Đăng Ký Tài Khoản"}
          </h1>
          <p className={styles.intro}>
            {mode === "login"
              ? "Truy cập hệ thống giám sát và phân loại dụng cụ y tế tự động."
              : "Tạo tài khoản cán bộ kỹ thuật để theo dõi và vận hành hệ thống."}
          </p>

          <div className={styles.modeSwitch} aria-label="Chọn đăng nhập hoặc đăng ký">
            <button
              type="button"
              aria-pressed={mode === "login"}
              disabled={busy}
              onClick={() => changeMode("login")}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              aria-pressed={mode === "register"}
              disabled={busy}
              onClick={() => changeMode("register")}
            >
              Tạo tài khoản
            </button>
          </div>

          {notice && (
            <div className={styles.notice} role="status">
              <Check size={16} aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}
          {serverError && (
            <div ref={errorRef} tabIndex={-1} className={styles.error} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            id="auth-form"
            ref={formRef}
            onSubmit={submit}
            noValidate
            aria-busy={busy}
            className={styles.form}
          >
            <fieldset disabled={busy}>
              {mode === "login" ? (
                <>
                  <Field
                    id="identifier"
                    name="identifier"
                    label="Tên đăng nhập hoặc Email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    type="text"
                    required
                    value={identifier}
                    error={errors.identifier}
                    placeholder="Nhập tên đăng nhập hoặc địa chỉ email"
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setServerError("");
                    }}
                  />
                  <Field
                    id="password"
                    name="password"
                    label="Mật khẩu"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    error={errors.password}
                    placeholder="Nhập mật khẩu truy cập"
                    onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                    onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setServerError("");
                    }}
                  />
                  <div className={styles.formUtilities}>
                    <span className={styles.capsHint} role="status">
                      {capsLock ? "Caps Lock đang bật" : ""}
                    </span>
                    <button type="button" onClick={() => setForgotOpen(true)}>
                      Quên mật khẩu?
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.fieldGrid}>
                    <Field
                      id="full_name"
                      name="full_name"
                      label="Họ và tên"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      required
                      value={registration.full_name}
                      error={errors.full_name}
                      placeholder="Họ và tên đầy đủ (VD: Nguyễn Văn An)"
                      onChange={(event) => editRegistration("full_name", event.target.value)}
                    />
                    <Field
                      id="username"
                      name="username"
                      label="Tên đăng nhập"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={50}
                      required
                      value={registration.username}
                      error={errors.username}
                      placeholder="Tên tài khoản (VD: vanan_iot)"
                      onChange={(event) => editRegistration("username", event.target.value)}
                    />
                  </div>
                  <Field
                    id="email"
                    name="email"
                    label="Địa chỉ email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={255}
                    required
                    value={registration.email}
                    error={errors.email}
                    placeholder="Email liên hệ (VD: canbo@dut.udn.vn)"
                    onChange={(event) => editRegistration("email", event.target.value)}
                  />
                  <div className={styles.fieldGrid}>
                    <Field
                      id="new-password"
                      name="password"
                      label="Mật khẩu"
                      type="password"
                      autoComplete="new-password"
                      maxLength={100}
                      required
                      value={registration.password}
                      error={errors.password}
                      placeholder="Thiết lập mật khẩu an toàn"
                      hint="Tối thiểu 4 ký tự."
                      onChange={(event) => editRegistration("password", event.target.value)}
                    />
                    <Field
                      id="confirm-password"
                      name="confirm_password"
                      label="Xác nhận mật khẩu"
                      type="password"
                      autoComplete="new-password"
                      maxLength={100}
                      required
                      value={registration.confirm_password}
                      error={errors.confirm_password}
                      placeholder="Nhập lại mật khẩu để xác nhận"
                      onChange={(event) =>
                        editRegistration("confirm_password", event.target.value)
                      }
                    />
                  </div>
                  <div className={styles.passwordTips}>
                    <p>Tiêu chuẩn mật khẩu an toàn:</p>
                    <ul>
                      {passwordTips.map((tip) => (
                        <li key={tip.label} data-met={tip.met}>
                          <Check size={12} aria-hidden="true" />
                          {tip.label}
                          <span className={styles.srOnly}>
                            {tip.met ? ": Đã đáp ứng" : ": Chưa đáp ứng"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className={styles.roleNote}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>
                      Vai trò mặc định: <strong>Người dùng</strong>. Quyền quản trị viên do
                      hệ thống cấp.
                    </span>
                  </p>
                </>
              )}
              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
                    {mode === "login" ? "Đang đăng nhập…" : "Đang tạo tài khoản…"}
                  </>
                ) : (
                  <>
                    {mode === "login" ? "Đăng nhập hệ thống" : "Hoàn tất đăng ký"}
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </fieldset>
          </form>

          {showDemo && (
            <details className={styles.demo}>
              <summary>
                <FlaskConical size={14} aria-hidden="true" />
                Truy cập nhanh thử nghiệm (Demo)
                <span>TEST MODE</span>
              </summary>
              <p>Chế độ kiểm thử dành cho môi trường phát triển.</p>
              <div>
                {(["admin", "user"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (!submitting.current) {
                        submitting.current = true;
                        setBusy(true);
                        try {
                          const username = role === "admin" ? "admin1" : "duyphong";
                          const res = await loginWithCredentials(username, "Admin@123");
                          if (res.success) {
                            router.replace("/");
                          } else {
                            login(role);
                            router.replace("/");
                          }
                        } finally {
                          submitting.current = false;
                          setBusy(false);
                        }
                      }
                    }}
                  >
                    {role === "admin" ? "Quản trị viên (Admin)" : "Người dùng (User)"}
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            </details>
          )}
          <p className={styles.accessNote}>
            <LockKeyhole size={13} aria-hidden="true" />
            Hệ thống phân quyền truy cập theo vai trò tài khoản được cấp phép.
          </p>
        </div>

        <footer className={styles.footer}>
          <span>Đồ án PBL3 · Khoa Điện Tử và Trí Tuệ Nhân Tạo · ĐH Bách Khoa - ĐH Đà Nẵng</span>
          <span>SortiX-Med © 2026</span>
        </footer>
      </section>

      <aside className={styles.showcase} aria-label="Giới thiệu Hệ thống SortiX-Med">
        <div className={styles.showcaseTop}>
          <span>
            <span className={styles.dot} /> TRẠM THỰC NGHIỆM PHÂN LOẠI THỊ GIÁC
          </span>
          <span>ESP32-C5 & YOLOV8 OPTICAL INSPECTION</span>
        </div>
        <div className={styles.showcaseContent}>
          <h2>Dây Chuyền Phân Loại Dụng Cụ Y Tế SortiX-Med</h2>
          <figure className={styles.hero}>
            <div className={styles.heroImage}>
              <Image
                src="/smart_sorter_hero.jpg"
                alt="Mô hình thực tế dây chuyền phân loại dụng cụ y tế SortiX-Med"
                fill
                sizes="(min-width: 1024px) 50vw, 1px"
                className={styles.photo}
                priority
              />
              <span className={styles.imageLabel}>
                <ScanLine size={13} />
                TRẠM THỰC NGHIỆM TỰ ĐỘNG HÓA
              </span>
            </div>
          </figure>
        </div>
      </aside>

      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSuccessReset={(nextIdentifier) => {
          setIdentifier(nextIdentifier);
          setPassword("");
          setMode("login");
          setErrors({});
          setServerError("");
          setForgotOpen(false);
          setNotice("Mật khẩu đã được đặt lại thành công. Nhập mật khẩu mới để đăng nhập.");
        }}
      />
    </div>
  );
}
