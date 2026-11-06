"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth, usePermission } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { SafeUser, UserRole, UserStatus } from "@shared/types";
import { ApiUsersClient } from "@/services/apiUsersClient";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  X,
  RefreshCw,
  UserPlus,
  User as SingleUserIcon,
} from "lucide-react";
import Link from "next/link";
import { UserStatsCards } from "@/components/users/UserStatsCards";
import { UserFilterToolbar } from "@/components/users/UserFilterToolbar";
import { UserTable } from "@/components/users/UserTable";
import { UserModals } from "@/components/users/UserModals";

export default function UsersPage() {
  const { user: currentAuthUser } = useAuth();
  const canView = usePermission("users.view");
  const canManage = usePermission("users.manage");
  const router = useRouter();

  // State danh sách và dữ liệu
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Phân 2 luồng: "all" | "admin" | "user"
  const [activeStream, setActiveStream] = useState<"all" | "admin" | "user">("all");

  // State bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "offline" | "locked">("all");

  // State Modal Thêm tài khoản
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "user" as UserRole,
    status: "active" as UserStatus,
  });
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // State Modal Sửa tài khoản
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "user" as UserRole,
    status: "active" as UserStatus,
    new_password: "",
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // State Modal Xóa tài khoản
  const [deletingUser, setDeletingUser] = useState<SafeUser | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // 403 Countdown redirect
  const [countdown, setCountdown] = useState(3);

  // Tải danh sách người dùng từ API
  const loadUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await ApiUsersClient.getAll();
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
        setActionError(null);
      } else {
        setActionError(res.message || "Không thể tải danh sách người dùng");
      }
    } catch {
      setActionError("Lỗi kết nối khi tải danh sách người dùng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      loadUsers();
      const interval = setInterval(() => {
        loadUsers();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [canView, loadUsers]);

  // Xử lý đếm ngược khi bị 403 Forbidden
  useEffect(() => {
    if (!canView) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.replace("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canView, router]);

  // Kiểm tra tài khoản hiện tại có trùng với ID người dùng không
  const isCurrentSelf = useCallback(
    (userItem?: SafeUser | null): boolean => {
      if (!userItem || !currentAuthUser) return false;
      return Boolean(
        (currentAuthUser.id && currentAuthUser.id === userItem.id) ||
        (currentAuthUser.username &&
          currentAuthUser.username.toLowerCase() === userItem.username.toLowerCase()) ||
        (currentAuthUser.email &&
          currentAuthUser.email.toLowerCase() === userItem.email.toLowerCase())
      );
    },
    [currentAuthUser]
  );

  // Kiểm tra tài khoản có đang trực tuyến/hoạt động thực tế không
  const isUserActive = useCallback(
    (userItem: SafeUser): boolean => {
      if (userItem.status === "locked") return false;
      if (isCurrentSelf(userItem)) return true;
      if (!userItem.is_online) return false;
      if (!userItem.last_login_at) return false;
      const lastLoginTime = new Date(userItem.last_login_at).getTime();
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      return lastLoginTime > fifteenMinutesAgo;
    },
    [isCurrentSelf]
  );

  // Lọc danh sách người dùng theo luồng, từ khóa tìm kiếm và trạng thái
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Phân luồng Admin vs User
      if (activeStream === "admin" && u.role !== "admin") return false;
      if (activeStream === "user" && u.role !== "user") return false;

      // 2. Tìm kiếm từ khóa
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q);

      // 3. Trạng thái
      let matchStatus = true;
      if (statusFilter === "active") {
        matchStatus = isUserActive(u);
      } else if (statusFilter === "offline") {
        matchStatus = !isUserActive(u) && u.status !== "locked";
      } else if (statusFilter === "locked") {
        matchStatus = u.status === "locked";
      }

      return matchQuery && matchStatus;
    });
  }, [users, activeStream, searchQuery, statusFilter, isUserActive]);

  // Thống kê
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;
  const activeCount = users.filter((u) => isUserActive(u)).length;
  const lockedCount = users.filter((u) => u.status === "locked").length;

  // Xử lý Thêm tài khoản mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    if (!addForm.full_name.trim()) {
      setAddFormError("Họ và tên không được để trống");
      return;
    }
    if (!addForm.username.trim() || addForm.username.length < 3) {
      setAddFormError("Tên đăng nhập phải có ít nhất 3 ký tự");
      return;
    }
    if (!addForm.email.trim() || !addForm.email.includes("@")) {
      setAddFormError("Địa chỉ email không hợp lệ");
      return;
    }
    if (!addForm.password || addForm.password.length < 4) {
      setAddFormError("Mật khẩu khởi tạo phải có ít nhất 4 ký tự");
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const res = await ApiUsersClient.createUser(addForm);
      if (res.success && res.data) {
        setActionSuccess(`Đã tạo thành công tài khoản: ${res.data.username}`);
        setIsAddModalOpen(false);
        setAddForm({
          full_name: "",
          username: "",
          email: "",
          password: "",
          role: activeStream === "admin" ? "admin" : "user",
          status: "active",
        });
        await loadUsers();
      } else {
        setAddFormError(res.message || "Tạo tài khoản thất bại");
      }
    } catch {
      setAddFormError("Lỗi hệ thống khi tạo tài khoản");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Mở Modal Sửa
  const openEditModal = (userItem: SafeUser) => {
    setEditingUser(userItem);
    setEditForm({
      full_name: userItem.full_name,
      email: userItem.email,
      role: userItem.role,
      status: userItem.status,
      new_password: "",
    });
    setEditFormError(null);
  };

  // Xử lý Cập nhật tài khoản
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditFormError(null);

    if (!editForm.full_name.trim()) {
      setEditFormError("Họ và tên không được để trống");
      return;
    }
    if (!editForm.email.trim() || !editForm.email.includes("@")) {
      setEditFormError("Địa chỉ email không hợp lệ");
      return;
    }
    if (editForm.new_password && editForm.new_password.length < 4) {
      setEditFormError("Mật khẩu mới nếu đặt phải có ít nhất 4 ký tự");
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        status: editForm.status,
        ...(editForm.new_password ? { new_password: editForm.new_password } : {}),
      };

      const res = await ApiUsersClient.updateUser(editingUser.id, payload);
      if (res.success) {
        setActionSuccess(`Đã cập nhật tài khoản: ${editingUser.username}`);
        setEditingUser(null);
        await loadUsers();
      } else {
        setEditFormError(res.message || "Không thể cập nhật tài khoản");
      }
    } catch {
      setEditFormError("Lỗi kết nối khi cập nhật tài khoản");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Xử lý Khóa / Kích hoạt nhanh tài khoản
  const handleToggleStatus = async (userItem: SafeUser) => {
    if (isCurrentSelf(userItem)) {
      setActionError("Không thể tự khóa tài khoản của chính mình");
      return;
    }

    const nextStatus: UserStatus = userItem.status === "active" ? "locked" : "active";
    try {
      const res = await ApiUsersClient.updateUser(userItem.id, { status: nextStatus });
      if (res.success) {
        setActionSuccess(
          `Đã ${nextStatus === "active" ? "kích hoạt" : "khóa"} tài khoản ${userItem.username}`
        );
        await loadUsers();
      } else {
        setActionError(res.message || "Thao tác thay đổi trạng thái thất bại");
      }
    } catch {
      setActionError("Lỗi khi thay đổi trạng thái tài khoản");
    }
  };

  // Xử lý Xóa tài khoản
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    if (isCurrentSelf(deletingUser)) {
      setActionError("Ràng buộc bảo mật: Không được phép tự xóa tài khoản của chính mình");
      setDeletingUser(null);
      return;
    }

    if (deletingUser.role === "admin" && adminCount <= 1) {
      setActionError(
        "Ràng buộc bảo mật: Không được phép xóa nếu số lượng tài khoản Admin còn lại <= 1"
      );
      setDeletingUser(null);
      return;
    }

    try {
      setIsSubmittingDelete(true);
      const res = await ApiUsersClient.deleteUser(deletingUser.id);
      if (res.success) {
        setActionSuccess(`Đã xóa vĩnh viễn tài khoản: ${deletingUser.username}`);
        setDeletingUser(null);
        await loadUsers();
      } else {
        setActionError(res.message || "Xóa tài khoản thất bại");
      }
    } catch {
      setActionError("Lỗi kết nối khi xóa tài khoản");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Màn hình 403 Forbidden cho tài khoản không phải admin
  if (!canView) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-3 shadow-sm">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          403 Forbidden - Quyền truy cập bị từ chối
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md">
          Trang <b>Quản lý người dùng</b> yêu cầu vai trò <b>quản trị viên</b>. Tài khoản người dùng chỉ có quyền xem dữ liệu giám sát và quản lý hồ sơ cá nhân.
        </p>
        <p className="text-[11px] text-slate-400 mt-2 font-mono">
          Tự động quay về trang chủ trong {countdown}s...
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl w-full space-y-3.5 page-transition-enter px-2 sm:px-4">
      {/* Toast thông báo */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="p-1 hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header gọn gàng & Nút hành động */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Quản lý người dùng
            </h2>
            <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
              Quản trị viên
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Phân quyền tài khoản quản trị viên và người dùng
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadUsers}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-300 dark:hover:bg-[#1E212D]"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          {canManage && (
            <button
              onClick={() => {
                setAddFormError(null);
                setAddForm((prev) => ({
                  ...prev,
                  role: activeStream === "admin" ? "admin" : "user",
                }));
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition-all dark:bg-cyan-500 dark:hover:bg-cyan-400"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Thêm tài khoản</span>
            </button>
          )}
        </div>
      </div>

      {/* Thẻ Thống kê nhanh */}
      <UserStatsCards
        totalCount={totalCount}
        adminCount={adminCount}
        activeCount={activeCount}
        lockedCount={lockedCount}
        activeStream={activeStream}
        onSelectStream={setActiveStream}
      />

      {/* THANH PHÂN 2 LUỒNG CHUYÊN BIỆT: ADMIN vs NGƯỜI DÙNG */}
      <UserFilterToolbar
        activeStream={activeStream}
        onSelectStream={setActiveStream}
        totalCount={totalCount}
        adminCount={adminCount}
        userCount={userCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Thông tin ngữ cảnh cho từng luồng */}
      {activeStream === "admin" && (
        <div className="flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-xs text-purple-700 dark:text-purple-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
          <span>
            <b>Quản trị viên</b>: Toàn quyền cấu hình thiết bị, phân luồng, dừng khẩn E-Stop và quản lý người dùng. Hệ thống luôn duy trì tối thiểu một quản trị viên.
          </span>
        </div>
      )}

      {activeStream === "user" && (
        <div className="flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/20 px-3 py-2 text-xs text-teal-700 dark:text-teal-300">
          <SingleUserIcon className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <span>
            <b>Người dùng</b>: Giám sát phân loại sản phẩm, khay chứa, lịch sử và quản lý hồ sơ cá nhân.
          </span>
        </div>
      )}

      {/* Bảng danh sách người dùng */}
      <UserTable
        users={filteredUsers}
        loading={loading}
        activeStream={activeStream}
        canManage={canManage}
        currentAuthUserId={currentAuthUser?.id}
        isCurrentSelf={isCurrentSelf}
        adminCount={adminCount}
        isUserActive={isUserActive}
        onToggleStatus={handleToggleStatus}
        onEdit={openEditModal}
        onDelete={(u) => setDeletingUser(u)}
      />

      {/* Modals: Thêm, Sửa, Xóa */}
      <UserModals
        isAddModalOpen={isAddModalOpen}
        onCloseAddModal={() => setIsAddModalOpen(false)}
        addForm={addForm}
        setAddForm={setAddForm}
        addFormError={addFormError}
        isSubmittingAdd={isSubmittingAdd}
        onCreateUser={handleCreateUser}
        editingUser={editingUser}
        onCloseEditModal={() => setEditingUser(null)}
        editForm={editForm}
        setEditForm={setEditForm}
        editFormError={editFormError}
        isSubmittingEdit={isSubmittingEdit}
        onUpdateUser={handleUpdateUser}
        isCurrentSelf={isCurrentSelf}
        deletingUser={deletingUser}
        onCloseDeleteModal={() => setDeletingUser(null)}
        isSubmittingDelete={isSubmittingDelete}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
