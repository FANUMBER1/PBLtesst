"use client";

import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  TelemetryData,
  SorterConfig,
  ClassificationRecord,
  AlertEvent,
  ThroughputPoint,
  ThemeMode,
  VisualItem,
  EmergencyStopPayload,
  JamDetectedPayload,
  BinFullPayload,
  TemperatureWarningPayload,
  DeviceOfflinePayload,
  ShiftSummaryPayload,
  MqttDisconnectedPayload,
  BinCapacities,
} from "@/lib/types";
import { cleanTelemetryPayload, detectAnomalies } from "@/lib/dataProcessor";
import {
  loadSorterConfigLocal,
  saveSorterConfigLocal,
  resetSorterConfigLocal,
  filterTodayRecords,
  calculateDailyTotalProduction,
  getBusinessDateKey,
  formatVietnameseDate,
} from "@/lib/history";
import { logHardwareTestAction } from "@/lib/hardwareAuditService";
import { triggerAlertDispatch, sendTelegramAlert, sendEmailAlert } from "@/lib/alertService";
import { industrialAudio } from "@/lib/audioService";
import { EmergencyStopBanner } from "./EmergencyStopBanner";
import { BinFullIncidentBanner } from "./BinFullIncidentBanner";
import { EmergencyUnlockToast } from "@/components/ui/EmergencyUnlockToast";
import { JamUnlockToast } from "@/components/ui/JamUnlockToast";
import { BinFullToast } from "@/components/ui/BinFullToast";
import { TemperatureWarningToast } from "@/components/ui/TemperatureWarningToast";
import { DeviceOfflineToast } from "@/components/ui/DeviceOfflineToast";
import { ShiftSummaryToast } from "@/components/ui/ShiftSummaryToast";
import { ShiftSummaryModal } from "@/components/ui/ShiftSummaryModal";
import { MqttDisconnectedToast } from "@/components/ui/MqttDisconnectedToast";
import { EmergencyConfirmModal } from "@/components/ui/EmergencyConfirmModal";
import { DashboardIncidentLayer } from "./DashboardIncidentLayer";
import { AiCopilot } from "@/components/AiCopilot";
import { ApiSafetyClient } from "@/services/apiSafetyClient";
import { fetchSyncData, myClientId, updateSyncState } from "@/services/apiSyncClient";


// Custom Hooks (Refactored Architecture)
import { useThemeAudio } from "@/hooks/useThemeAudio";
import { useSorterData } from "@/hooks/useSorterData";
import { useConveyorPhysics } from "@/hooks/useConveyorPhysics";
import { useMQTT } from "@/hooks/useMQTT";

// Context chia sẻ dữ liệu toàn hệ thống
export interface DashboardState {
  // Safety & E-Stop
  isSystemLocked: boolean;
  estopIncident: EmergencyStopPayload | null;
  handleTriggerEmergencyStop: (
    payload?: Partial<EmergencyStopPayload>,
    source?: "user_action" | "mqtt_in" | "sse_in"
  ) => Promise<void>;
  handleUnlockSystem: (note?: string) => Promise<boolean>;

  // Jam Detection
  isJammed: boolean;
  jamIncident: JamDetectedPayload | null;
  handleTriggerJam: (
    payload?: Partial<JamDetectedPayload>,
    source?: "user_action" | "mqtt_in" | "sse_in" | "physics_in"
  ) => Promise<void>;
  handleClearJam: () => void;

  // Bin Full Detection
  isBinFull: boolean;
  fullBinIncident: BinFullPayload | null;
  fullBinIndex: 1 | 2 | 3 | null;
  handleTriggerBinFull: (
    payload?: Partial<BinFullPayload>,
    source?: "user_action" | "mqtt_in" | "sse_in" | "counter_in"
  ) => Promise<void>;
  handleConfirmBinReplaced: (binIndex?: 1 | 2 | 3) => void;
  handleSetBinCount: (binIndex: 1 | 2 | 3, count: number) => void;
  binCapacities: BinCapacities;
  handleSetBinCapacity: (binIndex: 1 | 2 | 3, capacity: number) => void;

  // Temperature Warning Detection
  isTempWarning: boolean;
  tempIncident: TemperatureWarningPayload | null;
  handleTriggerTemperatureWarning: (
    payload?: Partial<TemperatureWarningPayload>,
    source?: "user_action" | "mqtt_in" | "sse_in" | "sim_slider"
  ) => Promise<void>;
  handleAcknowledgeTemperatureWarning: () => void;
  handleCoolDownTemperature: () => void;

  // Device Offline Detection
  isDeviceOffline: boolean;
  deviceOfflineIncident: DeviceOfflinePayload | null;
  handleTriggerDeviceOffline: (
    payload?: Partial<DeviceOfflinePayload>,
    source?: "user_action" | "mqtt_in" | "sse_in" | "watchdog"
  ) => Promise<void>;
  handleAcknowledgeDeviceOffline: () => void;
  handleReconnectDevice: () => void;

  // Shift Summary Report
  shiftSummaryIncident: ShiftSummaryPayload | null;
  isShiftSummaryToastOpen: boolean;
  isShiftSummaryModalOpen: boolean;
  handleTriggerShiftSummary: (
    payload?: Partial<ShiftSummaryPayload>,
    source?: "user_action" | "timer_17h" | "new_day_transition" | "sse_in"
  ) => Promise<void>;
  handleCloseShiftSummaryToast: () => void;
  handleOpenShiftSummaryModal: () => void;
  handleCloseShiftSummaryModal: () => void;

  // Telemetry & MQTT
  telemetry: TelemetryData;
  setTelemetry: React.Dispatch<React.SetStateAction<TelemetryData>>;
  mqttStatus: "connected" | "disconnected" | "error";
  isMqttAlertActive: boolean;
  reconnectAttempt: number;
  handleSimulateMqttDisconnect: () => void;
  handleReconnectMqtt: () => void;
  pingMs: number;
  isSimulation: boolean;
  setIsSimulation: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSimulationMode: (targetMode?: boolean) => void;
  generateSimulationDemoData: () => void;


  // Conveyor
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  conveyorSpeed: number;
  setConveyorSpeed: React.Dispatch<React.SetStateAction<number>>;
  visualItems: VisualItem[];
  setVisualItems: React.Dispatch<React.SetStateAction<VisualItem[]>>;
  arm1Active: boolean;
  arm2Active: boolean;

  // Config
  sorterConfig: SorterConfig;
  setSorterConfig: React.Dispatch<React.SetStateAction<SorterConfig>>;
  configStatusMsg: string;
  handleSaveAndPublishConfig: (
    newConfig: SorterConfig
  ) => Promise<{ success: boolean; message: string }>;

  // Data
  records: ClassificationRecord[];
  setRecords: (action: React.SetStateAction<ClassificationRecord[]>) => void;
  alerts: AlertEvent[];
  setAlerts: React.Dispatch<React.SetStateAction<AlertEvent[]>>;
  binCounts: { bin1: number; bin2: number; bin3: number };
  routedBinCounts: { bin1: number; bin2: number; bin3: number };
  setBinCounts: (
    action: React.SetStateAction<{ bin1: number; bin2: number; bin3: number }>
  ) => void;
  brandCounts: Record<string, number>;
  setBrandCounts: (action: React.SetStateAction<Record<string, number>>) => void;
  throughputHistory: ThroughputPoint[];

  // Action handlers
  handleToggleRun: () => void;
  handleEmergencyStop: () => void;
  handleSpeedChange: (speed: number) => void;
  spawnVisualPackage: (brandKey?: string, productId?: string) => void;
  handleClearHistory: () => void;
  handleClearAlerts: () => void;
  handleClearBin: (binIndex: 1 | 2 | 3) => void;
  handleResetConfigToDefault: () => void;
  handleResetActuatorStates: () => void;
  handleTestActuator: (type: "servo_1" | "servo_2" | "buzzer", value?: number) => void;

  // Theme & Audio
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isMuted: boolean;
  handleToggleSound: () => void;

  // Manual sync
  isSyncing: boolean;
  handleManualSync: () => Promise<void>;

  // Display Density & Screen Fit
  displayDensity: "compact" | "comfortable";
  setDisplayDensity: (density: "compact" | "comfortable") => void;
  toggleDisplayDensity: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const DashboardContext = React.createContext<DashboardState | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard phải được sử dụng bên trong DashboardLayout");
  }
  return context;
};

