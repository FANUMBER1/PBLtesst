"use client";

import React from "react";
import { Users as UsersIcon, Shield, CheckCircle2, UserX } from "lucide-react";

export interface UserStatsCardsProps {
  totalCount: number;
  adminCount: number;
  activeCount: number;
  lockedCount: number;
  activeStream: "all" | "admin" | "user";
  onSelectStream: (stream: "all" | "admin" | "user") => void;
}

export const UserStatsCards: React.FC<UserStatsCardsProps> = ({
  totalCount,
  adminCount,
  activeCount,
  lockedCount,
  activeStream,
  onSelectStream,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {/* Tổng tài khoản */}
      <div
        onClick={() => onSelectStream("all")}
        className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-cyan-500/40 ${
          activeStream === "all"
            ? "border-cyan-500/40 bg-cyan-500/5 dark:bg-cyan-500/10"
            : "border-slate-200/80 bg-white dark:border-white/[0.07] dark:bg-[#161822]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
            <UsersIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {totalCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tổng tài khoản</p>
          </div>
        </div>
      </div>

      {/* Quản trị viên */}
      <div
        onClick={() => onSelectStream("admin")}
        className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-purple-500/40 ${
          activeStream === "admin"
            ? "border-purple-500/40 bg-purple-500/5 dark:bg-purple-500/10"
            : "border-slate-200/80 bg-white dark:border-white/[0.07] dark:bg-[#161822]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                {adminCount}
              </span>
              <span className="rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.2">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Quản trị viên</p>
          </div>
        </div>
      </div>

      {/* Đang hoạt động */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/[0.07] dark:bg-[#161822]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                {activeCount}
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Đang trực tuyến</p>
          </div>
        </div>
      </div>

      {/* Bị khóa */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-white/[0.07] dark:bg-[#161822]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            <UserX className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {lockedCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Bị khóa</p>
          </div>
        </div>
      </div>
    </div>
  );
};
