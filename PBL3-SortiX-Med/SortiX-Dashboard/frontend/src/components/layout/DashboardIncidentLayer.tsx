"use client";

import React from "react";
import {
  EmergencyStopPayload,
  JamDetectedPayload,
  BinFullPayload,
  TemperatureWarningPayload,
  DeviceOfflinePayload,
  ShiftSummaryPayload,
  MqttDisconnectedPayload,
} from "@/lib/types";
import { EmergencyUnlockToast } from "@/components/ui/EmergencyUnlockToast";
import { JamUnlockToast } from "@/components/ui/JamUnlockToast";
import { BinFullToast } from "@/components/ui/BinFullToast";
import { TemperatureWarningToast } from "@/components/ui/TemperatureWarningToast";
import { DeviceOfflineToast } from "@/components/ui/DeviceOfflineToast";
import { ShiftSummaryToast } from "@/components/ui/ShiftSummaryToast";
import { ShiftSummaryModal } from "@/components/ui/ShiftSummaryModal";
import { MqttDisconnectedToast } from "@/components/ui/MqttDisconnectedToast";
import { EmergencyConfirmModal } from "@/components/ui/EmergencyConfirmModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface DashboardIncidentLayerProps {
  // E-Stop
  isSystemLocked: boolean;
  estopIncident: EmergencyStopPayload | null;
  onUnlockSystem: (note?: string) => Promise<boolean>;
  estopConfirmModalOpen: boolean;
  onConfirmEstopAction: () => void;
  onCancelEstopAction: () => void;

  // Jam
  isJammed: boolean;
  jamIncident: JamDetectedPayload | null;
  onClearJam: () => void;

  // Bin Full
  isBinFull: boolean;
  fullBinIncident: BinFullPayload | null;
  fullBinIndex: 1 | 2 | 3 | null;
  onConfirmBinReplaced: () => void;

  // Temperature
  isTempWarning: boolean;
  tempIncident: TemperatureWarningPayload | null;
  onAcknowledgeTemperatureWarning: () => void;
  onCoolDownTemperature?: () => void;
  isSimulation: boolean;

  // Device Offline
  isDeviceOffline: boolean;
  deviceOfflineIncident: DeviceOfflinePayload | null;
  onAcknowledgeDeviceOffline: () => void;
  onReconnectDevice?: () => void;

  // Shift Summary
  isShiftSummaryToastOpen: boolean;
  isShiftSummaryModalOpen: boolean;
  shiftSummaryIncident: ShiftSummaryPayload | null;
  onOpenShiftSummaryModal: () => void;
  onCloseShiftSummaryToast: () => void;
  onCloseShiftSummaryModal: () => void;

  // MQTT Disconnect
  isMqttAlertActive: boolean;
  mqttDisconnectedIncident: MqttDisconnectedPayload | null;
  mqttReconnectAttempt: number;
  onForceReconnectMqtt: () => void;

  // Clear History Dialog
  clearHistoryDialogOpen: boolean;
  onConfirmClearHistory: () => void;
  onCancelClearHistory: () => void;
}

