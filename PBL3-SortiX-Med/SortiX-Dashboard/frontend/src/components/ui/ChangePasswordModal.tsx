"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiAuthClient } from "@/services/apiAuthClient";
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Tiêu chuẩn độ phức tạp (tối thiểu 8 ký tự, có chữ hoa, thường, số, ký tự đặc biệt)
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isMatched = Boolean(newPassword && newPassword === confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không trùng khớp");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await ApiAuthClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Đổi mật khẩu thành công!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 2000);
      } else {
        setErrorMsg(res.message || "Không thể đổi mật khẩu. Vui lòng kiểm tra lại.");
      }
    } catch {
      setErrorMsg("Lỗi hệ thống khi gửi yêu cầu đổi mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#161822]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Đổi mật khẩu
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tài khoản: <b>{user?.displayName || user?.username}</b> ({user?.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thông báo Thành công / Thất bại */}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Đổi Mật Khẩu */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Mật khẩu hiện tại */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Mật khẩu hiện tại *
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                placeholder="Nhập mật khẩu bạn đang dùng"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-2 pr-9 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Mật khẩu mới *
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                placeholder="Tối thiểu 8 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-2 pr-9 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Xác nhận mật khẩu mới *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-2 pr-9 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Checklist tiêu chuẩn bảo mật */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-white/[0.08] dark:bg-[#111319] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
              <Shield className="h-3.5 w-3.5 text-cyan-500" />
              <span>Yêu cầu mật khẩu:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? "bg-emerald-500" : "bg-slate-400"}`} />
                Tối thiểu 8 ký tự
              </span>
              <span className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hasUppercase ? "bg-emerald-500" : "bg-slate-400"}`} />
                Ít nhất 1 chữ hoa
              </span>
              <span className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hasLowercase ? "bg-emerald-500" : "bg-slate-400"}`} />
                Ít nhất 1 chữ thường
              </span>
              <span className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hasNumber ? "bg-emerald-500" : "bg-slate-400"}`} />
                Ít nhất 1 chữ số
              </span>
              <span className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hasSpecial ? "bg-emerald-500" : "bg-slate-400"}`} />
                1 ký tự đặc biệt
              </span>
              <span className={`flex items-center gap-1.5 ${isMatched ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isMatched ? "bg-emerald-500" : "bg-slate-400"}`} />
                Mật khẩu khớp nhau
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-[#1E212D]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Lưu mật khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
