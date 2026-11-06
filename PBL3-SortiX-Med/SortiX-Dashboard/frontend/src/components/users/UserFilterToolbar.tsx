"use client";

import React from "react";
import { Users as UsersIcon, Shield, User as SingleUserIcon, Search, X } from "lucide-react";

interface UserFilterToolbarProps {
  activeStream: "all" | "admin" | "user";
  onSelectStream: (stream: "all" | "admin" | "user") => void;
  totalCount: number;
  adminCount: number;
  userCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | "active" | "offline" | "locked";
  onStatusFilterChange: (status: "all" | "active" | "offline" | "locked") => void;
}

export const UserFilterToolbar: React.FC<UserFilterToolbarProps> = ({
  activeStream,
  onSelectStream,
  totalCount,
  adminCount,
  userCount,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white/95 dark:bg-[#161822] p-2 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] shadow-2xs">
      {/* Tabs chuyển luồng */}
      <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-[#111319] p-1 rounded-xl shrink-0">
        <button
          type="button"
          onClick={() => onSelectStream("all")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeStream === "all"
              ? "bg-white dark:bg-[#1E212D] text-slate-900 dark:text-white shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <UsersIcon className="h-3.5 w-3.5" />
          <span>Tất cả</span>
          <span className="rounded-md bg-slate-200/70 dark:bg-white/10 px-1.5 py-0.2 text-[10px]">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectStream("admin")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeStream === "admin"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Quản trị viên</span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[10px] ${
              activeStream === "admin"
                ? "bg-white/20 text-white"
                : "bg-purple-500/20 text-purple-700 dark:text-purple-300"
            }`}
          >
            {adminCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectStream("user")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeStream === "user"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
          }`}
        >
          <SingleUserIcon className="h-3.5 w-3.5" />
          <span>Người dùng</span>
          <span
            className={`rounded-md px-1.5 py-0.2 text-[10px] ${
              activeStream === "user"
                ? "bg-white/20 text-white"
                : "bg-teal-500/20 text-teal-700 dark:text-teal-300"
            }`}
          >
            {userCount}
          </span>
        </button>
      </div>

      {/* Thanh Tìm kiếm & Lọc trạng thái trong luồng */}
      <div className="flex items-center gap-2 flex-1 max-w-md sm:ml-auto">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-[#111319] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Tìm theo username, họ tên, email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-xs">
          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as "all" | "active" | "offline" | "locked")
            }
            className="rounded-xl border border-slate-200/80 bg-slate-100/80 dark:bg-[#111319] dark:border-white/[0.07] text-slate-800 dark:text-slate-200 px-2.5 py-1.5 text-xs font-semibold outline-none cursor-pointer"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang trực tuyến</option>
            <option value="offline">Ngoại tuyến</option>
            <option value="locked">Bị khóa</option>
          </select>
        </div>
      </div>
    </div>
  );
};
