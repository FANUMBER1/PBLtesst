"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const duration = toast.duration ?? 4000;
      const newToast: ToastItem = { ...toast, id, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Giới hạn tối đa 5 toast trên màn hình

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: "success", title, message }),
    [addToast]
  );
  const error = useCallback(
    (message: string, title?: string) => addToast({ type: "error", title, message }),
    [addToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: "warning", title, message }),
    [addToast]
  );
  const info = useCallback(
    (message: string, title?: string) => addToast({ type: "info", title, message }),
    [addToast]
  );

  const contextValue = useMemo(
    () => ({ toasts, addToast, removeToast, success, error, warning, info }),
    [toasts, addToast, removeToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải được sử dụng bên trong ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const config = {
    success: {
      icon: CheckCircle2,
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/85 dark:bg-emerald-950/90 text-emerald-100",
      iconColor: "text-emerald-400",
      progressBg: "bg-emerald-500",
      defaultTitle: "Thành công",
    },
    error: {
      icon: AlertCircle,
      border: "border-rose-500/30",
      bg: "bg-rose-950/85 dark:bg-rose-950/90 text-rose-100",
      iconColor: "text-rose-400",
      progressBg: "bg-rose-500",
      defaultTitle: "Lỗi",
    },
    warning: {
      icon: AlertTriangle,
      border: "border-amber-500/30",
      bg: "bg-amber-950/85 dark:bg-amber-950/90 text-amber-100",
      iconColor: "text-amber-400",
      progressBg: "bg-amber-500",
      defaultTitle: "Cảnh báo",
    },
    info: {
      icon: Info,
      border: "border-cyan-500/30",
      bg: "bg-slate-900/90 dark:bg-slate-900/95 text-cyan-100",
      iconColor: "text-cyan-400",
      progressBg: "bg-cyan-500",
      defaultTitle: "Thông tin",
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 transform ${
        config.border
      } ${config.bg} ${
        isEntering ? "opacity-0 translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold tracking-wide uppercase text-white/90">
            {toast.title || config.defaultTitle}
          </h4>
          <p className="mt-0.5 text-xs text-white/80 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