export const DashboardIncidentLayer: React.FC<DashboardIncidentLayerProps> = ({
  isSystemLocked,
  estopIncident,
  onUnlockSystem,
  estopConfirmModalOpen,
  onConfirmEstopAction,
  onCancelEstopAction,
  isJammed,
  jamIncident,
  onClearJam,
  isBinFull,
  fullBinIncident,
  fullBinIndex,
  onConfirmBinReplaced,
  isTempWarning,
  tempIncident,
  onAcknowledgeTemperatureWarning,
  onCoolDownTemperature,
  isSimulation,
  isDeviceOffline,
  deviceOfflineIncident,
  onAcknowledgeDeviceOffline,
  onReconnectDevice,
  isShiftSummaryToastOpen,
  isShiftSummaryModalOpen,
  shiftSummaryIncident,
  onOpenShiftSummaryModal,
  onCloseShiftSummaryToast,
  onCloseShiftSummaryModal,
  isMqttAlertActive,
  mqttDisconnectedIncident,
  mqttReconnectAttempt,
  onForceReconnectMqtt,
  clearHistoryDialogOpen,
  onConfirmClearHistory,
  onCancelClearHistory,
}) => {
  return (
    <>
      {/* Toast cảnh báo đỏ nổi kèm nút mở khóa kiểm tra an toàn */}
      <EmergencyUnlockToast
        isOpen={isSystemLocked}
        incident={estopIncident}
        onUnlock={onUnlockSystem}
      />

      {/* Toast cảnh báo kẹt phôi nổi góc dưới bên phải kèm nút gỡ kẹt & modal xác nhận an toàn */}
      <JamUnlockToast
        isOpen={isJammed}
        incident={jamIncident}
        onClearJam={onClearJam}
        isSystemLocked={isSystemLocked}
      />

      {/* Toast cảnh báo đầy khay chứa nổi góc dưới bên phải */}
      <BinFullToast
        isOpen={isBinFull}
        incident={fullBinIncident}
        binNumber={fullBinIndex || 1}
        onConfirmReplace={onConfirmBinReplaced}
        isSystemLocked={isSystemLocked}
        isJammed={isJammed}
      />

      {/* Toast cảnh báo quá nhiệt động cơ / CPU máy chủ */}
      <TemperatureWarningToast
        isOpen={isTempWarning}
        incident={tempIncident}
        onAcknowledge={onAcknowledgeTemperatureWarning}
        onCoolDown={isSimulation ? onCoolDownTemperature : undefined}
        isSystemLocked={isSystemLocked}
        isJammed={isJammed}
        isBinFull={isBinFull}
      />

      {/* Toast cảnh báo thiết bị ngoại tuyến */}
      <DeviceOfflineToast
        isOpen={isDeviceOffline}
        incident={deviceOfflineIncident}
        onAcknowledge={onAcknowledgeDeviceOffline}
        onReconnect={isSimulation ? onReconnectDevice : undefined}
        isSystemLocked={isSystemLocked}
        isJammed={isJammed}
        isBinFull={isBinFull}
        isTempWarning={isTempWarning}
      />

      {/* Toast thông báo Báo cáo 1 ngày làm việc */}
      <ShiftSummaryToast
        isOpen={isShiftSummaryToastOpen}
        incident={shiftSummaryIncident}
        onOpenDetails={onOpenShiftSummaryModal}
        onClose={onCloseShiftSummaryToast}
        isSystemLocked={isSystemLocked}
        isJammed={isJammed}
        isBinFull={isBinFull}
        isTempWarning={isTempWarning}
        isDeviceOffline={isDeviceOffline}
      />

      {/* Toast cảnh báo mất kết nối MQTT Broker */}
      <MqttDisconnectedToast
        isOpen={isMqttAlertActive}
        incident={mqttDisconnectedIncident}
        reconnectAttempt={mqttReconnectAttempt}
        onForceReconnect={onForceReconnectMqtt}
        isSystemLocked={isSystemLocked}
        isJammed={isJammed}
        isBinFull={isBinFull}
        isTempWarning={isTempWarning}
        isDeviceOffline={isDeviceOffline}
      />

      {/* Modal Báo cáo tổng kết 1 ngày làm việc chi tiết */}
      <ShiftSummaryModal
        isOpen={isShiftSummaryModalOpen}
        summary={shiftSummaryIncident}
        onClose={onCloseShiftSummaryModal}
      />

      {/* Modal xác nhận Dừng Khẩn Cấp */}
      <EmergencyConfirmModal
        isOpen={estopConfirmModalOpen}
        onConfirm={onConfirmEstopAction}
        onCancel={onCancelEstopAction}
      />

      {/* Confirm Dialog: Xóa lịch sử phân loại */}
      <ConfirmDialog
        isOpen={clearHistoryDialogOpen}
        title="Xác nhận xóa lịch sử"
        message={`Bạn có chắc chắn muốn xóa toàn bộ lịch sử phân loại trong chế độ ${
          isSimulation ? "MÔ PHỎNG" : "THỰC TẾ"
        }? Hành động này sẽ đặt lại bộ đếm sản phẩm và không thể hoàn tác.`}
        confirmText="Xóa dữ liệu"
        cancelText="Hủy bỏ"
        type="danger"
        onConfirm={onConfirmClearHistory}
        onCancel={onCancelClearHistory}
      />
    </>
  );
};
