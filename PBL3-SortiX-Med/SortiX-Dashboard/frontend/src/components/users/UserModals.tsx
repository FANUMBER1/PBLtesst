"use client";

import React from "react";
import {
  UserPlus,
  Pencil,
  AlertTriangle,
  RefreshCw,
  X,
  Shield,
  User as SingleUserIcon,
  KeyRound,
} from "lucide-react";
import type { SafeUser as User, UserRole, UserStatus } from "@shared/types";

export interface UserModalsProps {
  // Add modal
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  addForm: {
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: UserRole;
    status: UserStatus;
  };
  setAddForm: React.Dispatch<
    React.SetStateAction<{
      username: string;
      email: string;
      full_name: string;
      password: string;
      role: UserRole;
      status: UserStatus;
    }>
  >;
  addFormError: string | null;
  isSubmittingAdd: boolean;
  onCreateUser: (e: React.FormEvent) => void;

  // Edit modal
  editingUser: User | null;
  onCloseEditModal: () => void;
  editForm: {
    full_name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    new_password: string;
  };
  setEditForm: React.Dispatch<
    React.SetStateAction<{
      full_name: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      new_password: string;
    }>
  >;
  editFormError: string | null;
  isSubmittingEdit: boolean;
  onUpdateUser: (e: React.FormEvent) => void;
  isCurrentSelf: (u: User | null) => boolean;

  // Delete modal
  deletingUser: User | null;
  onCloseDeleteModal: () => void;
  isSubmittingDelete: boolean;
  onConfirmDelete: () => void;
}

export function UserModals({
  isAddModalOpen,
  onCloseAddModal,
  addForm,
  setAddForm,
  addFormError,
  isSubmittingAdd,
  onCreateUser,
  editingUser,
  onCloseEditModal,
  editForm,
  setEditForm,
  editFormError,
  isSubmittingEdit,
  onUpdateUser,
  isCurrentSelf,
  deletingUser,
  onCloseDeleteModal,
  isSubmittingDelete,
  onConfirmDelete,
}: UserModalsProps) {
  return (
    <>
      {/* ================= MODAL: THÊM TÀI KHOẢN MỚI ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-white/[0.08] dark:bg-[#161822]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thêm tài khoản
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Phân quyền quản trị viên hoặc người dùng
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseAddModal}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addFormError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{addFormError}</span>
              </div>
            )}

            <form onSubmit={onCreateUser} className="mt-3 space-y-3 text-xs">
              {/* Thẻ chọn 2 luồng vai trò */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Vai trò *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setAddForm({ ...addForm, role: "admin" })}
                    className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                      addForm.role === "admin"
                        ? "border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 shadow-2xs"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Quản trị viên</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Toàn quyền cấu hình, vận hành và quản lý
                    </p>
                  </div>

                  <div
                    onClick={() => setAddForm({ ...addForm, role: "user" })}
                    className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                      addForm.role === "user"
                        ? "border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-200 shadow-2xs"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <SingleUserIcon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Người dùng</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Giám sát phân loại và đổi mật khẩu cá nhân
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Họ và tên hiển thị *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="user123"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Mật khẩu khởi tạo *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 4 ký tự"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Địa chỉ Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Trạng thái ban đầu
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as UserStatus })}
                    className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500 font-semibold cursor-pointer"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="locked">Khóa tạm thời</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-[#1E212D]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-1.5 font-bold shadow-2xs transition-all disabled:opacity-50"
                >
                  {isSubmittingAdd && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA TÀI KHOẢN ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-white/[0.08] dark:bg-[#161822]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chỉnh sửa tài khoản
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tài khoản: <b>{editingUser.username}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseEditModal}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editFormError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={onUpdateUser} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Địa chỉ Email *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Vai trò
                  </label>
                  <select
                    value={editForm.role}
                    disabled={isCurrentSelf(editingUser)}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <option value="user">Người dùng</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editForm.status}
                    disabled={isCurrentSelf(editingUser)}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                    className="w-full rounded-xl border border-slate-200 bg-white dark:bg-[#111319] dark:border-white/[0.08] px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-cyan-500 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="locked">Bị khóa</option>
                  </select>
                </div>
              </div>

              {/* Reset Mật khẩu */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#111319] p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                  <KeyRound className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Đặt lại mật khẩu</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-1.5">
                  Để trống nếu không muốn đổi mật khẩu cho tài khoản này
                </p>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:bg-[#161822] dark:border-white/[0.08] px-3 py-1 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={onCloseEditModal}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-[#1E212D]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 font-bold shadow-2xs transition-all disabled:opacity-50"
                >
                  {isSubmittingEdit && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: XÁC NHẬN XÓA NGUY HIỂM ================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-white p-5 shadow-2xl dark:border-rose-500/20 dark:bg-[#161822]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 border border-rose-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa tài khoản
                </h3>
                <p className="text-[11px] text-rose-500 font-semibold">
                  Cảnh báo: Thao tác này không thể hoàn tác!
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <p>Bạn chuẩn bị xóa vĩnh viễn tài khoản người dùng:</p>
              <div className="flex items-center justify-between rounded-lg bg-white/70 dark:bg-[#111319] p-2 font-mono text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {deletingUser.username}
                  </p>
                  <p className="text-[10px] text-slate-400">{deletingUser.email}</p>
                </div>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                    deletingUser.role === "admin"
                      ? "bg-purple-500/20 text-purple-600"
                      : "bg-teal-500/20 text-teal-600"
                  }`}
                >
                  {deletingUser.role.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Nếu chỉ muốn tạm dừng quyền truy cập, bạn có thể chọn <b>Khóa tài khoản</b> thay vì xóa vĩnh viễn.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onCloseDeleteModal}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-[#1E212D]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isSubmittingDelete}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
              >
                {isSubmittingDelete && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Xóa tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
