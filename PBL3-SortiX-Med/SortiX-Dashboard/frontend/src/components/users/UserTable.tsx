"use client";

import React from "react";
import { SafeUser } from "@shared/types";
import {
  Users as UsersIcon,
  Shield,
  User as SingleUserIcon,
  RefreshCw,
  Lock,
  Unlock,
  Pencil,
  Trash2,
} from "lucide-react";

interface UserTableProps {
  users: SafeUser[];
  loading: boolean;
  activeStream: "all" | "admin" | "user";
  canManage: boolean;
  currentAuthUserId?: string;
  isCurrentSelf?: (user: SafeUser) => boolean;
  adminCount: number;
  isUserActive: (user: SafeUser) => boolean;
  onToggleStatus: (user: SafeUser) => void;
  onEdit: (user: SafeUser) => void;
  onDelete: (user: SafeUser) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  activeStream,
  canManage,
  currentAuthUserId,
  isCurrentSelf,
  adminCount,
  isUserActive,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 dark:border-white/[0.07] dark:bg-[#161822] shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-white/[0.06] dark:bg-[#111319] dark:text-slate-400">
              <th className="w-[220px] px-3.5 py-2.5 text-left">Tài khoản</th>
              <th className="w-[180px] px-3.5 py-2.5 text-left">Họ và tên</th>
              <th className="w-[200px] px-3.5 py-2.5 text-left">Email</th>
              <th className="w-[130px] px-3.5 py-2.5 text-left">Vai trò</th>
              <th className="w-[125px] px-3.5 py-2.5 text-left">Trạng thái</th>
              <th className="w-[135px] px-3.5 py-2.5 text-left">Ngày tạo</th>
              {canManage && <th className="w-[100px] px-3.5 py-2.5 text-right">Thao tác</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-cyan-500" />
                    <span className="text-xs">Đang tải danh sách người dùng...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <UsersIcon className="mx-auto h-7 w-7 opacity-40 mb-1.5" />
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {activeStream === "admin"
                      ? "Không có tài khoản Quản trị viên nào phù hợp bộ lọc"
                      : activeStream === "user"
                      ? "Không có tài khoản Người dùng nào phù hợp bộ lọc"
                      : "Không tìm thấy tài khoản nào"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Thử thay đổi từ khóa tìm kiếm hoặc chọn tab luồng khác
                  </p>
                </td>
              </tr>
            ) : (
              users.map((userItem) => {
                const isSelf = isCurrentSelf
                  ? isCurrentSelf(userItem)
                  : Boolean(currentAuthUserId && userItem.id === currentAuthUserId);
                const isLastAdmin = userItem.role === "admin" && adminCount <= 1;

                return (
                  <tr
                    key={userItem.id}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-[#1E212D]/60 ${
                      isSelf ? "bg-cyan-500/[0.03] dark:bg-cyan-500/[0.06]" : ""
                    }`}
                  >
                    {/* Tên đăng nhập & Avatar */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs ${
                            userItem.role === "admin"
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                              : "bg-gradient-to-br from-teal-500 to-emerald-600"
                          }`}
                        >
                          {userItem.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white shrink-0">
                              {userItem.username}
                            </span>
                            {isSelf && (
                              <span className="rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 text-[9px] px-1.5 py-0.5 font-bold shrink-0 whitespace-nowrap">
                                Bạn (Đang đăng nhập)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            ID: {userItem.id.substring(0, 10)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Họ tên */}
                    <td className="px-3.5 py-2.5 text-slate-900 dark:text-slate-200 font-semibold truncate">
                      {userItem.full_name}
                    </td>

                    {/* Email */}
                    <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-300 truncate">
                      {userItem.email}
                    </td>

                    {/* Vai trò */}
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                          userItem.role === "admin"
                            ? "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300"
                            : "border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300"
                        }`}
                      >
                        {userItem.role === "admin" ? (
                          <Shield className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <SingleUserIcon className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                        )}
                        <span>{userItem.role === "admin" ? "Quản Trị Viên" : "Người Dùng"}</span>
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3.5 py-2.5">
                      {userItem.status === "locked" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Bị khóa
                        </span>
                      ) : isUserActive(userItem) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                          Ngoại tuyến
                        </span>
                      )}
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-3.5 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <div>
                        {new Date(userItem.created_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                      {userItem.last_login_at && (
                        <div className="text-[10px] text-slate-400">
                          {new Date(userItem.last_login_at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </td>

                    {/* Thao tác */}
                    {canManage && (
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Khóa / Mở khóa nhanh */}
                          <button
                            type="button"
                            onClick={() => onToggleStatus(userItem)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? "Không thể tự khóa tài khoản"
                                : userItem.status === "active"
                                ? "Khóa tài khoản này"
                                : "Mở khóa tài khoản"
                            }
                            className={`rounded-lg p-1.5 transition-colors ${
                              isSelf
                                ? "opacity-25 cursor-not-allowed text-slate-400"
                                : userItem.status === "active"
                                ? "text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                                : "text-emerald-500 hover:bg-emerald-500/10"
                            }`}
                          >
                            {userItem.status === "active" ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Sửa */}
                          <button
                            type="button"
                            onClick={() => onEdit(userItem)}
                            title="Chỉnh sửa thông tin / Đổi mật khẩu"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-[#1E212D] dark:text-slate-400 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => onDelete(userItem)}
                            disabled={isSelf || isLastAdmin}
                            title={
                              isSelf
                                ? "Không thể tự xóa tài khoản của chính mình"
                                : isLastAdmin
                                ? "Hệ thống phải có ít nhất 1 Quản trị viên"
                                : "Xóa tài khoản này"
                            }
                            className={`rounded-lg p-1.5 transition-colors ${
                              isSelf || isLastAdmin
                                ? "opacity-25 cursor-not-allowed text-slate-400"
                                : "text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
