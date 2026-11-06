"use client";

import React, { useState } from "react";
import { AlertTriangle, Wrench, ShieldCheck, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import { JamDetectedPayload } from "@shared/types";
import { industrialAudio } from "@/lib/audioService";

interface JamUnlockToastProps {
  isOpen: boolean;
  incident?: JamDetectedPayload | null;
  onClearJam: () => void;
  isSystemLocked?: boolean;
}

export const JamUnlockToast: React.FC<JamUnlockToastProps> = ({
  isOpen,
  incident,
  onClearJam,
  isSystemLocked = false,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSirenSilenced, setIsSirenSilenced] = useState(false);

  if (!isOpen) return null;

  const section = incident?.section || "Khu vực Băng chuyền Zone A";
  const sensorId = incident?.sensor_id || "OPTICAL_JAM_02";
  const duration = incident?.duration_seconds ?? 5;

  const handleToggleSiren = () => {
    if (isSirenSilenced) {
      industrialAudio.startContinuousJamAlarm();
      setIsSirenSilenced(false);
    } else {
      industrialAudio.stopContinuousJamAlarm();
      setIsSirenSilenced(true);
    }
  };

  const handleConfirmClear = () => {
    setIsClearing(true);
    industrialAudio.stopContinuousJamAlarm();
    setIsSirenSilenced(false);
    onClearJam();
    setIsClearing(false);
    setShowConfirmModal(false);
  };

  return (
    <>
      {/* Persistent Floating Toast ở góc dưới bên phải (Hiển thị duy nhất 1 lần, không bị xếp chồng) */}
      <div
        role="alert"
        className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-amber-500 bg-[#160b10]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce-subtle ${
          isSystemLocked ? "bottom-56" : "bottom-6"
        }`}
        style={{
          boxShadow: "0 10px 40px rgba(245, 158, 11, 0.35), 0 0 20px rgba(244, 63, 94, 0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Cảnh báo kẹt phôi
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleSiren}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                    isSirenSilenced
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30"
                      : "bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/40 animate-pulse"
                  }`}
                  title={isSirenSilenced ? "Bật lại còi kẹt phôi" : "Tắt còi để đỡ ồn trong lúc gỡ kẹt"}
                >
                  {isSirenSilenced ? (
                    <>
                      <VolumeX className="h-3 w-3 text-amber-400" />
                      <span>Đã tắt còi</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3 text-amber-300" />
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
              Phát hiện tắc nghẽn sản phẩm tại <strong className="text-yellow-300">{section}</strong> ({sensorId}) quá {duration}s. Băng chuyền đã tự động dừng khẩn cấp để bảo vệ cơ cấu.
            </p>

            <p className="mt-1 text-[11px] text-amber-300/90 font-medium">
              👉 <u>Hướng dẫn:</u> Vui lòng kiểm tra khay phân loại và gỡ sản phẩm bị kẹt trước khi tiếp tục.
            </p>

            {/* Thanh trạng thái & Nút tắt/bật còi để đỡ ồn trong lúc kiểm tra gỡ kẹt */}
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                {isSirenSilenced ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-200">Còi báo: <strong className="text-amber-300 font-bold">Đã tắt tạm thời</strong></span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
                    <span className="text-amber-200">Còi báo: <strong className="text-amber-300 font-bold">Đang kêu cảnh báo</strong></span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleSiren}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                  isSirenSilenced
                    ? "border border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "border border-amber-400/50 bg-amber-600/80 hover:bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                }`}
                title={isSirenSilenced ? "Bật lại còi kẹt phôi" : "Tắt còi báo để đỡ ồn trong lúc gỡ kẹt"}
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
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isClearing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 hover:from-amber-500 hover:to-rose-500 py-2.5 px-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg hover:shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Wrench className="h-4 w-4" />
                <span>Gỡ kẹt & khởi động lại</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận kiểm tra an toàn hiện trường khi gỡ kẹt phôi (Giống như E-Stop) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-[#161822] p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Xác nhận đã gỡ kẹt phôi</h3>
                <p className="text-xs text-slate-400">Kiểm tra vật cản trước khi cấp quyền chạy lại băng chuyền</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Yêu cầu tuân thủ an toàn:</strong> Bạn cam kết đã kiểm tra trực quan tại <strong>{section}</strong>, sản phẩm bị kẹt đã được lấy ra khỏi băng tải và không còn vật cản che khuất cảm biến {sensorId}.
                </span>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Sau khi xác nhận, còi cảnh báo sẽ tự động tắt và băng tải sẽ tiếp tục vận hành bình thường.</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isClearing}
                className="rounded-xl border border-white/[0.08] bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isClearing ? "Đang xử lý..." : "Xác nhận & khởi động lại"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
