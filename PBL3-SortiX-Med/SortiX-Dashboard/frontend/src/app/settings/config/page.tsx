"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { usePermission } from "@/contexts/AuthContext";
import { ConfigAndDiagnostics } from "@/components/ConfigAndDiagnostics";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsConfigPage() {
  const {
    sorterConfig,
    telemetry,
    alerts,
    pingMs,
    handleSaveAndPublishConfig,
    configStatusMsg,
    handleClearAlerts,
    handleResetConfigToDefault,
    handleEmergencyStop,
    isSimulation,
    handleTriggerJam,
    isJammed,
    handleClearJam,
    isBinFull,
    handleTriggerBinFull,
    handleConfirmBinReplaced,
    isTempWarning,
    handleTriggerTemperatureWarning,
    handleCoolDownTemperature,
    isDeviceOffline,
    handleTriggerDeviceOffline,
    handleReconnectDevice,
    handleTriggerShiftSummary,
    isMqttAlertActive,
    handleSimulateMqttDisconnect,
    handleReconnectMqtt,
    binCounts,
    handleSetBinCount,
    binCapacities,
    handleSetBinCapacity,
  } = useDashboard();

  const canEdit = usePermission("config.edit");
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!canEdit) {
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
  }, [canEdit, router]);

  if (!canEdit) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          403 Forbidden - Truy cập bị từ chối
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
          Trang <b>Cấu hình</b> yêu cầu quyền <b>quản trị viên</b>. Tài khoản người dùng không được phép truy cập hoặc chỉnh sửa thông số thiết bị.
        </p>
        <p className="text-xs text-slate-400 mt-2 font-mono">
          Tự động quay về trang chủ trong {countdown}s...
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-7.5rem)] w-full flex flex-col pb-6 animate-in fade-in duration-300">
      <ConfigAndDiagnostics
        config={sorterConfig}
        telemetry={telemetry}
        alerts={alerts}
        pingMs={pingMs}
        onSaveConfig={handleSaveAndPublishConfig}
        applyStatusText={configStatusMsg}
        onClearAlerts={handleClearAlerts}
        onResetDefaultConfig={handleResetConfigToDefault}
        onSimulateEStop={isSimulation ? handleEmergencyStop : undefined}
        onSimulateJam={isSimulation ? () => handleTriggerJam(undefined, "user_action") : undefined}
        isJammed={isJammed}
        onClearJam={handleClearJam}
        onSimulateBinFull={
          isSimulation
            ? (binIdx = 1) => {
                const binId = binIdx === 1 ? "BIN_RED_01" : binIdx === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03";
                void handleTriggerBinFull({ bin_id: binId, current_count: 50, max_capacity: 50 }, "user_action");
              }
            : undefined
        }
        isBinFull={isBinFull}
        onConfirmBinReplaced={() => handleConfirmBinReplaced()}
        onSimulateTemperatureChange={
          isSimulation
            ? (temp: number) => {
                void handleTriggerTemperatureWarning(
                  {
                    device_name: "Main_Drive_Motor / Edge_AI_Box",
                    current_temp: temp,
                    threshold_temp: 75.0,
                    unit: "°C",
                    mode: "realtime",
                  },
                  "sim_slider"
                );
              }
            : undefined
        }
        isTempWarning={isTempWarning}
        onCoolDownTemperature={handleCoolDownTemperature}
        onSimulateDeviceOffline={
          isSimulation
            ? () => {
                void handleTriggerDeviceOffline(
                  {
                    event: "device_offline",
                    device_id: "ESP32_MAIN_CONTROLLER",
                    ip_address: "192.168.1.105",
                    last_seen: "15 giây trước",
                    mode: "realtime",
                  },
                  "user_action"
                );
              }
            : undefined
        }
        isDeviceOffline={isDeviceOffline}
        onReconnectDevice={handleReconnectDevice}
        isSimulation={isSimulation}
        binCounts={binCounts}
        onSetBinCount={isSimulation ? handleSetBinCount : undefined}
        binCapacities={binCapacities}
        onSetBinCapacity={handleSetBinCapacity}
        onSimulateMqttDisconnect={handleSimulateMqttDisconnect}
        onReconnectMqtt={handleReconnectMqtt}
        isMqttAlertActive={isMqttAlertActive}
      />
    </div>
  );
}
