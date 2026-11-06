import mqtt, { MqttClient } from "mqtt";
import { DEFAULT_MQTT_TOPICS } from "@shared/constants";
import { EmergencyStopPayloadSchema, EmergencyStopAckPayloadSchema, JamDetectedPayloadSchema, BinFullPayloadSchema, TemperatureWarningPayloadSchema, HeartbeatPayloadSchema, MqttDisconnectedPayloadSchema } from "@shared/schemas";
import { SafetyService } from "./safetyService";
import { SSEService } from "./sseService";
import { ENV } from "../config/env";

let client: MqttClient | null = null;
let isConnected = false;
let lastHeartbeatTimestamp = 0;
let isDeviceOffline = false;
let watchdogInterval: NodeJS.Timeout | null = null;
let isMqttDisconnectedAlertTriggered = false;
let disconnectTimeoutTimer: NodeJS.Timeout | null = null;
let reconnectAttemptCount = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;

export function initBackendMQTT() {
  shuttingDown = false;
  const brokerUrl = ENV.MQTT_BROKER_URL;
  const estopTopic = DEFAULT_MQTT_TOPICS.ESTOP || "conveyor/safety/estop";
  const estopAckTopic = DEFAULT_MQTT_TOPICS.ESTOP_ACK || "conveyor/safety/estop/ack";
  const jamTopic = DEFAULT_MQTT_TOPICS.JAM || "conveyor/sensor/jam";
  const binStatusTopic = DEFAULT_MQTT_TOPICS.BIN_STATUS || "conveyor/storage/bin_status";
  const tempTopic = DEFAULT_MQTT_TOPICS.TEMP || "conveyor/telemetry/temp";
  const heartbeatTopic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";

  if (!brokerUrl.startsWith("mqtts://") && !brokerUrl.startsWith("wss://")) {
    console.error("[Backend MQTT] MQTT disabled: configure MQTT_BROKER_URL with TLS (mqtts:// or wss://).");
    return;
  }

  try {
    console.log(`[Backend MQTT] Đang kết nối tới broker: ${brokerUrl}...`);
    client = mqtt.connect(brokerUrl, {
      clientId: `sortix_backend_${Date.now()}`,
      reconnectPeriod: 0,
      connectTimeout: 10000,
      ...(ENV.MQTT_USERNAME ? { username: ENV.MQTT_USERNAME } : {}),
      ...(ENV.MQTT_PASSWORD ? { password: ENV.MQTT_PASSWORD } : {}),
    });

    client.on("connect", () => {
      isConnected = true;
      lastHeartbeatTimestamp = Date.now();
      if (disconnectTimeoutTimer) {
        clearTimeout(disconnectTimeoutTimer);
        disconnectTimeoutTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (isMqttDisconnectedAlertTriggered) {
        isMqttDisconnectedAlertTriggered = false;
        reconnectAttemptCount = 0;
        SafetyService.recoverMqttConnected(brokerUrl);
      }
      console.log(`[Backend MQTT] Đã kết nối thành công! Đang lắng nghe topics: ${estopTopic}, ${estopAckTopic}, ${jamTopic}, ${binStatusTopic}, ${tempTopic}, ${heartbeatTopic}`);

      client?.subscribe([estopTopic, estopAckTopic, jamTopic, binStatusTopic, tempTopic, heartbeatTopic], (err) => {
        if (err) {
          console.error(`[Backend MQTT] Lỗi subscribe topics an toàn & telemetry:`, err);
        } else {
          console.log(`[Backend MQTT] Đã subscribe thành công các topics: ${estopTopic}, ${estopAckTopic}, ${jamTopic}, ${binStatusTopic}, ${tempTopic}, ${heartbeatTopic}`);
        }
      });
    });

    client.on("message", (topic, message) => {
      if (topic === estopTopic) {
        try {
          const raw = JSON.parse(message.toString());
          const validated = EmergencyStopPayloadSchema.safeParse(raw);
          if (validated.success) {
            console.warn(`[Backend MQTT] Nhận tín hiệu Dừng Khẩn Cấp từ phần cứng qua topic ${topic}:`, validated.data);
            SafetyService.triggerEmergencyStop(validated.data);
          } else {
            console.warn(`[Backend MQTT] Payload E-Stop không hợp lệ:`, validated.error.format());
          }
        } catch (err) {
          console.error(`[Backend MQTT] Lỗi giải mã message trên ${topic}:`, err);
        }
      } else if (topic === jamTopic) {
        try {
          const raw = JSON.parse(message.toString());
          const validated = JamDetectedPayloadSchema.safeParse(raw);
          if (validated.success) {
            console.warn(`[Backend MQTT] Nhận tín hiệu KẸT PHÔI qua topic ${topic}:`, validated.data);
            SafetyService.triggerJamAlert(validated.data);
          } else {
            console.warn(`[Backend MQTT] Payload Kẹt Phôi không hợp lệ:`, validated.error.format());
          }
        } catch (err) {
          console.error(`[Backend MQTT] Lỗi giải mã message trên ${topic}:`, err);
        }
      } else if (topic === binStatusTopic) {
        try {
          const raw = JSON.parse(message.toString());
          const validated = BinFullPayloadSchema.safeParse(raw);
          if (validated.success) {
            console.warn(`[Backend MQTT] Nhận tín hiệu ĐẦY KHAY qua topic ${topic}:`, validated.data);
            SafetyService.triggerBinFull(validated.data);
          } else {
            console.warn(`[Backend MQTT] Payload Đầy Khay không hợp lệ:`, validated.error.format());
          }
        } catch (err) {
          console.error(`[Backend MQTT] Lỗi giải mã message trên ${topic}:`, err);
        }
      } else if (topic === tempTopic) {
        try {
          const raw = JSON.parse(message.toString());
          const validated = TemperatureWarningPayloadSchema.safeParse(raw);
          if (validated.success) {
            console.warn(`[Backend MQTT] Nhận tín hiệu CẢNH BÁO NHIỆT ĐỘ qua topic ${topic}:`, validated.data);
            if (validated.data.current_temp > validated.data.threshold_temp) {
              SafetyService.triggerTemperatureWarning(validated.data);
            }
          } else {
            console.warn(`[Backend MQTT] Payload Cảnh Báo Nhiệt Độ không hợp lệ:`, validated.error.format());
          }
        } catch (err) {
          console.error(`[Backend MQTT] Lỗi giải mã message trên ${topic}:`, err);
        }
      } else if (topic === heartbeatTopic) {
        try {
          const raw = JSON.parse(message.toString());
          const validated = HeartbeatPayloadSchema.safeParse(raw);
          if (!validated.success) {
            console.warn(`[Backend MQTT] Heartbeat không hợp lệ trên ${topic}:`, validated.error.format());
            return;
          }
          lastHeartbeatTimestamp = Date.now();
          const deviceId = validated.data.device_id;

          if (isDeviceOffline) {
            isDeviceOffline = false;
            console.log(`[Backend MQTT] 🟢 Đã nhận lại tín hiệu Heartbeat từ ${deviceId}! Phục hồi trạng thái Online.`);
            SafetyService.recoverDeviceOnline(deviceId);
          }
        } catch (err) {
          console.error(`[Backend MQTT] Lỗi giải mã heartbeat trên ${topic}:`, err);
        }
      } else if (topic === estopAckTopic) {
        try {
          const raw = JSON.parse(message.toString());
          const validated = EmergencyStopAckPayloadSchema.safeParse(raw);
          if (validated.success) {
            console.log(`[Backend MQTT] 🟢 Nhận ACK Dừng Khẩn Cấp hợp lệ từ phần cứng qua topic ${topic}:`, validated.data);
            SSEService.broadcast("estop_ack", {
              event: "estop_ack",
              payload: validated.data,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.warn(`[Backend MQTT] Bỏ qua ACK Dừng Khẩn Cấp không hợp lệ trên ${topic}:`, validated.error.format());
          }
        } catch (err) {
          console.error(`[Backend MQTT] Lỗi giải mã estop_ack trên ${topic}:`, err);
        }
      }
    });

    // Thiết lập Watchdog kiểm tra Heartbeat định kỳ mỗi giây (Timeout 6 giây)
    if (watchdogInterval) clearInterval(watchdogInterval);
    watchdogInterval = setInterval(() => {
      if (isConnected && lastHeartbeatTimestamp > 0 && !isDeviceOffline) {
        const elapsedMs = Date.now() - lastHeartbeatTimestamp;
        if (elapsedMs > 6000) {
          isDeviceOffline = true;
          const diffSec = Math.round(elapsedMs / 1000);
          console.error(`[Backend MQTT Watchdog] ❌ Quá 6s không nhận được Heartbeat (Đã qua ${diffSec}s)! Kích hoạt cảnh báo device_offline.`);
          SafetyService.triggerDeviceOffline({
            event: "device_offline",
            device_id: "ESP32_MAIN_CONTROLLER",
            ip_address: "192.168.1.105",
            last_seen: `${diffSec} giây trước`,
            mode: "realtime",
          });
        }
      }
    }, 1000);

    client.on("error", (err) => {
      console.warn(`[Backend MQTT] Cảnh báo kết nối:`, err.message);
    });

    client.on("close", () => {
      isConnected = false;
      if (shuttingDown) return;
      if (!disconnectTimeoutTimer && !isMqttDisconnectedAlertTriggered) {
        disconnectTimeoutTimer = setTimeout(() => {
          if (!isConnected) {
            isMqttDisconnectedAlertTriggered = true;
            reconnectAttemptCount = Math.max(1, reconnectAttemptCount);
            SafetyService.triggerMqttDisconnected({
              event: "mqtt_disconnected",
              broker_url: brokerUrl,
              disconnected_duration_seconds: 5,
              reconnect_attempt: reconnectAttemptCount,
              mode: "realtime",
            });
          }
        }, 5000);
      }
      const nextAttempt = reconnectAttemptCount + 1;
      reconnectAttemptCount = nextAttempt;
      const delayMs = nextAttempt <= 1 ? 3000 : nextAttempt === 2 ? 5000 : 10000;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (!shuttingDown && !isConnected) {
            try { client?.reconnect(); } catch (err) {
              console.warn("[Backend MQTT] Reconnect thất bại:", err);
            }
          }
        }, delayMs);
      }
    });


    // Cài đặt hook khi Admin mở khóa hệ thống -> gửi thông điệp release qua MQTT
    SafetyService.setOnUnlockPublishHook(() => {
      if (client && isConnected) {
        const controlSecret = ENV.SORTIX_CONTROL_SECRET;
        if (controlSecret.length < 16) {
          console.error("[Backend MQTT] Từ chối ESTOP_RELEASE: SORTIX_CONTROL_SECRET chưa cấu hình đủ 16 ký tự.");
          return;
        }
        const releasePayload = JSON.stringify({
          command: "ESTOP_RELEASE",
          timestamp: new Date().toISOString(),
          released_by: "admin",
          auth_token: controlSecret,
        });
        client.publish(DEFAULT_MQTT_TOPICS.ESTOP_RELEASE, releasePayload);
        client.publish(DEFAULT_MQTT_TOPICS.CONTROL, releasePayload);
        console.log(`[Backend MQTT] Đã xuất bản lệnh mở khóa ESTOP_RELEASE tới phần cứng qua MQTT.`);
      }
    });
  } catch (err) {
    console.error("[Backend MQTT] Khởi tạo MQTT client thất bại:", err);
  }
}

