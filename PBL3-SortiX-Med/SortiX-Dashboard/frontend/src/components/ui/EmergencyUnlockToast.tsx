"use client";

import React, { useState } from "react";
import { OctagonAlert, ShieldCheck, Lock, AlertTriangle, Key, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EmergencyStopPayload } from "@shared/types";
import { industrialAudio } from "@/lib/audioService";

interface EmergencyUnlockToastProps {
  isOpen: boolean;
  incident?: EmergencyStopPayload | null;
  onUnlock: (note?: string) => Promise<boolean>;
}

export const EmergencyUnlockToast: React.FC<EmergencyUnlockToastProps> = ({
  isOpen,
  incident,
  onUnlock,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [safetyNote, setSafetyNote] = useState("");
  const [isSirenSilenced, setIsSirenSilenced] = useState(false);

  // Kích hoạt còi hú khẩn cấp liên tục khi xảy ra sự cố E-Stop
  React.useEffect(() => {
    if (isOpen) {
      setIsSirenSilenced(false);
      industrialAudio.startContinuousEmergencyAlarm();
    } else {
      industrialAudio.stopContinuousEmergencyAlarm();
    }
    return () => {
      industrialAudio.stopContinuousEmergencyAlarm();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const station = incident?.station_id || "STATION_01";
  const triggeredBy = incident?.triggered_by || "Physical E-Stop Button #1";

  const handleToggleSiren = () => {
    if (isSirenSilenced) {
      industrialAudio.startContinuousEmergencyAlarm();
      setIsSirenSilenced(false);
    } else {
      industrialAudio.stopContinuousEmergencyAlarm();
      setIsSirenSilenced(true);
    }
  };

  const handleConfirmUnlock = async () => {
    if (!isAdmin) return;
    setIsUnlocking(true);
    const noteToSend = safetyNote.trim() || "Đã kiểm tra hiện trường & xác nhận an toàn";
    const success = await onUnlock(noteToSend);
    setIsUnlocking(false);
    if (success) {
      industrialAudio.silenceAll();
      setShowConfirmModal(false);
      setSafetyNote("");
      setIsSirenSilenced(false);
    }
  };

  return (
    <>
      {/* Persistent Red Alert Toast in Bottom-Right */}
      <div
        role="alert"
        className="fixed bottom-6 right-6 z-50 max-w-md w-full rounded-2xl border-2 border-rose-500 bg-[#160b10]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce-subtle"
        style={{
          boxShadow: "0 10px 40px rgba(225, 29, 72, 0.45), 0 0 20px rgba(225, 29, 72, 0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg animate-pulse">
            <OctagonAlert className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                Sự cố dừng khẩn cấp
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleSiren}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                    isSirenSilenced
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 animate-pulse"
                  }`}
                  title={isSirenSilenced ? "Bật lại còi hú báo động" : "Tắt còi để đỡ ồn trong lúc kiểm tra"}
                >
                  {isSirenSilenced ? (
                    <>
                      <VolumeX className="h-3 w-3 text-amber-400" />
                      <span>Đã tắt còi</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3 text-rose-300" />
                      <span>Tắt còi</span>
                    </>
                  )}
                </button>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                  CRITICAL
                </span>
              </div>
            </div>

            <p className="mt-1 text-xs font-semibold text-slate-200 leading-snug">
              Trạm <strong className="text-yellow-300 font-bold">{station}</strong> đã ngắt dừng khẩn cấp do <span className="underline">{triggeredBy}</span>. Toàn bộ băng tải và nút bấm vận hành đã tự động khóa.
            </p>

            {/* Thanh trạng thái & Nút tắt/bật còi để đỡ ồn trong lúc kiểm tra hiện trường */}
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                {isSirenSilenced ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-200">Còi báo: <strong className="text-amber-300 font-bold">Đã tắt tạm thời</strong></span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-rose-400 animate-pulse shrink-0" />
                    <span className="text-rose-200">Còi báo: <strong className="text-rose-300 font-bold">Đang hú liên tục</strong></span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleSiren}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                  isSirenSilenced
                    ? "border border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "border border-rose-400/50 bg-rose-600/80 hover:bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                }`}
                title={isSirenSilenced ? "Bật lại còi hú báo động" : "Tắt còi báo để đỡ ồn trong lúc kiểm tra hiện trường"}
              >
                {isSirenSilenced ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Bật còi</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5" />
                    <span>Tắt còi</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-2.5">
              {isAdmin ? (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isUnlocking}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 px-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Kiểm tra an toàn & mở khóa</span>
                </button>
              ) : (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300">
                    <Lock className="h-3.5 w-3.5 text-rose-400" />
                    <span>Nút mở khóa bị vô hiệu</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Chỉ tài khoản Quản trị viên (Admin) mới có quyền xác nhận mở khóa an toàn sau sự cố.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận kiểm tra an toàn dành riêng cho Admin */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#161822] p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Xác nhận mở khóa (Admin)</h3>
                  <p className="text-xs text-slate-400">Kiểm tra hiện trường trước khi cấp quyền chạy lại</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSiren}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold border transition-all cursor-pointer ${
                  isSirenSilenced
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                    : "border-rose-400/40 bg-rose-600/60 hover:bg-rose-600/80 text-white"
                }`}
                title={isSirenSilenced ? "Bật lại còi hú" : "Tắt còi để đỡ ồn"}
              >
                {isSirenSilenced ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                <span>{isSirenSilenced ? "Bật còi" : "Tắt còi"}</span>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Yêu cầu tuân thủ an toàn:</strong> Bạn cam kết đã kiểm tra vật lý hiện trường băng chuyền, vật kẹt (nếu có) đã được giải tỏa và tất cả nhân sự đang ở khoảng cách an toàn.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Ghi chú kiểm tra hiện trường (tùy chọn):
                </label>
                <input
                  type="text"
                  value={safetyNote}
                  onChange={(e) => setSafetyNote(e.target.value)}
                  placeholder="Ví dụ: Đã kiểm tra không còn vật kẹt, nút E-Stop cơ học đã nhả..."
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111319] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isUnlocking}
                className="rounded-xl border border-white/[0.08] bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={isUnlocking}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isUnlocking ? "Đang mở khóa..." : "Mở khóa ngay"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
