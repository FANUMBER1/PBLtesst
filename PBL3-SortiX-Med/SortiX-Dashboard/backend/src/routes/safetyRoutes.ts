import { SafetyController } from "../controllers/safetyController";

export const SafetyRoutes = {
  handleGetTelemetry: () => SafetyController.getTelemetry(),
  handleGetStatus: () => SafetyController.getStatus(),
  handlePostEstop: (body: unknown) => SafetyController.triggerEmergencyStop(body),
  handlePostJam: (body: unknown) => SafetyController.triggerJamAlert(body),
  handlePostBinFull: (body: unknown) => SafetyController.triggerBinFullAlert(body),
  handlePostTemperatureWarning: (body: unknown) => SafetyController.triggerTemperatureWarningAlert(body),
  handlePostDeviceOffline: (body: unknown) => SafetyController.triggerDeviceOfflineAlert(body),
  handlePostHeartbeat: (body: unknown) => SafetyController.recordHeartbeat(body),
  handlePostShiftSummary: (body: unknown) => SafetyController.triggerShiftSummaryAlert(body),
  handlePostMqttDisconnected: (body: unknown) => SafetyController.triggerMqttDisconnectedAlert(body),
  handlePostMqttConnected: (body?: unknown) => SafetyController.recoverMqttConnectedAlert(body),
  handlePostUnlock: (adminUser: { userId: string; username: string; role: string }, body: unknown) =>
    SafetyController.unlockSystem(adminUser, body),
  handleGetNotifications: (status?: string) => SafetyController.getNotifications(status),
};