export function shutdownBackendMQTT(): void {
  shuttingDown = true;
  if (watchdogInterval) clearInterval(watchdogInterval);
  if (disconnectTimeoutTimer) clearTimeout(disconnectTimeoutTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  watchdogInterval = null;
  disconnectTimeoutTimer = null;
  reconnectTimer = null;
  SafetyService.setOnUnlockPublishHook(null);
  isConnected = false;
  isDeviceOffline = false;
  try { client?.end(true); } catch { /* already closed */ }
  client = null;
}

export function publishControlCommand(command: string, value?: number | null): boolean {
  if (client && isConnected) {
    const controlSecret = ENV.SORTIX_CONTROL_SECRET;
    if (controlSecret.length < 16) {
      console.error("[Backend MQTT] Từ chối lệnh điều khiển: SORTIX_CONTROL_SECRET chưa cấu hình đủ 16 ký tự.");
      return false;
    }
    const payload = JSON.stringify({
      command,
      value: value !== undefined ? value : null,
      timestamp: new Date().toISOString(),
      auth_token: controlSecret,
    });
    const topic = DEFAULT_MQTT_TOPICS.CONTROL || "sorter/sorter_01/control";
    client.publish(topic, payload);
    return true;
  }
  return false;
}

export function publishEstopSimulation(payload: unknown) {
  if (client && isConnected) {
    const topic = DEFAULT_MQTT_TOPICS.ESTOP || "conveyor/safety/estop";
    client.publish(topic, JSON.stringify(payload));
  }
}

export function publishJamSimulation(payload: unknown) {
  if (client && isConnected) {
    const topic = DEFAULT_MQTT_TOPICS.JAM || "conveyor/sensor/jam";
    client.publish(topic, JSON.stringify(payload));
  }
}

export function publishBinFullSimulation(payload: unknown) {
  if (client && isConnected) {
    const topic = DEFAULT_MQTT_TOPICS.BIN_STATUS || "conveyor/storage/bin_status";
    client.publish(topic, JSON.stringify(payload));
  }
}

export function publishTemperatureWarningSimulation(payload: unknown) {
  if (client && isConnected) {
    const topic = DEFAULT_MQTT_TOPICS.TEMP || "conveyor/telemetry/temp";
    client.publish(topic, JSON.stringify(payload));
  }
}

export function publishHeartbeatSimulation(payload?: unknown) {
  if (client && isConnected) {
    const topic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";
    const data = payload || {
      device_id: "ESP32_MAIN_CONTROLLER",
      ip_address: "192.168.1.105",
      timestamp: new Date().toISOString(),
    };
    client.publish(topic, JSON.stringify(data));
  }
}

export function publishDeviceOfflineSimulation(payload: unknown) {
  if (client && isConnected) {
    const topic = DEFAULT_MQTT_TOPICS.HEARTBEAT || "conveyor/heartbeat";
    client.publish(topic, JSON.stringify(payload));
  }
}

export function publishMqttDisconnectedSimulation(payload?: unknown) {
  const data = payload || {
    event: "mqtt_disconnected",
    broker_url: ENV.MQTT_BROKER_URL,
    disconnected_duration_seconds: 5,
    reconnect_attempt: 1,
    mode: "simulation",
  };
  const validated = MqttDisconnectedPayloadSchema.safeParse(data);
  if (validated.success) SafetyService.triggerMqttDisconnected(validated.data);
}
