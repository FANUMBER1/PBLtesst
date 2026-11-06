"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SorterMQTTService } from "@/lib/mqttClient";
import { SorterConfig, VisionDetection, ClassificationRecord, EmergencyStopPayload, JamDetectedPayload, BinFullPayload, TemperatureWarningPayload, DeviceOfflinePayload, MqttDisconnectedPayload } from "@shared/types";
import {
  BinFullPayloadSchema,
  ClassificationRecordSchema,
  DeviceOfflinePayloadSchema,
  EmergencyStopPayloadSchema,
  HeartbeatPayloadSchema,
  JamDetectedPayloadSchema,
  TemperatureWarningPayloadSchema,
  TelemetrySchema,
} from "@shared/schemas";
import { DEFAULT_MQTT_TOPICS } from "@shared/constants";
import { cleanVisionPayload } from "@/lib/dataProcessor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export interface UseMQTTOptions {
  isClient: boolean;
  isSimulation: boolean;
  onVisionDetection?: (detection: VisionDetection) => void;
  onClassification?: (record: ClassificationRecord) => void;
  onTelemetryPayload?: (payload: unknown) => void;
  onConfigStatusApplied?: (version: number) => void;
  onConfigStatusRejected?: (reason: string) => void;
  onEmergencyStop?: (payload: EmergencyStopPayload) => void;
  onJamDetected?: (payload: JamDetectedPayload) => void;
  onBinFull?: (payload: BinFullPayload) => void;
  onTemperatureWarning?: (payload: TemperatureWarningPayload) => void;
  onHeartbeat?: (data: unknown) => void;
  onDeviceOffline?: (payload: DeviceOfflinePayload) => void;
  onMqttDisconnected?: (payload: MqttDisconnectedPayload) => void;
  onMqttReconnected?: () => void;
  onEstopAck?: (payload: unknown) => void;
}