export const useDashboardSafe = () => useContext(DashboardContext);

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const { isAuthenticated, user } = useAuth();
  const isLoginPageRef = useRef(isLoginPage);
  isLoginPageRef.current = isLoginPage;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;
  const userRef = useRef(user);
  userRef.current = user;
  const toast = useToast();

  // Safety & Emergency Stop State
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  const [estopIncident, setEstopIncident] = useState<EmergencyStopPayload | null>(null);
  const [estopConfirmModalOpen, setEstopConfirmModalOpen] = useState(false);
  const [hardwareEstopAcked, setHardwareEstopAcked] = useState(false);
  const isSystemLockedRef = useRef(isSystemLocked);
  const lastUnlockedTimeRef = useRef(0);

  // Jam Detection State
  const [isJammed, setIsJammed] = useState(false);
  const [jamIncident, setJamIncident] = useState<JamDetectedPayload | null>(null);
  const isJammedRef = useRef(isJammed);
  isJammedRef.current = isJammed;

  // Bin Full Detection State
  const [isBinFull, setIsBinFull] = useState(false);
  const [fullBinIncident, setFullBinIncident] = useState<BinFullPayload | null>(null);
  const [fullBinIndex, setFullBinIndex] = useState<1 | 2 | 3 | null>(null);
  const isBinFullRef = useRef(isBinFull);
  isBinFullRef.current = isBinFull;
  const fullBinIndexRef = useRef<1 | 2 | 3 | null>(fullBinIndex);
  fullBinIndexRef.current = fullBinIndex;

  // Temperature Warning State
  const [isTempWarning, setIsTempWarning] = useState(false);
  const [tempIncident, setTempIncident] = useState<TemperatureWarningPayload | null>(null);
  const isTempWarningRef = useRef(isTempWarning);
  isTempWarningRef.current = isTempWarning;
  const customSimTempRef = useRef<number | null>(null);

  // Device Offline State
  const [isDeviceOffline, setIsDeviceOffline] = useState(false);
  const [deviceOfflineIncident, setDeviceOfflineIncident] = useState<DeviceOfflinePayload | null>(null);
  const isDeviceOfflineRef = useRef(isDeviceOffline);
  isDeviceOfflineRef.current = isDeviceOffline;
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const simHeartbeatStoppedRef = useRef<boolean>(false);
  const triggerDeviceOfflineRef = useRef<
    (payload?: Partial<DeviceOfflinePayload>, source?: "user_action" | "mqtt_in" | "sse_in" | "watchdog") => Promise<void>
  >(() => Promise.resolve());

  // Shift Summary State
  const [shiftSummaryIncident, setShiftSummaryIncident] = useState<ShiftSummaryPayload | null>(null);
  const [isShiftSummaryToastOpen, setIsShiftSummaryToastOpen] = useState(false);
  const [isShiftSummaryModalOpen, setIsShiftSummaryModalOpen] = useState(false);
  const hasTriggered17hTodayRef = useRef<string>("");
  const hasTriggeredNewDayRef = useRef<string>("");
  const lastActiveDayRef = useRef<string>(getBusinessDateKey());
  const triggerShiftSummaryRef = useRef<
    (payload?: Partial<ShiftSummaryPayload>, source?: "user_action" | "timer_17h" | "new_day_transition" | "sse_in") => Promise<void>
  >(() => Promise.resolve());

  // Sidebar & Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Hook 1: Theme and Audio Management
  const { themeMode, toggleTheme, isMuted, handleToggleSound } = useThemeAudio();

  // Display Density: compact vs comfortable
  const [displayDensity, setDisplayDensityState] = useState<"compact" | "comfortable">("comfortable");

  useEffect(() => {
    const saved = localStorage.getItem("sortix_display_density") as "compact" | "comfortable" | null;
    if (saved === "compact" || saved === "comfortable") {
      setDisplayDensityState(saved);
    } else if (typeof window !== "undefined" && window.innerWidth <= 1366) {
      setDisplayDensityState("compact");
    }
  }, []);

  const setDisplayDensity = useCallback((density: "compact" | "comfortable") => {
    setDisplayDensityState(density);
    localStorage.setItem("sortix_display_density", density);
  }, []);

  const toggleDisplayDensity = useCallback(() => {
    setDisplayDensityState((prev) => {
      const next = prev === "compact" ? "comfortable" : "compact";
      localStorage.setItem("sortix_display_density", next);
      return next;
    });
  }, []);

  // Fullscreen HMI SCADA Mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);



  // Khi ở trang Login hoặc chưa đăng nhập, lập tức dập tắt toàn bộ còi hú báo động và hủy các trạng thái sự cố
  useEffect(() => {
    if (isLoginPage || !isAuthenticated) {
      industrialAudio.silenceAll();
      industrialAudio.stopContinuousEmergencyAlarm();
      industrialAudio.stopContinuousJamAlarm();
      industrialAudio.stopContinuousBinFullAlarm();
      industrialAudio.stopContinuousTemperatureAlarm();
      industrialAudio.stopContinuousDeviceOfflineAlarm();
      setIsDeviceOffline(false);
      setDeviceOfflineIncident(null);
      setIsSystemLocked(false);
      setEstopIncident(null);
      setIsJammed(false);
      setJamIncident(null);
      setIsBinFull(false);
      setFullBinIncident(null);
      setIsTempWarning(false);
      setTempIncident(null);
    }
  }, [isLoginPage, isAuthenticated]);

  // Sorter Config state & ref
  const [sorterConfig, setSorterConfig] = useState<SorterConfig>(loadSorterConfigLocal);
  const configRef = useRef<SorterConfig>(sorterConfig);
  configRef.current = sorterConfig;

  // Telemetry state & ref
  const [telemetry, setTelemetry] = useState<TelemetryData>(() => {
    const initConfig = loadSorterConfigLocal();
    return {
      device_id: "sorter_01",
      online: true,
      uptime: 0,
      cpu_temp: 42.5,
      wifi_rssi: -58,
      wifi_band: "5.0 GHz (Wi-Fi 6)",
      conveyor_running: false,
      conveyor_speed: 65,
      s1_entry: false,
      s2_sorter1: false,
      s3_sorter2: false,
      arm1_active: false,
      arm2_active: false,
      estop_pressed: false,
      encoder_count: 0,
      active_config_version: initConfig?.config_version || 1,
      last_heartbeat: "",
    };
  });
  const telemetryRef = useRef<TelemetryData>(telemetry);
  telemetryRef.current = telemetry;
  const [lastTelemetryTime, setLastTelemetryTime] = useState<string>("");

  // Cross-hook refs to avoid circular dependency / access before declaration
  const spawnRealItemRef = useRef<(item: VisualItem) => void>(() => {});
  const publishCommandRef = useRef<(cmd: string, value?: number) => void>(() => {});
  const triggerEmergencyStopRef = useRef<
    (payload?: Partial<EmergencyStopPayload>, source?: "user_action" | "mqtt_in" | "sse_in") => Promise<void>
  >(() => Promise.resolve());
  const triggerJamRef = useRef<
    (payload?: Partial<JamDetectedPayload>, source?: "user_action" | "mqtt_in" | "sse_in" | "physics_in") => Promise<void>
  >(() => Promise.resolve());
  const triggerBinFullRef = useRef<
    (payload?: Partial<BinFullPayload>, source?: "user_action" | "mqtt_in" | "sse_in" | "counter_in") => Promise<void>
  >(() => Promise.resolve());
  const triggerTemperatureWarningRef = useRef<
    (payload?: Partial<TemperatureWarningPayload>, source?: "user_action" | "mqtt_in" | "sse_in" | "sim_slider") => Promise<void>
  >(() => Promise.resolve());
  const setIsRunningRef = useRef<(running: boolean) => void>(() => {});
  const lastOpticalBlockedRef = useRef<boolean>(false);

  // Hook 2: Sorter Data (Records, Bins, Brands, Mode, Alerts)
  const sorterData = useSorterData({
    configRef,
    onSpawnRealVisualItem: (item) => {
      spawnRealItemRef.current(item);
    },
    onPublishCommand: (cmd, value) => {
      publishCommandRef.current(cmd, value);
    },
    onBinFullTrigger: (binIdx, count, maxCapacity) => {
      const binId = binIdx === 1 ? "BIN_RED_01" : binIdx === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03";
      void triggerBinFullRef.current({ bin_id: binId, current_count: count, max_capacity: maxCapacity }, "counter_in");
    },
  });

  const handlePublishCommandForConveyor = useCallback((cmd: string, value?: number) => {
    publishCommandRef.current(cmd, value);
  }, []);

  // Hook 3: Conveyor Physics & Controls
  const conveyor = useConveyorPhysics({
    telemetryRef,
    setTelemetry,
    configRef,
    isSimulationRef: sorterData.isSimulationRef,
    simRecordsRef: sorterData.simRecordsRef,
    simBinCountsRef: sorterData.simBinCountsRef,
    realBinCountsRef: sorterData.realBinCountsRef,
    binCapacitiesRef: sorterData.isSimulation ? sorterData.simBinCapacitiesRef : sorterData.realBinCapacitiesRef,
    onItemSorted: sorterData.handleItemSorted,
    onPublishCommand: handlePublishCommandForConveyor,
    onJamDetected: (payload) => {
      void triggerJamRef.current(payload, "physics_in");
    },
    isJammed,
    isBinFull,
    onBinFullDetected: (binIdx) => {
      const binId = binIdx === 1 ? "BIN_RED_01" : binIdx === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03";
      void triggerBinFullRef.current({ bin_id: binId }, "counter_in");
    },
  });
  spawnRealItemRef.current = (item) => {
    conveyor.setVisualItems((prev) => [...prev, item]);
  };
  setIsRunningRef.current = conveyor.setIsRunning;
  const setConveyorSpeedRef = useRef(conveyor.setConveyorSpeed);
  setConveyorSpeedRef.current = conveyor.setConveyorSpeed;
  const applyIncomingSyncStateRef = useRef(sorterData.applyIncomingSyncState);
  applyIncomingSyncStateRef.current = sorterData.applyIncomingSyncState;
  const applyIncomingSyncRecordsRef = useRef(sorterData.applyIncomingSyncRecords);
  applyIncomingSyncRecordsRef.current = sorterData.applyIncomingSyncRecords;
  const applyIncomingClearHistoryRef = useRef(sorterData.applyIncomingClearHistory);
  applyIncomingClearHistoryRef.current = sorterData.applyIncomingClearHistory;
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const setAlertsRef = useRef(sorterData.setAlerts);
  setAlertsRef.current = sorterData.setAlerts;

  // Industrial SCADA Hotkeys:
  // Space: Chạy / Tạm dừng
  // Shift + E: Dừng khẩn cấp tức thời (Instant E-Stop)
  // D: Chuyển đổi mật độ Gọn (Compact) / Tiêu chuẩn (Comfortable)
  // M: Bật / Tắt âm thanh còi báo (Mute Siren)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua khi người dùng đang nhập liệu trong ô input, textarea hoặc contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // 1. Shift + E -> Instant Emergency Stop
      if (e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        void triggerEmergencyStopRef.current(undefined, "user_action");
        toast.error("🛑 [HMI PHÍM TẮT] Đã kích hoạt DỪNG KHẨN CẤP (Shift + E)!");
        return;
      }

      // 2. Space -> Chạy / Tạm dừng băng tải
      if (e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        conveyor.handleToggleRun();
        return;
      }

      // 3. D -> Chuyển đổi mật độ hiển thị (Compact / Comfortable)
      if ((e.key === "d" || e.key === "D") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleDisplayDensity();
        toast.info(
          displayDensity === "compact"
            ? "Mật độ hiển thị: Tiêu chuẩn (Comfortable)"
            : "Mật độ hiển thị: Gọn gàng (Compact - Fit màn hình)"
        );
        return;
      }

      // 4. M -> Bật / Tắt âm thanh còi báo
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        handleToggleSound();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [conveyor, toggleDisplayDensity, displayDensity, handleToggleSound, toast]);

  // Tài khoản người dùng (role: user) chỉ có duy nhất chế độ thực tế, không có mô phỏng
  const isUserRole = user?.role === "user";
  const { isSimulation: sorterIsSim, setIsSimulation: setSorterIsSim } = sorterData;
  useEffect(() => {
    if (isUserRole && sorterIsSim) {
      setSorterIsSim(false);
    }
  }, [isUserRole, sorterIsSim, setSorterIsSim]);

  // Hook 4: MQTT WebSocket Connection
  const mqtt = useMQTT({
    isClient: sorterData.isClient && !isLoginPage && isAuthenticated,
    isSimulation: user?.role === "user" ? false : sorterData.isSimulation,
    onVisionDetection: sorterData.handleRealHardwareDetection,
    onClassification: (record) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      sorterData.handleHardwareClassification(record);
    },
    onTelemetryPayload: (payload: any) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      setLastTelemetryTime(new Date().toLocaleTimeString("vi-VN", { hour12: false }));
      
      // Kích hoạt phôi mẫu chạy khi cảm biến hồng ngoại S1 từ phần cứng phát hiện vật
      const isBlocked =
        payload?.optical_sensor === "BLOCKED" ||
        payload?.optical_sensor === 1 ||
        payload?.optical_sensor === "1" ||
        payload?.s1_entry === true;

      if (isBlocked && !lastOpticalBlockedRef.current) {
        lastOpticalBlockedRef.current = true;
        const targetBin = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
        const brands = ["brand_c", "brand_a", "brand_b"];
        const brandKey = brands[targetBin - 1] || "brand_c";
        const newItem: VisualItem = {
          id: `ESP32_${Date.now().toString().slice(-4)}`,
          brandKey: brandKey,
          progress: 0,
          targetBin: targetBin,
          yOffset: 0,
          opacity: 1,
          deflected: false,
          sorted: false,
          isSim: sorterData.isSimulation,
          timestamp: new Date().toISOString(),
        };
        spawnRealItemRef.current(newItem);
        setIsRunningRef.current(true);
      } else if (!isBlocked) {
        lastOpticalBlockedRef.current = false;
      }

      setTelemetry((prev) => {
        const updated = cleanTelemetryPayload(payload, prev);
        const detected = detectAnomalies(updated);
        if (detected.length > 0) {
          detected.forEach((alt) => {
            const alertWithMode: AlertEvent = {
              ...alt,
              mode: sorterData.isSimulation ? "simulation" : "realtime",
            };
            triggerAlertDispatch(alertWithMode);
            sorterData.setAlerts((a) => [alertWithMode, ...a].slice(0, 100));
          });
        }
        return updated;
      });
    },
    onConfigStatusApplied: (version) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      setTelemetry((prev) => ({ ...prev, active_config_version: version }));
    },
    onEmergencyStop: (payload) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      triggerEmergencyStopRef.current(payload, "mqtt_in");
    },
    onJamDetected: (payload) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      void triggerJamRef.current(payload, "mqtt_in");
    },
    onBinFull: (payload) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      void triggerBinFullRef.current(payload, "mqtt_in");
    },
    onTemperatureWarning: (payload) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      void triggerTemperatureWarningRef.current(payload, "mqtt_in");
    },
    onHeartbeat: () => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      lastHeartbeatTimeRef.current = Date.now();
      if (isDeviceOfflineRef.current) {
        setIsDeviceOffline(false);
        setDeviceOfflineIncident(null);
        industrialAudio.stopContinuousDeviceOfflineAlarm();
      }
    },
    onDeviceOffline: (payload) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      void triggerDeviceOfflineRef.current(payload, "mqtt_in");
    },
    onMqttDisconnected: (payload) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      industrialAudio.playMqttDisconnectedAlarm();
      const alertItem: AlertEvent = {
        event_id: `mqtt_${Date.now()}`,
        event_type: "mqtt_disconnected",
        severity: "critical",
        device_id: "MQTT_BROKER",
        description: `[MẤT KẾT NỐI MẠNG] Mất liên lạc với MQTT Broker! Đang thử kết nối lại lần thứ ${payload.reconnect_attempt || 1} (Reconnecting...)`,
        timestamp: payload.timestamp || new Date().toISOString(),
        resolved: false,
        mode: payload.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };
      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));
      triggerAlertDispatch(alertItem);
    },
    onMqttReconnected: () => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) return;
      industrialAudio.playMqttReconnectedChime();
      const alertItem: AlertEvent = {
        event_id: `mqtt_restored_${Date.now()}`,
        event_type: "mqtt_disconnected",
        severity: "info",
        device_id: "MQTT_BROKER",
        description: `[ĐÃ PHỤC HỒI] Kết nối MQTT Broker thành công`,
        timestamp: new Date().toISOString(),
        resolved: true,
        mode: sorterData.isSimulation ? "simulation" : "realtime",
      };
      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));
    },
    onEstopAck: (ackPayload?: unknown) => {
      if (ackPayload && typeof ackPayload === "object") {
        const p = ackPayload as Record<string, unknown>;
        if (p.event === "estop_ack" && (p.hardware_state === "ESTOP_LOCKED" || p.hardware_state === "LOCKED") && p.actuators_stopped !== false) {
          setHardwareEstopAcked(true);
          return;
        }
      }
      setHardwareEstopAcked(false);
    },
  });
  publishCommandRef.current = mqtt.publishCommand;


  // Handler: Kích hoạt Dừng Khẩn Cấp (E-Stop)
  const handleTriggerEmergencyStop = useCallback(
    async (
      customPayload?: Partial<EmergencyStopPayload>,
      source: "user_action" | "mqtt_in" | "sse_in" = "user_action"
    ) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) {
        return;
      }
      setHardwareEstopAcked(false);
      // 1. Nếu vừa mới mở khóa trong vòng 5s và nhận sự kiện từ mqtt/sse -> Bỏ qua để tránh kẹt loop echo
      if (source !== "user_action" && Date.now() - lastUnlockedTimeRef.current < 5000) {
        console.log("[E-Stop] Đang trong thời gian ân hạn 5s sau mở khóa, bỏ qua tín hiệu dừng lặp lại từ", source);
        return;
      }

      // 2. Nếu hệ thống đã bị khóa sẵn -> Không kích hoạt lại âm thanh hay gửi đè bản tin
      if (isSystemLockedRef.current) {
        return;
      }

      const payload: EmergencyStopPayload = {
        event: "emergency_stop",
        station_id: customPayload?.station_id || "STATION_01",
        triggered_by: customPayload?.triggered_by || "Physical E-Stop Button #1",
        timestamp: customPayload?.timestamp || new Date().toISOString(),
        mode: customPayload?.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };

      setIsSystemLocked(true);
      setEstopIncident(payload);

      // Dừng ngay lập tức băng chuyền
      conveyor.setIsRunning(false);
      setTelemetry((prev) => ({
        ...prev,
        estop_pressed: true,
        conveyor_running: false,
      }));

      // Báo động âm thanh còi hú E-Stop liên tục cho đến khi mở khóa
      industrialAudio.startContinuousEmergencyAlarm();

      // Ghi sự kiện vào danh sách cảnh báo
      const stationNum = payload.station_id.replace(/[^0-9]/g, "") || "01";
      const alertItem: AlertEvent = {
        event_id: `estop_${Date.now()}`,
        event_type: "emergency_stop",
        severity: "critical",
        device_id: payload.station_id,
        description: `[NGUY HIỂM] NÚT DỪNG KHẨN CẤP ĐÃ ĐƯỢC KÍCH HOẠT TẠI TRẠM ${stationNum}! BĂNG CHUYỀN ĐÃ NGẮT TOÀN BỘ. (${payload.triggered_by})`,
        timestamp: payload.timestamp,
        resolved: false,
        mode: payload.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };
      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));

      // Tự động kích hoạt thông báo khẩn cấp đa kênh (Telegram + Email)
      triggerAlertDispatch(alertItem);

      // Chỉ gửi đồng bộ tới Backend và gửi lệnh MQTT nếu hành động bắt nguồn từ UI người dùng
      // (Nếu từ mqtt_in hoặc sse_in thì backend/broker đã có bản tin này, không gửi vòng lặp echo)
      if (source === "user_action") {
        await Promise.allSettled([
          ApiSafetyClient.triggerEmergencyStop(payload),
          mqtt.publishEmergencyStop(payload),
          mqtt.publishCommand("ESTOP"),
        ]);
      }
    },
    [conveyor, mqtt, setTelemetry, sorterData]
  );
  triggerEmergencyStopRef.current = handleTriggerEmergencyStop;

  // Handler: Mở khóa an toàn (Chỉ Admin)
  const handleUnlockSystem = useCallback(
    async (note?: string): Promise<boolean> => {
      const currentUser = userRef.current;
      if (currentUser?.role !== "admin") {
        toast.error("Chỉ tài khoản Quản trị viên (Admin) mới có quyền mở khóa an toàn hệ thống!");
        return false;
      }

      // Tắt ngay lập tức mọi còi hú / âm thanh khẩn cấp
      industrialAudio.silenceAll();
      industrialAudio.playClick();

      const res = await ApiSafetyClient.unlockSystem(
        { userId: currentUser?.id, role: currentUser?.role },
        { note }
      );

      if (res.success) {
        lastUnlockedTimeRef.current = Date.now();
        setIsSystemLocked(false);
        setEstopIncident(null);
        setHardwareEstopAcked(false);
        setTelemetry((prev) => ({ ...prev, estop_pressed: false }));

        // Đánh dấu đã giải quyết (resolved) cho toàn bộ sự cố emergency_stop trong danh sách cảnh báo
        sorterData.setAlerts((prev) =>
          prev.map((a) => (a.event_type === "emergency_stop" ? { ...a, resolved: true } : a))
        );

        toast.success("Hệ thống đã được mở khóa an toàn thành công!");
        return true;
      } else {
        toast.error(res.message || "Không thể mở khóa an toàn.");
        return false;
      }
    },
    [toast, setTelemetry, sorterData]
  );

  // Xử lý xác nhận kích hoạt Dừng Khẩn Cấp từ Modal cảnh báo liên tục
  const handleConfirmEstopAction = useCallback(() => {
    setEstopConfirmModalOpen(false);
    void handleTriggerEmergencyStop(undefined, "user_action");
    toast.error("ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP (E-STOP)! Toàn bộ hệ thống băng chuyền đã dừng.");
  }, [handleTriggerEmergencyStop, toast]);

  const handleCancelEstopAction = useCallback(() => {
    industrialAudio.stopContinuousEmergencyAlarm();
    setEstopConfirmModalOpen(false);
    toast.info("Đã hủy bỏ yêu cầu Dừng Khẩn Cấp. Hệ thống vẫn tiếp tục vận hành.");
  }, [toast]);

  // Handler: Kích hoạt Cảnh báo Kẹt phôi
  const handleTriggerJam = useCallback(
    async (
      customPayload?: Partial<JamDetectedPayload>,
      source: "user_action" | "mqtt_in" | "sse_in" | "physics_in" = "user_action"
    ) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) {
        return;
      }

      // 1. Chặn các hành vi giả lập / physics ảo khi đang ở chế độ Thực tế (Real Hardware)
      if ((source === "user_action" || source === "physics_in") && !sorterData.isSimulationRef.current) {
        toast.warning("Hệ thống đang ở chế độ Thực tế (Real Hardware). Các chức năng test giả lập bị vô hiệu hóa!");
        return;
      }

      // 2. Chống lặp cảnh báo (Deduplication): Nếu đã đang kẹt phôi thì bỏ qua
      if (isJammedRef.current) {
        return;
      }

      // Nếu hệ thống đang dừng khẩn cấp thì không kích hoạt kẹt phôi
      if (isSystemLockedRef.current) return;

      const payload: JamDetectedPayload = {
        event: "jam_detected",
        section: customPayload?.section || "Conveyor_Belt_Zone_A",
        duration_seconds: customPayload?.duration_seconds ?? 5,
        sensor_id: customPayload?.sensor_id || "OPTICAL_JAM_02",
        mode: customPayload?.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
        timestamp: customPayload?.timestamp || new Date().toISOString(),
      };

      setIsJammed(true);
      setJamIncident(payload);

      // Dừng ngay lập tức băng chuyền
      conveyor.setIsRunning(false);
      setTelemetry((prev) => ({
        ...prev,
        conveyor_running: false,
        s2_sorter1: true,
      }));

      // Báo động âm thanh còi hú kẹt phôi liên tục
      industrialAudio.startContinuousJamAlarm();

      // Thêm vào danh sách Cảnh báo
      const alertItem: AlertEvent = {
        event_id: `jam_${Date.now()}`,
        event_type: "jam_detected",
        severity: "critical",
        device_id: payload.sensor_id,
        description: `[CẢNH BÁO KẸT PHÔI] Phát hiện tắc nghẽn sản phẩm tại Khu vực Băng chuyền A (Cảm biến #02). Băng tải đã tự động giảm tốc/dừng. (Vật thể cản liên tục ${payload.duration_seconds}s)`,
        timestamp: payload.timestamp || new Date().toISOString(),
        resolved: false,
        mode: payload.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };
      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));

      // Tự động gửi cảnh báo qua Telegram / Email
      triggerAlertDispatch(alertItem);

      // Đồng bộ tới backend và MQTT nếu bắt nguồn từ UI người dùng hoặc simulation
      if (source === "user_action" || source === "physics_in") {
        await Promise.allSettled([
          ApiSafetyClient.triggerJamAlert(payload),
          mqtt.publishJamAlert(payload),
          mqtt.publishCommand("STOP"),
        ]);
      }
    },
    [conveyor, mqtt, setTelemetry, sorterData, toast]
  );
  triggerJamRef.current = handleTriggerJam;

  // Handler: Xử lý Gỡ kẹt phôi & Tiếp tục vận hành
  const handleClearJam = useCallback(() => {
    // Dập tắt còi kẹt phôi ngay lập tức
    industrialAudio.stopContinuousJamAlarm();
    industrialAudio.silenceAll();

    setIsJammed(false);
    setJamIncident(null);
    conveyor.clearJam?.();
    setTelemetry((prev) => ({
      ...prev,
      s2_sorter1: false,
      conveyor_running: true,
    }));
    conveyor.setIsRunning(true);
    mqtt.publishCommand("START");
    toast.success("Đã gỡ kẹt phôi thành công! Băng chuyền tự động tiếp tục vận hành.");
    sorterData.setAlerts((prev) =>
      prev.map((a) => (a.event_type === "jam_detected" ? { ...a, resolved: true } : a))
    );
  }, [conveyor, mqtt, setTelemetry, sorterData, toast]);

  // Handler: Kích hoạt Cảnh báo Đầy Khay (bin_full)
  const handleTriggerBinFull = useCallback(
    async (
      customPayload?: Partial<BinFullPayload>,
      source: "user_action" | "mqtt_in" | "sse_in" | "counter_in" = "user_action"
    ) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) {
        return;
      }
      // Chặn các hành vi giả lập khi đang ở chế độ Thực tế (Real Hardware)
      if (source === "user_action" && !sorterData.isSimulationRef.current) {
        toast.warning("Hệ thống đang ở chế độ Thực tế (Real Hardware). Các chức năng test giả lập bị vô hiệu hóa!");
        return;
      }

      // Xác định khay
      let binId = customPayload?.bin_id || "BIN_RED_01";
      let binIdx: 1 | 2 | 3 = 1;
      if (binId.toUpperCase().includes("BLUE") || binId.includes("02")) {
        binIdx = 2;
      } else if (binId.toUpperCase().includes("DEFAULT") || binId.includes("03")) {
        binIdx = 3;
      }

      // Chống lặp (Deduplication): Nếu khay này đã đang trong trạng thái đầy thì không spam
      if (isBinFullRef.current && fullBinIndexRef.current === binIdx) {
        return;
      }

      const capacities = sorterData.isSimulationRef.current ? sorterData.simBinCapacitiesRef.current : sorterData.realBinCapacitiesRef.current;
      const targetCap = capacities[`bin${binIdx}` as keyof typeof capacities] || 50;

      const payload: BinFullPayload = {
        event: "bin_full",
        bin_id: binId,
        category:
          customPayload?.category ||
          (binIdx === 1 ? "Sản phẩm loại A" : binIdx === 2 ? "Sản phẩm loại B" : "Sản phẩm loại C / Hàng khác"),
        current_count: customPayload?.current_count ?? targetCap,
        max_capacity: customPayload?.max_capacity ?? targetCap,
        mode: customPayload?.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
        timestamp: customPayload?.timestamp || new Date().toISOString(),
      };

      setIsBinFull(true);
      setFullBinIncident(payload);
      setFullBinIndex(binIdx);

      // Tạm dừng băng tải ngay lập tức để bảo vệ các mẫu phôi còn lại trên băng tải
      conveyor.setIsRunning(false);
      setTelemetry((prev) => ({ ...prev, conveyor_running: false }));

      // Nếu đang trong chế độ mô phỏng, cập nhật số đếm khay lên bằng sức chứa để đồng bộ toàn bộ giao diện
      if (sorterData.isSimulationRef.current) {
        sorterData.setBinCounts((prev) => ({
          ...prev,
          [`bin${binIdx}`]: payload.current_count,
        }));
      }

      // Bật còi cảnh báo khay đầy liên tục (chu kỳ 1.2s)
      industrialAudio.startContinuousBinFullAlarm();

      let binName = "Đỏ (#01)";
      if (binIdx === 2) binName = "Xanh (#02)";
      else if (binIdx === 3) binName = "Mặc định (#03)";

      const alertItem: AlertEvent = {
        event_id: `bin_full_${binIdx}_${Date.now()}`,
        event_type: "bin_full",
        severity: "warning",
        device_id: payload.bin_id,
        description: `[ĐẦY KHAY CHỨA] Khay phân loại sản phẩm ${binName} đã đạt giới hạn ${payload.current_count}/${payload.max_capacity} cái. Vui lòng thay thế khay rỗng mới`,
        timestamp: payload.timestamp || new Date().toISOString(),
        resolved: false,
        mode: payload.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };
      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));
      triggerAlertDispatch(alertItem);

      // Nếu bắt nguồn từ user_action hoặc counter_in, gửi đồng bộ tới backend & MQTT
      if (source === "user_action" || source === "counter_in") {
        await Promise.allSettled([
          ApiSafetyClient.triggerBinFullAlert(payload),
          mqtt.publishBinFullAlert(payload),
        ]);
      }
    },
    [mqtt, sorterData, toast, conveyor, setTelemetry]
  );
  triggerBinFullRef.current = handleTriggerBinFull;

  // Handler: Xác nhận đã thay khay mới
  const handleConfirmBinReplaced = useCallback(
    (binIdxOverride?: 1 | 2 | 3) => {
      const targetIdx = binIdxOverride || fullBinIndexRef.current || 1;

      // 1. Dập tắt còi báo khay đầy ngay lập tức
      industrialAudio.stopContinuousBinFullAlarm();

      // 2. Reset số lượng khay về 0
      sorterData.handleClearBin(targetIdx);

      // 3. Tắt trạng thái cảnh báo
      setIsBinFull(false);
      setFullBinIncident(null);
      setFullBinIndex(null);

      // 4. Đánh dấu đã giải quyết cảnh báo trong lịch sử
      sorterData.setAlerts((prev) =>
        prev.map((a) => (a.event_type === "bin_full" ? { ...a, resolved: true } : a))
      );

      // 5. Khởi động lại băng tải nếu không bị E-Stop hoặc kẹt phôi để tiếp tục xử lý các mẫu còn lại trên băng
      if (!telemetryRef.current.estop_pressed && !isJammedRef.current) {
        conveyor.setIsRunning(true);
        setTelemetry((prev) => ({ ...prev, conveyor_running: true }));
      }

      toast.success(`Đã xác nhận thay khay mới cho Khay ${targetIdx}! Số lượng đã được đặt lại về 0.`);
    },
    [conveyor, sorterData, setTelemetry, toast]
  );

  // Handler: Kích hoạt / Cập nhật Cảnh báo Quá Nhiệt (temperature_warning)
  const handleTriggerTemperatureWarning = useCallback(
    async (
      customPayload?: Partial<TemperatureWarningPayload>,
      source: "user_action" | "mqtt_in" | "sse_in" | "sim_slider" = "user_action"
    ) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) {
        return;
      }
      // Chặn các hành vi giả lập khi đang ở chế độ Thực tế (Real Hardware)
      if ((source === "user_action" || source === "sim_slider") && !sorterData.isSimulationRef.current) {
        toast.warning("Hệ thống đang ở chế độ Thực tế (Real Hardware). Các chức năng test giả lập bị vô hiệu hóa!");
        return;
      }

      const currentTemp = customPayload?.current_temp ?? 78.5;
      const thresholdTemp = customPayload?.threshold_temp ?? 75.0;
      const unit = customPayload?.unit || "°C";

      // Lưu giá trị nhiệt độ mô phỏng
      if (sorterData.isSimulationRef.current) {
        customSimTempRef.current = currentTemp;
      }

      // Cập nhật telemetry nhiệt độ tức thời
      setTelemetry((prev) => ({
        ...prev,
        cpu_temp: currentTemp,
      }));

      // Nếu nhiệt độ <= ngưỡng: tự động giải trừ cảnh báo và tắt còi
      if (currentTemp <= thresholdTemp) {
        if (isTempWarningRef.current) {
          industrialAudio.stopContinuousTemperatureAlarm();
          setIsTempWarning(false);
          setTempIncident(null);
          sorterData.setAlerts((prev) =>
            prev.map((a) => (a.event_type === "temperature_warning" ? { ...a, resolved: true } : a))
          );
        }
        return;
      }

      const isNewIncident = !isTempWarningRef.current;

      const payload: TemperatureWarningPayload = {
        event: "temperature_warning",
        device_name: customPayload?.device_name || "Main_Drive_Motor / Edge_AI_Box",
        current_temp: currentTemp,
        threshold_temp: thresholdTemp,
        unit: unit,
        mode: customPayload?.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
        timestamp: customPayload?.timestamp || new Date().toISOString(),
      };

      setIsTempWarning(true);
      setTempIncident(payload);

      // Kích hoạt còi cảnh báo quá nhiệt (nếu lần đầu vượt ngưỡng)
      if (isNewIncident) {
        industrialAudio.startContinuousTemperatureAlarm();
      }

      let deviceLabel = "Động cơ truyền động chính";
      if (payload.device_name.includes("Edge_AI") || payload.device_name.includes("CPU")) {
        deviceLabel = "CPU máy chủ Edge AI";
      }

      const alertItem: AlertEvent = {
        event_id: `temp_${Date.now()}`,
        event_type: "temperature_warning",
        severity: "warning",
        device_id: payload.device_name,
        description: `[QUÁ NHIỆT] ${deviceLabel} đang ở mức ${payload.current_temp}${payload.unit} (Ngưỡng an toàn: ${payload.threshold_temp}${payload.unit}). Khuyến nghị kiểm tra quạt tản nhiệt hoặc giảm tải`,
        timestamp: payload.timestamp || new Date().toISOString(),
        resolved: false,
        mode: payload.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };

      if (isNewIncident) {
        sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));
        triggerAlertDispatch(alertItem);
      }

      // Gửi đồng bộ tới backend & MQTT nếu từ thao tác người dùng hoặc thanh slider mô phỏng
      if (source === "user_action" || source === "sim_slider") {
        await Promise.allSettled([
          ApiSafetyClient.triggerTemperatureWarningAlert(payload),
          mqtt.publishTemperatureWarningAlert(payload),
        ]);
      }
    },
    [mqtt, setTelemetry, sorterData, toast]
  );
  triggerTemperatureWarningRef.current = handleTriggerTemperatureWarning;

  // Handler: Xác nhận cảnh báo quá nhiệt và tắt còi báo
  const handleAcknowledgeTemperatureWarning = useCallback(() => {
    industrialAudio.stopContinuousTemperatureAlarm();
    toast.info("Đã ghi nhận cảnh báo quá nhiệt và tắt còi cảnh báo.");
  }, [toast]);

  // Handler: Hạ nhiệt độ về mức an toàn 42.5°C (Chế độ mô phỏng)
  const handleCoolDownTemperature = useCallback(() => {
    industrialAudio.stopContinuousTemperatureAlarm();
    setIsTempWarning(false);
    setTempIncident(null);
    customSimTempRef.current = 42.5;
    setTelemetry((prev) => ({
      ...prev,
      cpu_temp: 42.5,
    }));
    sorterData.setAlerts((prev) =>
      prev.map((a) => (a.event_type === "temperature_warning" ? { ...a, resolved: true } : a))
    );
    toast.success("Đã hạ nhiệt độ thiết bị về 42.5°C (Mức an toàn).");
  }, [setTelemetry, sorterData, toast]);

  // Handler: Kích hoạt cảnh báo mất kết nối thiết bị (device_offline)
  const handleTriggerDeviceOffline = useCallback(
    async (
      customPayload?: Partial<DeviceOfflinePayload>,
      source: "user_action" | "mqtt_in" | "sse_in" | "watchdog" = "user_action"
    ) => {
      if (isLoginPageRef.current || !isAuthenticatedRef.current) {
        return;
      }
      // Chặn các hành vi giả lập khi đang ở chế độ Thực tế (Real Hardware)
      if (source === "user_action" && !sorterData.isSimulationRef.current) {
        toast.warning("Hệ thống đang ở chế độ Thực tế (Real Hardware). Các chức năng test giả lập bị vô hiệu hóa!");
        return;
      }

      if (isDeviceOfflineRef.current) {
        return; // Đã báo offline rồi, không lặp lại
      }

      const payload: DeviceOfflinePayload = {
        event: "device_offline",
        device_id: customPayload?.device_id || "ESP32_MAIN_CONTROLLER",
        ip_address: customPayload?.ip_address || "192.168.1.105",
        last_seen: customPayload?.last_seen || "15 giây trước",
        mode: customPayload?.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
        timestamp: customPayload?.timestamp || new Date().toISOString(),
      };

      if (source === "user_action") {
        simHeartbeatStoppedRef.current = true;
      }

      setIsDeviceOffline(true);
      setDeviceOfflineIncident(payload);

      // Kích hoạt còi cảnh báo ngắt kết nối
      industrialAudio.startContinuousDeviceOfflineAlarm();

      const alertItem: AlertEvent = {
        event_id: `offline_${Date.now()}`,
        event_type: "device_offline",
        severity: "critical",
        device_id: payload.device_id,
        description: `[MẤT KẾT NỐI THIẾT BỊ] Vi điều khiển trung tâm (ESP32) đã ngoại tuyến! Dữ liệu cảm biến thời gian thực bị ngắt`,
        timestamp: payload.timestamp || new Date().toISOString(),
        resolved: false,
        mode: payload.mode || (sorterData.isSimulation ? "simulation" : "realtime"),
      };

      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));
      triggerAlertDispatch(alertItem);

      // Gửi đồng bộ tới backend & MQTT
      if (source === "user_action" || source === "watchdog") {
        await Promise.allSettled([
          ApiSafetyClient.triggerDeviceOfflineAlert(payload),
          mqtt.publishDeviceOfflineAlert(payload),
        ]);
      }
    },
    [mqtt, sorterData, toast]
  );
  triggerDeviceOfflineRef.current = handleTriggerDeviceOffline;

  // Handler: Xác nhận đã kiểm tra thiết bị mất kết nối và tắt còi
  const handleAcknowledgeDeviceOffline = useCallback(() => {
    industrialAudio.stopContinuousDeviceOfflineAlarm();
    setIsDeviceOffline(false);
    setDeviceOfflineIncident(null);
    sorterData.setAlerts((prev) =>
      prev.map((a) => (a.event_type === "device_offline" ? { ...a, resolved: true } : a))
    );
    toast.info("Đã ghi nhận sự cố mất kết nối vi điều khiển.");
  }, [sorterData, toast]);

  // Handler: Khôi phục kết nối thiết bị ESP32 (Chế độ mô phỏng)
  const handleReconnectDevice = useCallback(() => {
    simHeartbeatStoppedRef.current = false;
    lastHeartbeatTimeRef.current = Date.now();
    industrialAudio.stopContinuousDeviceOfflineAlarm();
    setIsDeviceOffline(false);
    setDeviceOfflineIncident(null);
    setTelemetry((prev) => ({
      ...prev,
      last_heartbeat: new Date().toISOString(),
    }));
    sorterData.setAlerts((prev) =>
      prev.map((a) => (a.event_type === "device_offline" ? { ...a, resolved: true } : a))
    );
    void ApiSafetyClient.sendHeartbeat("ESP32_MAIN_CONTROLLER");
    void mqtt.publishHeartbeatPing("ESP32_MAIN_CONTROLLER");
    toast.success("Đã khôi phục kết nối với vi điều khiển ESP32 thành công!");
  }, [mqtt, setTelemetry, sorterData, toast]);

  // Handler: Kích hoạt Báo cáo 1 Ngày Làm Việc (shift_summary)
  const handleTriggerShiftSummary = useCallback(
    async (
      customPayload?: Partial<ShiftSummaryPayload>,
      source: "user_action" | "timer_17h" | "new_day_transition" | "sse_in" = "user_action"
    ) => {
      // ĐỒNG BỘ DỮ LIỆU THỜI GIAN THỰC TỪ HỆ THỐNG
      const liveBinCounts = sorterData.binCounts;
      const bin1 = Number.isFinite(liveBinCounts?.bin1) ? liveBinCounts.bin1 : 0;
      const bin2 = Number.isFinite(liveBinCounts?.bin2) ? liveBinCounts.bin2 : 0;
      const bin3 = Number.isFinite(liveBinCounts?.bin3) ? liveBinCounts.bin3 : 0;
      const totalFromBins = bin1 + bin2 + bin3;
      const records = sorterData.records || [];
      const totalFromRecords = records.length;

      // Tính tổng sản lượng tích lũy thực tế trong 1 ngày làm việc:
      // Lọc các bản ghi hôm nay (múi giờ Việt Nam Asia/Ho_Chi_Minh).
      // Khi công nhân dọn khay (thay khay mới, binCounts về 0), tổng sản lượng cả ngày
      // KHÔNG bao giờ bị sụt giảm hay mất mát, đảm bảo báo cáo ngày phản ánh đúng 100% sản lượng thực tế.
      const todayRecords = filterTodayRecords(records);
      const computedTotal = Math.max(
        todayRecords.length,
        totalFromBins,
        totalFromRecords > 0 && todayRecords.length === 0 ? totalFromRecords : 0
      );
      const computedGood = computedTotal;
      const computedDefect = 0;

      // Tính tỷ lệ đạt phần trăm thực tế (toàn bộ đạt chuẩn -> 100.0%)
      const computedAccuracy = computedTotal > 0
        ? `${((computedGood / computedTotal) * 100).toFixed(1)}%`
        : "100.0%";

      // Số lần dừng E-Stop thực tế từ danh sách sự kiện
      const estopsCount = (sorterData.alerts || []).filter((a) => a.event_type === "emergency_stop").length;

      // Tính thời gian vận hành thực tế từ uptime của vi điều khiển ESP32
      const uptimeSec = telemetry.uptime || 0;
      const hours = uptimeSec / 3600;
      const operatingHours = hours >= 1
        ? `${hours.toFixed(1)} giờ`
        : `${Math.max(1, Math.round(uptimeSec / 60))} phút`;

      // Định dạng ngày tháng năm rõ ràng chuẩn tiếng Việt (Ngày DD/MM/YYYY - Ngày DD tháng MM năm YYYY)
      const dateInfo = formatVietnameseDate(customPayload?.timestamp);
      const defaultShiftName = `Ngày ${dateInfo.shortDate} (${dateInfo.fullTextDate})`;

      const payload: ShiftSummaryPayload = {
        event: "shift_summary",
        shift_name: customPayload?.shift_name || defaultShiftName,
        total_products: customPayload?.total_products ?? computedTotal,
        sorted_good: customPayload?.sorted_good ?? computedGood,
        sorted_defect: customPayload?.sorted_defect ?? computedDefect,
        accuracy_rate: customPayload?.accuracy_rate || computedAccuracy,
        emergency_stops_count: customPayload?.emergency_stops_count ?? estopsCount,
        operating_hours: customPayload?.operating_hours || operatingHours,
        timestamp: customPayload?.timestamp || new Date().toISOString(),
        mode: sorterData.isSimulation ? "simulation" : "realtime",
      };

      setShiftSummaryIncident(payload);
      setIsShiftSummaryToastOpen(true);

      // Âm thanh chuông báo nhận tin mới
      industrialAudio.playShiftSummaryChime();

      // Thêm vào danh sách Cảnh báo (Severity INFO)
      const alertItem: AlertEvent = {
        event_id: `shift_summary_${Date.now()}`,
        event_type: "shift_summary",
        severity: "info",
        device_id: "SYSTEM_SUPERVISOR",
        description: `[BÁO CÁO 1 NGÀY LÀM VIỆC] ${payload.shift_name}: Tổng ${payload.total_products.toLocaleString("vi-VN")} sản phẩm (Đạt ${payload.accuracy_rate}). Nhấn để xem chi tiết`,
        timestamp: payload.timestamp || new Date().toISOString(),
        resolved: true,
        mode: sorterData.isSimulation ? "simulation" : "realtime",
      };

      sorterData.setAlerts((prev) => [alertItem, ...prev.filter((a) => a.event_id !== alertItem.event_id)].slice(0, 100));
      triggerAlertDispatch(alertItem);

      // Tự động gửi thông báo báo cáo ngày tới cả Telegram và Email (bỏ qua cooldown)
      void Promise.allSettled([
        sendTelegramAlert(alertItem, true),
        sendEmailAlert(alertItem, true),
      ]);

      // Gửi đồng bộ tới backend nếu từ thao tác người dùng, timer_17h hoặc qua ngày mới
      if (source === "user_action" || source === "timer_17h" || source === "new_day_transition") {
        await Promise.allSettled([
          ApiSafetyClient.triggerShiftSummary(payload),
        ]);
      }
    },
    [sorterData, telemetry.uptime]
  );
  triggerShiftSummaryRef.current = handleTriggerShiftSummary;

  const handleCloseShiftSummaryToast = useCallback(() => {
    setIsShiftSummaryToastOpen(false);
  }, []);

  const handleOpenShiftSummaryModal = useCallback(() => {
    setIsShiftSummaryModalOpen(true);
  }, []);

  const handleCloseShiftSummaryModal = useCallback(() => {
    setIsShiftSummaryModalOpen(false);
  }, []);

  // Khởi tạo trạng thái an toàn & Đồng bộ kênh thời gian thực SSE
  useEffect(() => {
    if (!sorterData.isClient || isLoginPage || !isAuthenticated) return;

    // 1. Kiểm tra trạng thái an toàn từ máy chủ
    ApiSafetyClient.getStatus().then((res) => {
      if (res.is_locked) {
        setIsSystemLocked(true);
        if (res.active_incident) setEstopIncident(res.active_incident);
        setIsRunningRef.current(false);
        setTelemetry((prev) => ({ ...prev, estop_pressed: true, conveyor_running: false }));
      }
    });

    // 1.1 Khôi phục trạng thái đồng bộ ban đầu từ máy chủ
    fetchSyncData().then((res) => {
      if (res.success && res.state) {
        if (res.state.isRunning !== undefined) {
          setIsRunningRef.current(res.state.isRunning);
          setTelemetry((prev) => ({ ...prev, conveyor_running: res.state!.isRunning }));
        }
        if (res.state.speed !== undefined) {
          setConveyorSpeedRef.current(res.state.speed);
          setTelemetry((prev) => ({ ...prev, conveyor_speed: res.state!.speed }));
        }
      }
    });

    // 2. Kênh sự kiện SSE /api/events
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events");
      eventSource.addEventListener("emergency_stop", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.payload) {
            triggerEmergencyStopRef.current(data.payload, "sse_in");
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE emergency_stop:", err);
        }
      });

      eventSource.addEventListener("jam_detected", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.payload) {
            void triggerJamRef.current(data.payload, "sse_in");
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE jam_detected:", err);
        }
      });

      eventSource.addEventListener("bin_full", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.payload) {
            void triggerBinFullRef.current(data.payload, "sse_in");
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE bin_full:", err);
        }
      });

      eventSource.addEventListener("temperature_warning", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.payload) {
            void triggerTemperatureWarningRef.current(data.payload, "sse_in");
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE temperature_warning:", err);
        }
      });

      eventSource.addEventListener("device_offline", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.payload) {
            void triggerDeviceOfflineRef.current(data.payload, "sse_in");
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE device_offline:", err);
        }
      });

      eventSource.addEventListener("shift_summary", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.payload) {
            void triggerShiftSummaryRef.current(data.payload, "sse_in");
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE shift_summary:", err);
        }
      });

      eventSource.addEventListener("device_online", () => {
        lastHeartbeatTimeRef.current = Date.now();
        simHeartbeatStoppedRef.current = false;
        industrialAudio.stopContinuousDeviceOfflineAlarm();
        setIsDeviceOffline(false);
        setDeviceOfflineIncident(null);
        toastRef.current.info("Vi điều khiển ESP32 đã kết nối trực tuyến trở lại.");
      });

      eventSource.addEventListener("system_unlocked", () => {
        lastUnlockedTimeRef.current = Date.now();
        industrialAudio.silenceAll();
        setIsSystemLocked(false);
        setEstopIncident(null);
        setTelemetry((prev) => ({ ...prev, estop_pressed: false }));
        setAlertsRef.current((prev) =>
          prev.map((a) => (a.event_type === "emergency_stop" ? { ...a, resolved: true } : a))
        );
        toastRef.current.info("Hệ thống đã được mở khóa an toàn bởi Quản trị viên.");
      });

      eventSource.addEventListener("estop_ack", () => {
        setHardwareEstopAcked(true);
      });

      eventSource.addEventListener("status", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.is_locked !== undefined) {
            setIsSystemLocked(data.is_locked);
            if (data.is_locked && data.active_incident) {
              setEstopIncident(data.active_incident);
            } else if (!data.is_locked) {
              setEstopIncident(null);
            }
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE status:", err);
        }
      });

      // Kênh đồng bộ đa thiết bị (PC Web <-> iPhone Safari <-> Android App)
      eventSource.addEventListener("state_sync", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.senderId !== myClientId && data?.state) {
            const s = data.state;
            applyIncomingSyncStateRef.current(s);
            if (s.isRunning !== undefined) {
              setIsRunningRef.current(s.isRunning);
              setTelemetry((prev) => ({ ...prev, conveyor_running: s.isRunning }));
            }
            if (s.speed !== undefined) {
              setConveyorSpeedRef.current(s.speed);
              setTelemetry((prev) => ({ ...prev, conveyor_speed: s.speed }));
            }
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE state_sync:", err);
        }
      });

      eventSource.addEventListener("history_sync", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.senderId !== myClientId && data?.records) {
            applyIncomingSyncRecordsRef.current(data.records, data.binCounts);
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE history_sync:", err);
        }
      });

      eventSource.addEventListener("history_cleared", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.senderId !== myClientId) {
            applyIncomingClearHistoryRef.current();
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE history_cleared:", err);
        }
      });

      eventSource.addEventListener("spawn_item", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.senderId !== myClientId && data?.item) {
            spawnRealItemRef.current(data.item);
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE spawn_item:", err);
        }
      });

      eventSource.addEventListener("telemetry", (e) => {
        try {
          const telem = JSON.parse(e.data);
          setLastTelemetryTime(new Date().toLocaleTimeString("vi-VN", { hour12: false }));
          setTelemetry((prev) => cleanTelemetryPayload(telem, prev));

          // Kích hoạt phôi mẫu chạy khi cảm biến hồng ngoại S1 từ HTTP POST SSE phát hiện vật
          const isBlocked =
            telem?.optical_sensor === "BLOCKED" ||
            telem?.optical_sensor === 1 ||
            telem?.optical_sensor === "1" ||
            telem?.s1_entry === true;

          if (isBlocked && !lastOpticalBlockedRef.current) {
            lastOpticalBlockedRef.current = true;
            const targetBin = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
            const brands = ["brand_c", "brand_a", "brand_b"];
            const brandKey = brands[targetBin - 1] || "brand_c";
            const newItem: VisualItem = {
              id: `ESP32_${Date.now().toString().slice(-4)}`,
              brandKey: brandKey,
              progress: 0,
              targetBin: targetBin,
              yOffset: 0,
              opacity: 1,
              deflected: false,
              sorted: false,
              isSim: sorterData.isSimulationRef.current,
              timestamp: new Date().toISOString(),
            };
            spawnRealItemRef.current(newItem);
            setIsRunningRef.current(true);
          } else if (!isBlocked) {
            lastOpticalBlockedRef.current = false;
          }
        } catch (err) {
          console.warn("Lỗi phân tích SSE telemetry:", err);
        }
      });
    } catch (err) {
      console.warn("Không thể kết nối SSE:", err);
    }

    return () => {
      eventSource?.close();
    };
  }, [sorterData.isClient, sorterData.isSimulationRef, isLoginPage, isAuthenticated]);

  // Auth Redirect check
  useEffect(() => {
    if (!isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isAuthenticated, pathname, router]);

  // Stable refs and setters for the interval
  const { isRunningRef, speedRef } = conveyor;
  const {
    isSimulationRef,
    recentSortTimesSimRef,
    recentSortTimesRealRef,
    setSimThroughput,
    setRealThroughput,
    simRecordsRef,
    simBinCountsRef,
    realRecordsRef,
    realBinCountsRef,
  } = sorterData;
  const { setPingMs } = mqtt;

  // Heartbeat & Throughput Chart update (every 1s)
  useEffect(() => {
    if (isLoginPage || !isAuthenticated) return;
    const interval = setInterval(() => {
      const isSimMode = isSimulationRef.current;
      const hasItems = conveyor.visualItemsRef.current.some(
        (it) => !it.sorted && !it.deflected && (it.progress ?? 0) < 96
      );
      
      // Băng chuyền chỉ chuyển động khi có mẫu vật/phôi trên băng, dừng chờ khi rỗng (ở cả User và Admin)
      const isBeltMoving =
        isRunningRef.current &&
        !telemetryRef.current.estop_pressed &&
        !isJammedRef.current &&
        !isBinFullRef.current &&
        hasItems;

      if (isBeltMoving) {
        if (isSimMode) {
          setTelemetry((prev) => ({
            ...prev,
            uptime: prev.uptime + 1,
            encoder_count:
              prev.encoder_count + Math.floor((speedRef.current / 100) * 8),
            cpu_temp:
              customSimTempRef.current !== null
                ? customSimTempRef.current
                : Number((42.5 + Math.sin(Date.now() / 10000) * 2.2).toFixed(1)),
            conveyor_running: true,
          }));
        } else {
          setTelemetry((prev) => ({
            ...prev,
            conveyor_running: true,
          }));
        }
      } else {
        setTelemetry((prev) => ({
            ...prev,
            conveyor_running: false,
        }));
      }

      const nowStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // 1. Lưu lượng Mô Phỏng (Simulation PPM)
      const now = Date.now();
      recentSortTimesSimRef.current = recentSortTimesSimRef.current.filter(
        (t) => now - t < 60000
      );
      const simSorts = recentSortTimesSimRef.current.length;

      let simPPM = 0;
      if (isBeltMoving) {
        const baseRate = Math.round((speedRef.current / 100) * 20);
        simPPM = baseRate + (simSorts > 0 ? Math.min(simSorts * 2, 8) : 0);
      } else if (simSorts > 0) {
        simPPM = simSorts;
      }

      setSimThroughput((prev) => [
        ...prev.slice(1),
        {
          time: nowStr,
          ppm: simPPM,
          total: simRecordsRef.current.length,
          bin1: simBinCountsRef.current.bin1,
          bin2: simBinCountsRef.current.bin2,
          bin3: simBinCountsRef.current.bin3,
          speed: isBeltMoving ? speedRef.current : 0,
        },
      ]);

      // 2. Lưu lượng Thực Tế (Real Hardware PPM)
      recentSortTimesRealRef.current = recentSortTimesRealRef.current.filter(
        (t) => now - t < 60000
      );
      const realSorts = recentSortTimesRealRef.current.length;
      const realPPM = realSorts;

      setRealThroughput((prev) => [
        ...prev.slice(1),
        {
          time: nowStr,
          ppm: realPPM,
          total: realRecordsRef.current.length,
          bin1: realBinCountsRef.current.bin1,
          bin2: realBinCountsRef.current.bin2,
          bin3: realBinCountsRef.current.bin3,
          speed: telemetryRef.current.conveyor_running ? telemetryRef.current.conveyor_speed : 0,
        },
      ]);

      // FLAW-03: Chỉ fake ping khi ở Simulation mode
      if (isSimMode) {
        setPingMs(Math.floor(20 + Math.random() * 10));
      }

      // 3. Cơ chế Heartbeat (Nhịp tim) & Watchdog phát hiện Offline (> 6 giây)
      if (isSimMode) {
        if (!simHeartbeatStoppedRef.current) {
          lastHeartbeatTimeRef.current = Date.now();
          setTelemetry((prev) => ({
            ...prev,
            last_heartbeat: new Date().toISOString(),
          }));
        } else {
          // Nếu người dùng kích hoạt giả lập ngắt kết nối trong tab mô phỏng
          const elapsed = Date.now() - lastHeartbeatTimeRef.current;
          if (elapsed > 6000 && !isDeviceOfflineRef.current) {
            void triggerDeviceOfflineRef.current(
              {
                event: "device_offline",
                device_id: "ESP32_MAIN_CONTROLLER",
                ip_address: "192.168.1.105",
                last_seen: `${Math.round(elapsed / 1000)} giây trước`,
                mode: "simulation",
              },
              "watchdog"
            );
          }
        }
      } else {
        // Chế độ Thực Tế: Giám sát gói tin nhịp tim từ vi điều khiển qua MQTT
        if (mqtt.mqttStatus === "connected" && lastHeartbeatTimeRef.current > 0) {
          const elapsed = Date.now() - lastHeartbeatTimeRef.current;
          if (elapsed > 6000 && !isDeviceOfflineRef.current) {
            void triggerDeviceOfflineRef.current(
              {
                event: "device_offline",
                device_id: "ESP32_MAIN_CONTROLLER",
                ip_address: "192.168.1.105",
                last_seen: `${Math.round(elapsed / 1000)} giây trước`,
                mode: "realtime",
              },
              "watchdog"
            );
          }
        }
      }

      // 4. Kiểm tra Tự động chuyển qua ngày mới (00:00 hoặc thay đổi ngày) & hết ca lúc 17:00 hàng ngày (Shift Summary)
      const dateNow = new Date();
      const todayKey = getBusinessDateKey(dateNow);

      // a. Tự động gửi thông báo báo cáo ngày khi phát hiện chuyển sang ngày mới (date key thay đổi)
      if (!lastActiveDayRef.current) {
        lastActiveDayRef.current = todayKey;
      } else if (lastActiveDayRef.current !== todayKey) {
        lastActiveDayRef.current = todayKey;
        if (hasTriggeredNewDayRef.current !== todayKey) {
          hasTriggeredNewDayRef.current = todayKey;
          void triggerShiftSummaryRef.current(undefined, "new_day_transition");
        }
      }

      // b. Tự động gửi thông báo báo cáo ngày vào đúng mốc 00:00 nửa đêm
      if (dateNow.getHours() === 0 && dateNow.getMinutes() === 0) {
        if (hasTriggeredNewDayRef.current !== todayKey) {
          hasTriggeredNewDayRef.current = todayKey;
          void triggerShiftSummaryRef.current(undefined, "new_day_transition");
        }
      }

      // c. Tự động hết ca lúc 17:00 hàng ngày
      if (dateNow.getHours() === 17 && dateNow.getMinutes() === 0) {
        if (hasTriggered17hTodayRef.current !== todayKey) {
          hasTriggered17hTodayRef.current = todayKey;
          void triggerShiftSummaryRef.current(undefined, "timer_17h");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    conveyor.visualItemsRef,
    isRunningRef,
    speedRef,
    isSimulationRef,
    recentSortTimesSimRef,
    recentSortTimesRealRef,
    setSimThroughput,
    setRealThroughput,
    simRecordsRef,
    simBinCountsRef,
    realRecordsRef,
    realBinCountsRef,
    setPingMs,
    mqtt.mqttStatus,
    isLoginPage,
    isAuthenticated,
  ]);

  // Config Actions
  const handleSaveAndPublishConfig = useCallback(
    async (newConfig: SorterConfig) => {
      industrialAudio.playClick();
      saveSorterConfigLocal(newConfig);
      setSorterConfig(newConfig);

      if (!sorterData.isSimulationRef.current) {
        mqtt.setConfigStatusMsg("Đang đồng bộ cấu hình sang vi điều khiển ESP32-C5...");
        const published = await mqtt.publishConfig(newConfig);
        if (published) {
          return { success: true, message: "Đã gửi cấu hình thành công qua MQTT tới ESP32-C5" };
        }
        return { success: false, message: "Lỗi kết nối MQTT, cấu hình chỉ được lưu cục bộ" };
      } else {
        setTimeout(() => {
          mqtt.setConfigStatusMsg(
            `Đã áp dụng cấu hình v${newConfig.config_version} (Giả lập ESP32)`
          );
        }, 700);
        return { success: true, message: "Đã lưu và áp dụng trong chế độ mô phỏng" };
      }
    },
    [mqtt, sorterData.isSimulationRef]
  );

  const handleResetConfigToDefault = useCallback(() => {
    industrialAudio.playClick();
    const defaultConfig = resetSorterConfigLocal();
    setSorterConfig(defaultConfig);
    setTelemetry((prev) => ({
      ...prev,
      active_config_version: defaultConfig.config_version || 1,
    }));
    if (!sorterData.isSimulationRef.current && mqtt.mqttRef.current?.isConnected()) {
      mqtt.publishConfig(defaultConfig);
      mqtt.setConfigStatusMsg("Đã khôi phục cấu hình v1 mặc định qua MQTT thành công!");
    } else {
      mqtt.setConfigStatusMsg("Đã khôi phục cấu hình v1 mặc định thành công!");
    }
  }, [mqtt, sorterData.isSimulationRef]);

  const handleResetActuatorStates = useCallback(() => {
    industrialAudio.playClick();
    conveyor.handleResetActuatorStates();
    mqtt.publishCommand("reset_actuators");
  }, [conveyor, mqtt]);

  const handleTestActuator = useCallback(
    (type: "servo_1" | "servo_2" | "buzzer", value?: number) => {
      const isSim = sorterData.isSimulationRef.current;
      const angle = value ?? 45;

      if (type === "servo_1") {
        if (angle === 0) {
          conveyor.setArm1Active(false);
          setTelemetry((prev) => ({ ...prev, arm1_active: false }));
          logHardwareTestAction("TẮT / Thu tay gạt Servo 1 (0°)", "GPIO 6 (LEDC PWM)", user?.username || "admin1", "actuator", "success");
          if (!isSim) {
            mqtt.publishCommand("trigger_servo_1", 0);
            toast.info("[THỰC TẾ] Đã TẮT / trả Servo 1 (GPIO 6) về vị trí nghỉ 0°");
          } else {
            toast.info("[MÔ PHỎNG] Đã TẮT / trả tay gạt Máng 1 về 0°");
          }
          return;
        }

        // BẬT tay gạt Máng 1
        conveyor.setArm1Active(true);
        setTelemetry((prev) => ({ ...prev, arm1_active: true }));
        logHardwareTestAction(`BẬT / Gạt Servo 1 góc ${angle}°`, "GPIO 6 (LEDC PWM)", user?.username || "admin1", "actuator", "success");
        industrialAudio.playClick();
        setTimeout(() => {
          conveyor.setArm1Active(false);
          setTelemetry((prev) => ({ ...prev, arm1_active: false }));
        }, 3500);

        if (!isSim) {
          mqtt.publishCommand("trigger_servo_1", angle);
          toast.success(`[THỰC TẾ] Đã BẬT gạt Servo 1 (GPIO 6) góc ${angle}°`);
        } else {
          toast.info(`[MÔ PHỎNG] Đã BẬT tay gạt Máng 1 góc ${angle}°`);
        }
      } else if (type === "servo_2") {
        if (angle === 0) {
          conveyor.setArm2Active(false);
          setTelemetry((prev) => ({ ...prev, arm2_active: false }));
          logHardwareTestAction("TẮT / Thu tay gạt Servo 2 (0°)", "GPIO 24 (LEDC PWM)", user?.username || "admin1", "actuator", "success");
          if (!isSim) {
            mqtt.publishCommand("trigger_servo_2", 0);
            toast.info("[THỰC TẾ] Đã TẮT / trả Servo 2 (GPIO 24) về vị trí nghỉ 0°");
          } else {
            toast.info("[MÔ PHỎNG] Đã TẮT / trả tay gạt Máng 2 về 0°");
          }
          return;
        }

        // BẬT tay gạt Máng 2
        conveyor.setArm2Active(true);
        setTelemetry((prev) => ({ ...prev, arm2_active: true }));
        logHardwareTestAction(`BẬT / Gạt Servo 2 góc ${angle}°`, "GPIO 24 (LEDC PWM)", user?.username || "admin1", "actuator", "success");
        industrialAudio.playClick();
        setTimeout(() => {
          conveyor.setArm2Active(false);
          setTelemetry((prev) => ({ ...prev, arm2_active: false }));
        }, 3500);

        if (!isSim) {
          mqtt.publishCommand("trigger_servo_2", angle);
          toast.success(`[THỰC TẾ] Đã BẬT gạt Servo 2 (GPIO 24) góc ${angle}°`);
        } else {
          toast.info(`[MÔ PHỎNG] Đã BẬT tay gạt Máng 2 góc ${angle}°`);
        }
      } else if (type === "buzzer") {
        if (value === 0) {
          industrialAudio.stopContinuousEmergencyAlarm();
          industrialAudio.silenceAll();
          logHardwareTestAction("TẮT / Ngắt Đèn LED & Báo động", "GPIO 10 (LED Status Indicator)", user?.username || "admin1", "alarm", "success");
          if (!isSim) {
            mqtt.publishCommand("trigger_buzzer", 0);
            toast.info("[THỰC TẾ] Đã TẮT Đèn LED / Cảnh báo (GPIO 10)");
          } else {
            toast.info("[MÔ PHỎNG] Đã TẮT Đèn LED / Cảnh báo");
          }
          return;
        }

        // BẬT Đèn LED / Báo động
        logHardwareTestAction("BẬT Đèn LED & Báo động", "GPIO 10 (LED Status Indicator)", user?.username || "admin1", "alarm", "success");
        industrialAudio.startContinuousEmergencyAlarm();

        if (!isSim) {
          mqtt.publishCommand("trigger_buzzer", 1);
          toast.success("[THỰC TẾ] Đã BẬT Đèn LED Báo Trạng Thái (GPIO 10) tới ESP32");
        } else {
          toast.info("[MÔ PHỎNG] Đã BẬT Đèn LED Báo Trạng Thái (GPIO 10)");
        }
      }
    },
    [conveyor, mqtt, setTelemetry, sorterData.isSimulationRef, toast, user]
  );

  const handleClearHistory = useCallback(() => {
    setClearHistoryDialogOpen(true);
  }, []);

  const confirmClearHistoryAction = useCallback(() => {
    sorterData.executeClearHistory();
    conveyor.setVisualItems([]);
    toast.success(
      `Đã xóa toàn bộ lịch sử phân loại (${
        sorterData.isSimulation ? "Mô phỏng" : "Thực tế"
      }) thành công!`
    );
  }, [conveyor, sorterData, toast]);

  // Tự động kích hoạt còi cảnh báo KHAY ĐẦY khi đạt định mức cho đến khi người dùng dọn khay
  useEffect(() => {
    const capacities = sorterData.isSimulationRef.current ? sorterData.simBinCapacitiesRef.current : sorterData.realBinCapacitiesRef.current;
    const isAnyBinFull =
      sorterData.binCounts.bin1 >= (capacities.bin1 || 50) ||
      sorterData.binCounts.bin2 >= (capacities.bin2 || 50) ||
      sorterData.binCounts.bin3 >= (capacities.bin3 || 50);

    if (isAnyBinFull && !isMuted && !isSystemLocked && !isJammed) {
      industrialAudio.startContinuousBinFullAlarm();
    } else {
      industrialAudio.stopContinuousBinFullAlarm();
    }

    return () => {
      industrialAudio.stopContinuousBinFullAlarm();
    };
  }, [sorterData.binCounts, isMuted, isSystemLocked, isJammed, sorterData.isSimulationRef, sorterData.simBinCapacitiesRef, sorterData.realBinCapacitiesRef]);

  const handleClearBin = useCallback(
    (binIndex: 1 | 2 | 3) => {
      industrialAudio.playClick();
      sorterData.handleClearBin(binIndex);

      const isSim = sorterData.isSimulationRef.current;
      const capacities = isSim ? sorterData.simBinCapacitiesRef.current : sorterData.realBinCapacitiesRef.current;
      const cap1 = capacities.bin1 || 50;
      const cap2 = capacities.bin2 || 50;
      const cap3 = capacities.bin3 || 50;

      // Kiểm tra xem các khay còn lại có còn khay nào đầy không
      const remainingBins = { ...sorterData.binCounts, [`bin${binIndex}`]: 0 };
      const isAnyFull = remainingBins.bin1 >= cap1 || remainingBins.bin2 >= cap2 || remainingBins.bin3 >= cap3;

      if (!isAnyFull) {
        industrialAudio.stopContinuousBinFullAlarm();
        setIsBinFull(false);
        setFullBinIncident(null);
        setFullBinIndex(null);
        sorterData.setAlerts((prev) =>
          prev.map((a) => (a.event_type === "bin_full" ? { ...a, resolved: true } : a))
        );
      } else if (fullBinIndexRef.current === binIndex) {
        const nextFullIdx = remainingBins.bin1 >= cap1 ? 1 : remainingBins.bin2 >= cap2 ? 2 : remainingBins.bin3 >= cap3 ? 3 : null;
        if (nextFullIdx) {
          setFullBinIndex(nextFullIdx);
        } else {
          setIsBinFull(false);
          setFullBinIncident(null);
          setFullBinIndex(null);
        }
      }

      // Tự động khởi động lại băng tải nếu đang tạm dừng và không bị E-Stop hoặc Kẹt phôi
      if (!telemetryRef.current.estop_pressed && !isJammedRef.current && !isAnyFull) {
        conveyor.setIsRunning(true);
        setTelemetry((prev) => ({ ...prev, conveyor_running: true }));
        toast.success(`Đã dọn khay ${binIndex}. Băng tải tự động tiếp tục vận hành!`);
      }
    },
    [conveyor, sorterData, setTelemetry, toast]
  );

  // Handler: Điều chỉnh sức chứa định mức của khay qua thanh trượt (5 - 50 SP)
  const handleSetBinCapacity = useCallback(
    (binIndex: 1 | 2 | 3, capacity: number) => {
      const clamped = Math.max(5, Math.min(50, Math.round(Number(capacity) || 50)));
      sorterData.handleSetBinCapacity(binIndex, clamped);
    },
    [sorterData]
  );

  // Handler: Chuyển đổi chế độ (Chỉ Admin mới có quyền bật Mô phỏng, User chỉ có Thực tế)
  const handleToggleSimulationMode = useCallback(
    (targetMode?: boolean) => {
      if (user?.role === "user") {
        toast.warning("Tài khoản người dùng chỉ có chế độ Thực tế, không thể chuyển sang Mô phỏng!");
        return;
      }
      sorterData.toggleSimulationMode(targetMode);
    },
    [user?.role, sorterData, toast]
  );

  // Handler: Điều chỉnh mức số lượng trong khay qua thanh trượt (đồng bộ dữ liệu toàn hệ thống)
  const handleSetBinCount = useCallback(
    (binIndex: 1 | 2 | 3, count: number) => {
      const isSim = sorterData.isSimulationRef.current;
      const capacities = isSim ? sorterData.simBinCapacitiesRef.current : sorterData.realBinCapacitiesRef.current;
      const targetCap = capacities[`bin${binIndex}` as keyof typeof capacities] || 50;
      const clamped = Math.max(0, Math.min(targetCap, Math.round(Number(count) || 0)));
      sorterData.handleSetBinCount(binIndex, clamped);

      // Nếu kéo bằng hoặc vượt định mức sức chứa và chưa kích hoạt cảnh báo cho khay này
      if (clamped >= targetCap) {
        if (!isBinFullRef.current || fullBinIndexRef.current !== binIndex) {
          handleTriggerBinFull(
            {
              bin_id: binIndex === 1 ? "BIN_RED_01" : binIndex === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03",
              current_count: clamped,
              max_capacity: targetCap,
            },
            "counter_in"
          );
        }
      } else {
        // Nếu giảm xuống dưới định mức và khay này đang báo đầy
        const currentCounts = isSim ? sorterData.simBinCountsRef.current : sorterData.realBinCountsRef.current;
        const nextBins = { ...currentCounts, [`bin${binIndex}`]: clamped };

        if (nextBins.bin1 < capacities.bin1 && nextBins.bin2 < capacities.bin2 && nextBins.bin3 < capacities.bin3) {
          if (isBinFullRef.current) {
            industrialAudio.stopContinuousBinFullAlarm();
            setIsBinFull(false);
            setFullBinIncident(null);
            setFullBinIndex(null);
            sorterData.setAlerts((prev) =>
              prev.map((a) => (a.event_type === "bin_full" ? { ...a, resolved: true } : a))
            );
          }
        } else if (fullBinIndexRef.current === binIndex) {
          const nextFullIdx = nextBins.bin1 >= capacities.bin1 ? 1 : nextBins.bin2 >= capacities.bin2 ? 2 : nextBins.bin3 >= capacities.bin3 ? 3 : null;
          if (nextFullIdx) {
            setFullBinIndex(nextFullIdx);
          } else {
            setIsBinFull(false);
            setFullBinIncident(null);
            setFullBinIndex(null);
          }
        }
      }
    },
    [handleTriggerBinFull, sorterData]
  );

  // Handler: Đồng bộ dữ liệu tức thời với Máy chủ và Thiết bị
  const handleManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    industrialAudio.playClick();
    try {
      const ok = await sorterData.triggerManualSync();
      try {
        await updateSyncState({
          isRunning: conveyor.isRunning,
          speed: conveyor.conveyorSpeed,
          binCapacities: sorterData.binCapacities,
          config: sorterConfig,
        });
      } catch {
        // non-fatal
      }
      if (ok) {
        toast.success("Đồng bộ dữ liệu thành công với máy chủ và thiết bị!");
      } else {
        toast.info("Đã gửi yêu cầu đồng bộ. Đang làm mới dữ liệu...");
      }
    } catch {
      toast.error("Lỗi khi đồng bộ dữ liệu với máy chủ.");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, sorterData, conveyor.isRunning, conveyor.conveyorSpeed, sorterConfig, toast]);

  // Context value
  const dashboardState: DashboardState = {
    isSystemLocked,
    estopIncident,
    handleTriggerEmergencyStop,
    handleUnlockSystem,
    isJammed,
    jamIncident,
    handleTriggerJam,
    handleClearJam,
    isBinFull,
    fullBinIncident,
    fullBinIndex,
    handleTriggerBinFull,
    handleConfirmBinReplaced,
    handleSetBinCount,
    binCapacities: sorterData.binCapacities,
    handleSetBinCapacity,
    isTempWarning,
    tempIncident,
    handleTriggerTemperatureWarning,
    handleAcknowledgeTemperatureWarning,
    handleCoolDownTemperature,
    isDeviceOffline,
    deviceOfflineIncident,
    handleTriggerDeviceOffline,
    handleAcknowledgeDeviceOffline,
    handleReconnectDevice,
    shiftSummaryIncident,
    isShiftSummaryToastOpen,
    isShiftSummaryModalOpen,
    handleTriggerShiftSummary,
    handleCloseShiftSummaryToast,
    handleOpenShiftSummaryModal,
    handleCloseShiftSummaryModal,
    telemetry,
    setTelemetry,
    mqttStatus: mqtt.mqttStatus,
    isMqttAlertActive: mqtt.isMqttAlertActive,
    reconnectAttempt: mqtt.reconnectAttempt,
    handleSimulateMqttDisconnect: mqtt.simulateDisconnect,
    handleReconnectMqtt: mqtt.reconnectManual,
    pingMs: mqtt.pingMs,
    isSimulation: user?.role === "user" ? false : sorterData.isSimulation,

    setIsSimulation: (val: boolean | ((prev: boolean) => boolean)) => {
      if (user?.role === "user") {
        toast.warning("Tài khoản người dùng chỉ có chế độ Thực tế, không thể chuyển sang Mô phỏng!");
        return;
      }
      sorterData.setIsSimulation(val);
    },
    toggleSimulationMode: handleToggleSimulationMode,
    generateSimulationDemoData: sorterData.generateSimulationDemoData,
    isRunning: conveyor.isRunning,
    setIsRunning: conveyor.setIsRunning,
    conveyorSpeed: conveyor.conveyorSpeed,
    setConveyorSpeed: conveyor.setConveyorSpeed,
    visualItems: conveyor.visualItems,
    setVisualItems: conveyor.setVisualItems,
    arm1Active: conveyor.arm1Active,
    arm2Active: conveyor.arm2Active,
    sorterConfig,
    setSorterConfig,
    configStatusMsg: mqtt.configStatusMsg,
    handleSaveAndPublishConfig,
    records: sorterData.records,
    setRecords: sorterData.setRecords,
    alerts: sorterData.alerts,
    setAlerts: sorterData.setAlerts,
    binCounts: sorterData.binCounts,
    routedBinCounts: sorterData.routedBinCounts,
    setBinCounts: sorterData.setBinCounts,
    brandCounts: sorterData.brandCounts,
    setBrandCounts: sorterData.setBrandCounts,
    throughputHistory: sorterData.throughputHistory,
    handleToggleRun: conveyor.handleToggleRun,
    handleEmergencyStop: () => {
      if (isSystemLockedRef.current || telemetryRef.current.estop_pressed) {
        void handleUnlockSystem();
      } else {
        // Kích hoạt còi hú kêu liên tục trên Web và mở modal xác nhận
        industrialAudio.startContinuousEmergencyAlarm();
        setEstopConfirmModalOpen(true);
      }
    },
    handleSpeedChange: conveyor.handleSpeedChange,
    spawnVisualPackage: conveyor.spawnVisualPackage,
    handleClearHistory,
    handleClearAlerts: sorterData.handleClearAlerts,
    handleClearBin,
    handleResetConfigToDefault,
    handleResetActuatorStates,
    handleTestActuator,
    themeMode,
    toggleTheme,
    isMuted,
    handleToggleSound,
    isSyncing,
    handleManualSync,
    displayDensity,
    setDisplayDensity,
    toggleDisplayDensity,
    isFullscreen,
    toggleFullscreen,
  };

  // Skip layout on login page
  if (pathname === "/login") {
    return (
      <DashboardContext.Provider value={dashboardState}>
        {children}
      </DashboardContext.Provider>
    );
  }

  // Not authenticated -> wait for redirect
  if (!isAuthenticated) return null;

  if (!sorterData.isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-cyan-400 font-mono">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mr-3" />
        Đang khởi động hệ thống IoT Dashboard...
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={dashboardState}>
      <div
        className={`flex h-[100dvh] w-screen overflow-hidden transition-colors duration-300 ${
          themeMode === "light"
            ? "light bg-slate-50 text-slate-900"
            : "dark bg-[#0D0F12] text-slate-100"
        } ${displayDensity === "compact" ? "density-compact" : "density-comfortable"}`}
      >
        {/* Sidebar — Responsive with mobile open/close */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          alertCount={sorterData.unresolvedAlertCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          isSimulation={user?.role === "user" ? false : sorterData.isSimulation}
          onToggleSimulationMode={user?.role === "user" ? undefined : handleToggleSimulationMode}
          mqttStatus={mqtt.mqttStatus}
          isDeviceOffline={isDeviceOffline}
        />

        {/* Mobile backdrop overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div
          className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${
            sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[268px]"
          }`}
        >
          {/* Banner màu đỏ rực nhấp nháy trên đỉnh trang khi E-Stop kích hoạt */}
          <EmergencyStopBanner
            isLocked={isSystemLocked}
            incident={estopIncident}
            isHardwareAcked={hardwareEstopAcked}
            onOpenUnlockDialog={() => handleUnlockSystem()}
          />


          {/* Banner màu vàng cam cảnh báo ĐẦY KHAY CHỨA trên đỉnh trang */}
          <BinFullIncidentBanner
            isBinFull={isBinFull}
            incident={fullBinIncident}
            binNumber={fullBinIndex || 1}
            onConfirmReplace={() => handleConfirmBinReplaced()}
          />

          <TopHeader
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
            alertCount={sorterData.unresolvedAlertCount}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mqttStatus={mqtt.mqttStatus}
            isMqttAlertActive={mqtt.isMqttAlertActive}
            reconnectAttempt={mqtt.reconnectAttempt}
            pingMs={mqtt.pingMs}
            isSimulation={user?.role === "user" ? false : sorterData.isSimulation}
            onToggleSimulationMode={user?.role === "user" ? undefined : handleToggleSimulationMode}
            isDeviceOffline={isDeviceOffline}
            onTriggerShiftSummary={() => handleTriggerShiftSummary(undefined, "user_action")}
            onManualSync={handleManualSync}
            isSyncing={isSyncing}
            lastUpdated={lastTelemetryTime}
            displayDensity={displayDensity}
            onToggleDensity={toggleDisplayDensity}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />

          {/* Page Content with smooth GPU-accelerated transition */}
          <main
            className={`flex-1 overflow-auto transition-all duration-200 ${
              displayDensity === "compact" ? "p-2 sm:p-2.5 lg:p-3" : "p-4 lg:p-6"
            }`}
          >
            <div key={pathname} className="page-transition-enter">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Tầng hiển thị tập trung các Cảnh báo, Toasts, Modals và Dialogs */}
      <DashboardIncidentLayer
        isSystemLocked={isSystemLocked}
        estopIncident={estopIncident}
        onUnlockSystem={handleUnlockSystem}
        estopConfirmModalOpen={estopConfirmModalOpen}
        onConfirmEstopAction={handleConfirmEstopAction}
        onCancelEstopAction={handleCancelEstopAction}
        isJammed={isJammed}
        jamIncident={jamIncident}
        onClearJam={handleClearJam}
        isBinFull={isBinFull}
        fullBinIncident={fullBinIncident}
        fullBinIndex={fullBinIndex}
        onConfirmBinReplaced={() => handleConfirmBinReplaced()}
        isTempWarning={isTempWarning}
        tempIncident={tempIncident}
        onAcknowledgeTemperatureWarning={handleAcknowledgeTemperatureWarning}
        onCoolDownTemperature={handleCoolDownTemperature}
        isSimulation={sorterData.isSimulation}
        isDeviceOffline={isDeviceOffline}
        deviceOfflineIncident={deviceOfflineIncident}
        onAcknowledgeDeviceOffline={handleAcknowledgeDeviceOffline}
        onReconnectDevice={handleReconnectDevice}
        isShiftSummaryToastOpen={isShiftSummaryToastOpen}
        isShiftSummaryModalOpen={isShiftSummaryModalOpen}
        shiftSummaryIncident={shiftSummaryIncident}
        onOpenShiftSummaryModal={handleOpenShiftSummaryModal}
        onCloseShiftSummaryToast={handleCloseShiftSummaryToast}
        onCloseShiftSummaryModal={handleCloseShiftSummaryModal}
        isMqttAlertActive={mqtt.isMqttAlertActive}
        mqttDisconnectedIncident={mqtt.mqttDisconnectedIncident}
        mqttReconnectAttempt={mqtt.reconnectAttempt}
        onForceReconnectMqtt={mqtt.reconnectManual}
        clearHistoryDialogOpen={clearHistoryDialogOpen}
        onConfirmClearHistory={() => {
          setClearHistoryDialogOpen(false);
          confirmClearHistoryAction();
        }}
        onCancelClearHistory={() => setClearHistoryDialogOpen(false)}
      />

      {/* Floating AI Copilot Drawer */}
      <AiCopilot />
    </DashboardContext.Provider>
  );
};
