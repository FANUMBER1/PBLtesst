"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReset?: (identifier: string, newPass: string) => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccessReset,
}: ForgotPasswordModalProps) {
  // Quản lý quy trình 2 bước
  const [step, setStep] = useState<1 | 2>(1);

  // Form Bước 1
  const [identifier, setIdentifier] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  // Form Bước 2
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Thông báo lỗi / thành công trong modal
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Đồng hồ đếm ngược 5 phút (300 giây)
  const [timeLeft, setTimeLeft] = useState<number>(300);

  // Trạng thái Toast Mock OTP nổi góc trên bên phải
  const [mockOtpToast, setMockOtpToast] = useState<{
    show: boolean;
    otp: string;
    expiresAt: string;
    progress: number;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Ref cho ô nhập OTP
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Reset form khi modal đóng/mở
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentifier("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
      setSuccessMsg(null);
      setTimeLeft(300);
      setMockOtpToast(null);
    }
  }, [isOpen]);

  // Bộ đếm ngược 5 phút cho Bước 2
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Bộ đếm ngược tự tắt Toast sau 10 giây
  useEffect(() => {
    let toastTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    if (mockOtpToast?.show) {
      const startTime = Date.now();
      const totalDuration = 10000; // 10 giây

      progressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingPercent = Math.max(0, 100 - (elapsed / totalDuration) * 100);
        setMockOtpToast((prev) => (prev ? { ...prev, progress: remainingPercent } : null));
      }, 100);

      toastTimer = setTimeout(() => {
        setMockOtpToast((prev) => (prev ? { ...prev, show: false } : null));
      }, totalDuration);
    }

    return () => {
      clearTimeout(toastTimer);
      clearInterval(progressTimer);
    };
  }, [mockOtpToast?.otp, mockOtpToast?.show]);

  // Định dạng thời gian MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ==========================================================
  // BƯỚC 1: GỬI YÊU CẦU LẤY MÃ OTP
  // ==========================================================
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMsg("Vui lòng nhập tên đăng nhập hoặc địa chỉ email của bạn.");
      return;
    }

    setIsRequestingOtp(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Không thể tìm thấy tài khoản. Vui lòng kiểm tra lại.");
        setIsRequestingOtp(false);
        return;
      }

      // Kích hoạt bước 2
      setStep(2);
      setTimeLeft(300); // 5 phút = 300s
      setOtp("");
      setErrorMsg(null);

      // KÍCH HOẠT TOAST NOTIFICATION Ở GÓC TRÊN BÊN PHẢI MÀN HÌNH
      if (data.demo_otp) {
        setMockOtpToast({
          show: true,
          otp: data.demo_otp,
          expiresAt: data.expires_at,
          progress: 100,
        });
      }

      // Focus tự động vào ô nhập OTP sau khi render
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ khi tạo mã OTP. Vui lòng thử lại sau.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // ==========================================================
  // BƯỚC 2: XÁC THỰC OTP VÀ ĐẶT LẠI MẬT KHẨU MỚI
  // ==========================================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số mã OTP xác thực.");
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 4 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    if (timeLeft <= 0) {
      setErrorMsg("Mã OTP đã hết thời hạn hiệu lực (5 phút). Vui lòng bấm 'Gửi lại mã OTP'.");
      return;
    }

    setIsSubmittingReset(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: cleanOtp,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.");
        setIsSubmittingReset(false);
        return;
      }

      // Thông báo thành công
      setSuccessMsg("Đặt lại mật khẩu thành công! Đang chuyển về màn hình đăng nhập...");
      setMockOtpToast(null);

      // Gọi callback để tự điền form Login
      setTimeout(() => {
        if (onSuccessReset) {
          onSuccessReset(identifier.trim(), newPassword);
        }
        onClose();
      }, 1500);
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ khi đổi mật khẩu.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Thao tác nút "Tự động điền" trên Toast
  const handleAutoFillOtp = (otpCode: string) => {
    setOtp(otpCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    // Focus vào ô mật khẩu mới sau khi điền OTP
    setTimeout(() => {
      document.getElementById("new-password-input")?.focus();
    }, 100);
  };

  // Thao tác sao chép mã OTP
  const handleCopyOtp = (otpCode: string) => {
    navigator.clipboard.writeText(otpCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen && !mockOtpToast?.show) return null;

  return (
    <>
      {/* =========================================================================
          TOAST NOTIFICATION MOCK OTP NỔI Ở GÓC TRÊN BÊN PHẢI (TOP-RIGHT CORNER)
          ========================================================================= */}
      {mockOtpToast?.show && (
        <div className="fixed top-6 right-6 z-[999999] w-full max-w-sm pointer-events-auto animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900/95 via-[#0F172A]/95 to-emerald-950/95 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl ring-1 ring-white/10">
            {/* Thanh tiến trình thời gian 10s */}
            <div
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 transition-all duration-100 ease-linear"
              style={{ width: `${mockOtpToast.progress}%` }}
            />

            {/* Header Toast */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
                  🔔
                </span>
                <div>
                  <span className="inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                    Mô phỏng
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMockOtpToast((prev) => (prev ? { ...prev, show: false } : null))}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Thân Toast hiển thị Mã OTP */}
            <div className="mt-3 rounded-xl bg-black/40 p-3 border border-white/10">
              <p className="text-xs text-slate-300 font-medium">
                Mã xác thực OTP của bạn là:
              </p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-2xl font-black tracking-widest text-emerald-400 font-mono drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                  👉 {mockOtpToast.otp}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyOtp(mockOtpToast.otp)}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/20 transition-all active:scale-95"
                  title="Sao chép mã vào bộ nhớ đệm"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-300" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 italic">
                (Mã có hiệu lực trong vòng 5 phút)
              </p>
            </div>

            {/* Nút hành động "Tự động điền" */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAutoFillOtp(mockOtpToast.otp)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 px-3 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                <span>Tự động điền vào form</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL QUÊN MẬT KHẨU (2 BƯỚC)
          ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xl transition-all dark:border-white/[0.08] dark:bg-[#161822]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-xs">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Khôi phục mật khẩu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cơ chế xác thực qua mã OTP
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors"
                title="Đóng hộp thoại"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stepper Chỉ báo tiến trình */}
            <div className="flex items-center gap-2 py-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step === 1
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                    : "bg-slate-100 dark:bg-white/[0.05] text-slate-400"
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-600 text-white text-[10px]">
                  1
                </span>
                <span>Nhận mã OTP</span>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 dark:bg-white/10" />

              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step === 2
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-100 dark:bg-white/[0.05] text-slate-400"
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
                  2
                </span>
                <span>Đặt mật khẩu mới</span>
              </div>
            </div>

            {/* Thông báo lỗi */}
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Thông báo thành công */}
            {successMsg && (
              <div className="mb-4 flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300 animate-in fade-in duration-150">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ==========================================================
                NỘI DUNG BƯỚC 1: NHẬP TÊN ĐĂNG NHẬP / EMAIL
                ========================================================== */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Tên đăng nhập hoặc Email của tài khoản
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-white/[0.08] dark:bg-[#111319] dark:text-white"
                      placeholder="Nhập tên đăng nhập hoặc email"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="leading-relaxed">
                      <strong>Hệ thống SortiX:</strong> Mã xác thực OTP sẽ hiển thị trực tiếp trên màn hình để bạn dễ dàng thử nghiệm và khôi phục mật khẩu nhanh chóng.
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-400 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="submit"
                    disabled={isRequestingOtp}
                    className="flex-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2.5 px-4 text-xs font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 dark:bg-cyan-500 dark:hover:bg-cyan-400"
                  >
                    {isRequestingOtp ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>Nhận mã OTP</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ==========================================================
                NỘI DUNG BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI
                ========================================================== */}
            {step === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
                {/* Khung nhập OTP & Đếm ngược */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Mã xác thực OTP (6 chữ số)
                    </label>
                    <div
                      className={`flex items-center gap-1.5 text-xs font-mono font-bold ${
                        timeLeft > 60
                          ? "text-emerald-600 dark:text-emerald-400"
                          : timeLeft > 0
                          ? "text-amber-600 dark:text-amber-400 animate-pulse"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      ref={otpInputRef}
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setOtp(val);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full text-center rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-lg font-black tracking-widest text-slate-900 font-mono placeholder:text-slate-400 shadow-2xs transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/[0.08] dark:bg-[#111319] dark:text-white"
                      placeholder="000000"
                      required
                    />
                  </div>

                  {/* Hiển thị mã OTP trực tiếp ngay trên form để người dùng dễ thao tác */}
                  {mockOtpToast?.otp && (
                    <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2 font-medium">
                        <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Mã OTP: <strong className="font-mono text-sm tracking-widest text-emerald-600 dark:text-emerald-400 font-bold ml-1">{mockOtpToast.otp}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAutoFillOtp(mockOtpToast.otp)}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        Tự động điền
                      </button>
                    </div>
                  )}

                  {/* Nút gửi lại mã nếu hết hạn */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      Chưa nhận được mã?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      disabled={isRequestingOtp}
                      className="font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRequestingOtp ? "animate-spin" : ""}`} />
                      <span>Gửi lại mã OTP</span>
                    </button>
                  </div>
                </div>

                {/* Mật khẩu mới */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="new-password-input"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/[0.08] dark:bg-[#111319] dark:text-white"
                      placeholder="Ít nhất 4 ký tự"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title={showNewPassword ? "Ẩn" : "Hiện"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nhập lại mật khẩu mới */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nhập lại mật khẩu mới
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/[0.08] dark:bg-[#111319] dark:text-white"
                      placeholder="Khớp với mật khẩu mới"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title={showConfirmPassword ? "Ẩn" : "Hiện"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nút hành động Bước 2 */}
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-400 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 px-4 text-xs font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  >
                    {isSubmittingReset ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Xác nhận đặt lại mật khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