export function useMQTT({
  isClient,
  isSimulation,
  onVisionDetection,
  onClassification,
  onTelemetryPayload,
  onConfigStatusApplied,
  onConfigStatusRejected,
  onEmergencyStop,
  onJamDetected,
  onBinFull,
  onTemperatureWarning,
  onHeartbeat,
  onDeviceOffline,
  onMqttDisconnected,
  onMqttReconnected,
  onEstopAck,
}: UseMQTTOptions) {
  const [mqttStatus, setMqttStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [pingMs, setPingMs] = useState<number>(24);
  const [configStatusMsg, setConfigStatusMsg] = useState<string>("");

  // Cảnh báo mất kết nối MQTT Broker > 5s và Auto-reconnect
  const [isMqttAlertActive, setIsMqttAlertActive] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [mqttDisconnectedIncident, setMqttDisconnectedIncident] = useState<MqttDisconnectedPayload | null>(null);
  const [isSimulatedDisconnect, setIsSimulatedDisconnect] = useState<boolean>(false);

  const mqttRef = useRef<SorterMQTTService | null>(null);
  const isSimulationRef = useRef(isSimulation);
  isSimulationRef.current = isSimulation;

  // Callbacks ref to prevent stale closures
  const callbacksRef = useRef({
    onVisionDetection,
    onClassification,
    onTelemetryPayload,
    onConfigStatusApplied,
    onConfigStatusRejected,
    onEmergencyStop,
    onJamDetected,
    onBinFull,
    onTemperatureWarning,
    onHeartbeat,
    onDeviceOffline,
    onMqttDisconnected,
    onMqttReconnected,
    onEstopAck,
  });
  callbacksRef.current = {
    onVisionDetection,
    onClassification,
    onTelemetryPayload,
    onConfigStatusApplied,
    onConfigStatusRejected,
    onEmergencyStop,
    onJamDetected,
    onBinFull,
    onTemperatureWarning,
    onHeartbeat,
    onDeviceOffline,
    onMqttDisconnected,
    onMqttReconnected,
    onEstopAck,
  };

  // Coalesce bursty telemetry packets into one React update per frame.
  // MQTT can deliver status/telemetry much faster than the UI can render.
  const pendingTelemetryRef = useRef<unknown | null>(null);
  const telemetryFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleTelemetryUpdate = useCallback((payload: unknown) => {
    pendingTelemetryRef.current = payload;
    if (telemetryFlushTimerRef.current !== null) return;

    telemetryFlushTimerRef.current = setTimeout(() => {
      telemetryFlushTimerRef.current = null;
      const latest = pendingTelemetryRef.current;
      pendingTelemetryRef.current = null;
      if (latest !== null) callbacksRef.current.onTelemetryPayload?.(latest);
    }, 16);
  }, []);


  const handleIncomingMessage = useCallback((topic: string, msgText: string) => {
    try {
      const raw: unknown = JSON.parse(msgText);
      if (!isRecord(raw)) return;
      const data = raw;
      if (isSimulationRef.current || data.mode === "simulation") return;

      // A camera detection alone does not confirm a successful physical sort.
      // Accept completed records using the existing shared wire contract.
      const classification = ClassificationRecordSchema.safeParse(data);
      if (classification.success) {
        callbacksRef.current.onClassification?.(classification.data);
      }

      const isConfigStatus = topic.includes("config/status");

      // 1. Config status from ESP32
      if (isConfigStatus) {
        if (data.status === "applied" && Number.isFinite(Number(data.config_version))) {
          const version = Number(data.config_version);
          setConfigStatusMsg(`ESP32-C5 đã áp dụng thành công v${data.config_version}`);
          callbacksRef.current.onConfigStatusApplied?.(version);
        } else if (data.status === "rejected") {
          const reason = typeof data.reason === "string" && data.reason.trim()
            ? data.reason.trim()
            : "Không hợp lệ";
          setConfigStatusMsg(`ESP32 từ chối cấu hình: ${reason}`);
          callbacksRef.current.onConfigStatusRejected?.(reason);
        }
      }

      // 2. Status / Telemetry
      // Config acknowledgements are status topics too, but are not telemetry.
      if (!isConfigStatus && (topic.includes("status") || topic.includes("telemetry"))) {
        const telemetry = TelemetrySchema.safeParse(data);
        if (telemetry.success) scheduleTelemetryUpdate(telemetry.data);
      }

      // 3. Vision Detection
      if (topic.includes("vision")) {
        const detection = cleanVisionPayload(data);
        if (detection) {
          callbacksRef.current.onVisionDetection?.(detection);
        }
      }

      // 4. Emergency Stop Event (conveyor/safety/estop)
      const isReleaseMessage =
        topic.includes("/release") ||
        data.command === "ESTOP_RELEASE" ||
        data.event === "system_unlocked";

      if (!isReleaseMessage && (topic === (DEFAULT_MQTT_TOPICS.ESTOP || "conveyor/safety/estop") || data.event === "emergency_stop")) {
        const estopPayload = EmergencyStopPayloadSchema.safeParse({
          event: "emergency_stop",
          station_id: typeof data.station_id === "string" ? data.station_id : "STATION_01",
          triggered_by: typeof data.triggered_by === "string" ? data.triggered_by : "Physical E-Stop Button #1",
          timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
          mode: data.mode === "simulation" ? "simulation" : "realtime",
        });
        if (estopPayload.success) callbacksRef.current.onEmergencyStop?.(estopPayload.data as EmergencyStopPayload);
      }

      // 5. Jam Detected Event (conveyor/sensor/jam)
      if (topic === (DEFAULT_MQTT_TOPICS.JAM || "conveyor/sensor/jam") || data.event === "jam_detected") {
        const jamPayload = JamDetectedPayloadSchema.safeParse({
          event: "jam_detected",
          section: typeof data.section === "string" ? data.section : "Conveyor_Belt_Zone_A",
          duration_seconds: Number.isFinite(Number(data.duration_seconds)) ? Number(data.duration_seconds) : 5,
          sensor_id: typeof data.sensor_id === "string" ? data.sensor_id : "OPTICAL_JAM_02",
          mode: data.mode === "simulation" ? "simulation" : "realtime",
          timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
        });
        if (jamPayload.success) callbacksRef.current.onJamDetected?.(jamPayload.data as JamDetectedPayload);
      }

      // 6. Bin Full Event (conveyor/storage/bin_status)
      if (topic === (DEFAULT_MQTT_TOPICS.BIN_STATUS || "conveyor/storage/bin_status") || data.event === "bin_full") {
        const binFullPayload = BinFullPayloadSchema.safeParse({
          event: "bin_full",
          bin_id: typeof data.bin_id === "string" ? data.bin_id : "BIN_RED_01",
          category: typeof data.category === "string" ? data.category : "Sản phẩm loại A",
          current_count: Number.isFinite(Number(data.current_count)) ? Number(data.current_count) : 50,
          max_capacity: Number.isFinite(Number(data.max_capacity)) ? Number(data.max_capacity) : 50,
          mode: data.mode === "simulation" ? "simulation" : "realtime",
          timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
        });
        if (binFullPayload.success) callbacksRef.current.onBinFull?.(binFullPayload.data as BinFullPayload);
      }

      // 7. Temperature Warning Event (conveyor/telemetry/temp)
      if (topic === (DEFAULT_MQTT_TOPICS.TEMP || "conveyor/telemetry/temp") || data.event === "temperature_warning") {
        const tempPayload = TemperatureWarningPayloadSchema.safeParse({
          event: "temperature_warning",
          device_name: typeof data.device_name === "string" ? data.device_name : "Main_Drive_Motor / Edge_AI_Box",
          current_temp: data.current_temp,
          threshold_temp: Number.isFinite(Number(data.threshold_temp)) ? Number(data.threshold_temp) : 75.0,
          unit: typeof data.unit === "string" ? data.unit : "°C",
          mode: data.mode === "simulation" ? "simulation" : "realtime",
          timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
        });
        if (tempPayload.success) callbacksRef.current.onTemperatureWarning?.(tempPayload.data as TemperatureWarningPayload);
      }

      // 8. Heartbeat & Device Offline Event (conveyor/heartbeat)
      const heartbeatTopic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";
      if (topic === heartbeatTopic || topic.includes("heartbeat") || data.event === "device_offline") {
        if (data.event === "device_offline") {
          const offlinePayload = DeviceOfflinePayloadSchema.safeParse({
            event: "device_offline",
            device_id: typeof data.device_id === "string" ? data.device_id : "ESP32_MAIN_CONTROLLER",
            ip_address: typeof data.ip_address === "string" ? data.ip_address : "192.168.1.105",
            last_seen: typeof data.last_seen === "string" ? data.last_seen : "15 giây trước",
            mode: data.mode === "simulation" ? "simulation" : "realtime",
            timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
          });
          if (offlinePayload.success) callbacksRef.current.onDeviceOffline?.(offlinePayload.data as DeviceOfflinePayload);
        } else {
          const heartbeat = HeartbeatPayloadSchema.safeParse(data);
          if (heartbeat.success) callbacksRef.current.onHeartbeat?.(heartbeat.data);
        }
      }

      // 9. Hardware E-Stop ACK Event (conveyor/safety/estop/ack)
      const estopAckTopic = DEFAULT_MQTT_TOPICS.ESTOP_ACK || "conveyor/safety/estop/ack";
      if (topic === estopAckTopic || data.event === "estop_ack") {
        callbacksRef.current.onEstopAck?.(data);
      }
    } catch (e) {
      console.warn("Lỗi phân tích JSON MQTT:", e);
    }
  }, [scheduleTelemetryUpdate]);

  const handleIncomingMessageRef = useRef(handleIncomingMessage);
  handleIncomingMessageRef.current = handleIncomingMessage;

  // Initialize MQTT connection
  useEffect(() => {
    if (!isClient) return;
    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "";
    const service = new SorterMQTTService(brokerUrl);
    mqttRef.current = service;

    const statusTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_STATUS || "sorter/sorter_01/status";
    const visionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_VISION || "sorter/sorter_01/vision";
    const classificationTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_CLASSIFICATION || "sorter/sorter_01/classification";
    const cfgStatusTopic =
      process.env.NEXT_PUBLIC_MQTT_TOPIC_CONFIG_STATUS || "sorter/sorter_01/config/status";
    const telemetryTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_TELEMETRY || "sorter/sorter_01/telemetry";
    const alertTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_ALERTS || "sorter/sorter_01/alerts";
    const estopTopic = DEFAULT_MQTT_TOPICS.ESTOP || "conveyor/safety/estop";
    const estopAckTopic = DEFAULT_MQTT_TOPICS.ESTOP_ACK || "conveyor/safety/estop/ack";
    const jamTopic = DEFAULT_MQTT_TOPICS.JAM || "conveyor/sensor/jam";
    const binStatusTopic = DEFAULT_MQTT_TOPICS.BIN_STATUS || "conveyor/storage/bin_status";
    const tempTopic = DEFAULT_MQTT_TOPICS.TEMP || "conveyor/telemetry/temp";
    const heartbeatTopic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";

    service.setCallbacks({
      onConnect: () => {
        setMqttStatus("connected");
        setIsMqttAlertActive(false);
        setReconnectAttempt(0);
        setIsSimulatedDisconnect(false);
      },
      onDisconnect: () => {
        setMqttStatus("disconnected");
      },
      onError: () => {
        setMqttStatus("error");
      },
      onMqttDisconnectedAlert: (attempt, durationSec) => {
        setIsMqttAlertActive(true);
        setReconnectAttempt(attempt);
        const incident: MqttDisconnectedPayload = {
          event: "mqtt_disconnected",
          broker_url: brokerUrl,
          disconnected_duration_seconds: durationSec,
          reconnect_attempt: attempt,
          mode: isSimulationRef.current ? "simulation" : "realtime",
          timestamp: new Date().toISOString(),
        };
        setMqttDisconnectedIncident(incident);
        callbacksRef.current.onMqttDisconnected?.(incident);
      },
      onMqttReconnectedAlert: () => {
        setIsMqttAlertActive(false);
        setMqttDisconnectedIncident(null);
        setReconnectAttempt(0);
        callbacksRef.current.onMqttReconnected?.();
      },
      onReconnectAttempt: (attempt) => {
        setReconnectAttempt(attempt);
      },
      onMessage: (topic: string, message: string) =>
        handleIncomingMessageRef.current(topic, message),
    });

    setIsSimulatedDisconnect(false);
    service.connect([statusTopic, visionTopic, classificationTopic, cfgStatusTopic, telemetryTopic, alertTopic, estopTopic, estopAckTopic, jamTopic, binStatusTopic, tempTopic, heartbeatTopic]);

    return () => {
      service.disconnect();
      if (telemetryFlushTimerRef.current !== null) {
        clearTimeout(telemetryFlushTimerRef.current);
        telemetryFlushTimerRef.current = null;
      }
      pendingTelemetryRef.current = null;
      if (mqttRef.current === service) {
        mqttRef.current = null;
        setMqttStatus("disconnected");
        setIsMqttAlertActive(false);
      }
    };
  }, [isClient, isSimulation]);


  const publishCommand = useCallback(async (cmd: string, value?: number): Promise<boolean> => {
    if (isSimulationRef.current) return false;
    const command = typeof cmd === "string" ? cmd.trim() : "";
    if (!command) return false;
    if (value !== undefined && !Number.isFinite(value)) return false;

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("sortix_session_token") : null;
      const res = await fetch("/api/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          command,
          value: value !== undefined ? value : null,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const publishConfig = useCallback(async (config: SorterConfig): Promise<boolean> => {
    if (isSimulationRef.current) return false;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("sortix_session_token") : null;
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const publishEmergencyStop = useCallback(async (payload: EmergencyStopPayload): Promise<boolean> => {
    if (isSimulationRef.current || payload.mode === "simulation") return false;
    if (!mqttRef.current || !mqttRef.current.isConnected()) return false;
    const topic = DEFAULT_MQTT_TOPICS.ESTOP || "conveyor/safety/estop";
    return await mqttRef.current.publish(topic, payload);
  }, []);

  const publishJamAlert = useCallback(async (payload: JamDetectedPayload): Promise<boolean> => {
    if (isSimulationRef.current || payload.mode === "simulation") return false;
    if (!mqttRef.current || !mqttRef.current.isConnected()) return false;
    const topic = DEFAULT_MQTT_TOPICS.JAM || "conveyor/sensor/jam";
    return await mqttRef.current.publish(topic, payload);
  }, []);

  const publishBinFullAlert = useCallback(async (payload: BinFullPayload): Promise<boolean> => {
    if (isSimulationRef.current || payload.mode === "simulation") return false;
    if (!mqttRef.current || !mqttRef.current.isConnected()) return false;
    const topic = DEFAULT_MQTT_TOPICS.BIN_STATUS || "conveyor/storage/bin_status";
    return await mqttRef.current.publish(topic, payload);
  }, []);

  const publishTemperatureWarningAlert = useCallback(async (payload: TemperatureWarningPayload): Promise<boolean> => {
    if (isSimulationRef.current || payload.mode === "simulation") return false;
    if (!mqttRef.current || !mqttRef.current.isConnected()) return false;
    const topic = DEFAULT_MQTT_TOPICS.TEMP || "conveyor/telemetry/temp";
    return await mqttRef.current.publish(topic, payload);
  }, []);

  const publishDeviceOfflineAlert = useCallback(async (payload: DeviceOfflinePayload): Promise<boolean> => {
    if (isSimulationRef.current || payload.mode === "simulation") return false;
    if (!mqttRef.current || !mqttRef.current.isConnected()) return false;
    const topic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";
    return await mqttRef.current.publish(topic, payload);
  }, []);

  const publishHeartbeatPing = useCallback(async (deviceId = "ESP32_MAIN_CONTROLLER"): Promise<boolean> => {
    if (isSimulationRef.current) return false;
    if (!mqttRef.current || !mqttRef.current.isConnected()) return false;
    const topic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";
    return await mqttRef.current.publish(topic, {
      device_id: deviceId,
      ip_address: "192.168.1.105",
      timestamp: new Date().toISOString(),
    });
  }, []);

  const simulateDisconnect = useCallback(() => {
    if (!isSimulationRef.current) return;
    setIsSimulatedDisconnect(true);
    setMqttStatus("disconnected");
    if (mqttRef.current) {
      mqttRef.current.simulateDisconnect();
    }
  }, []);

  const reconnectManual = useCallback(() => {
    setIsSimulatedDisconnect(false);
    if (mqttRef.current) {
      mqttRef.current.reconnectManual();
    }
  }, []);

  return {
    mqttStatus,
    pingMs,
    setPingMs,
    configStatusMsg,
    setConfigStatusMsg,
    isMqttAlertActive,
    reconnectAttempt,
    mqttDisconnectedIncident,
    isSimulatedDisconnect,
    simulateDisconnect,
    reconnectManual,
    publishCommand,
    publishConfig,
    publishEmergencyStop,
    publishJamAlert,
    publishBinFullAlert,
    publishTemperatureWarningAlert,
    publishDeviceOfflineAlert,
    publishHeartbeatPing,
    mqttRef,
  };
}
