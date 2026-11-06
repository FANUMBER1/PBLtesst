// Khởi tạo và quản lý kết nối MQTT WebSocket, đăng ký, xuất bản và xử lý tự động kết nối lại (Auto-reconnect)
import mqtt, { MqttClient } from "mqtt";

export interface MQTTCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (err: Error) => void;
  onMessage?: (topic: string, message: string) => void;
  onMqttDisconnectedAlert?: (attempt: number, durationSeconds: number) => void;
  onMqttReconnectedAlert?: () => void;
  onReconnectAttempt?: (attempt: number, delaySeconds: number) => void;
}

export class SorterMQTTService {
  private client: MqttClient | null = null;
  private brokerUrl: string;
  private clientId: string;
  /** Topics requested by the caller. They are re-subscribed after reconnect. */
  private subscribedTopics = new Set<string>();
  private callbacks: MQTTCallbacks = {};
  private closing = false;

  // Watchdog 5 giây & Quản lý Auto-reconnect (3s, 5s, 10s)
  private disconnectStartTime = 0;
  private disconnectDebounceTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private isAlertTriggered = false;
  private isSimulatedDisconnect = false;
  private simReconnectInterval: NodeJS.Timeout | null = null;

  constructor(brokerUrl?: string, clientId?: string) {
    this.brokerUrl =
      brokerUrl ||
      process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
      "";
    this.clientId =
      clientId ||
      (process.env.NEXT_PUBLIC_MQTT_CLIENT_ID || "pbl3_dash_") +
        Math.random().toString(16).substring(2, 8);
  }

  public setCallbacks(callbacks: MQTTCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Tính toán khoảng thời gian chờ thử lại (Backoff):
   * Lần 1: 3 giây
   * Lần 2: 5 giây
   * Lần 3 trở đi: 10 giây
   */
  public getReconnectDelay(attempt: number): number {
    if (attempt <= 1) return 3000;
    if (attempt === 2) return 5000;
    return 10000;
  }

  public connect(topicsToSubscribe: string[] = []): MqttClient | null {
    if (typeof window === "undefined") return null;
    if (!this.brokerUrl.startsWith("wss://")) {
      this.callbacks.onError?.(new Error("NEXT_PUBLIC_MQTT_BROKER_URL must point to a WSS broker"));
      return null;
    }

    for (const topic of topicsToSubscribe) {
      if (typeof topic === "string" && topic.trim()) this.subscribedTopics.add(topic.trim());
    }

    if (this.client) {
      if (this.client.connected) {
        if (this.subscribedTopics.size > 0) {
          this.subscribe(Array.from(this.subscribedTopics));
        }
        return this.client;
      }
      // Đang có client nhưng ngắt kết nối -> gọi reconnect
      if (!this.isSimulatedDisconnect) {
        try {
          this.client.reconnect();
          return this.client;
        } catch {
          // fallback tạo mới
        }
      }
    }

    try {
      this.closing = false;
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: this.clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 0, // Tự quản lý auto-reconnect theo nhịp 3s, 5s, 10s
      });

      this.client.on("connect", () => {
        this.clearTimers();

        const wasAlertActive = this.isAlertTriggered;
        this.isAlertTriggered = false;
        this.disconnectStartTime = 0;
        this.reconnectAttempt = 0;
        this.isSimulatedDisconnect = false;

        if (this.callbacks.onConnect) this.callbacks.onConnect();

        // Nếu trước đó đang cảnh báo mất kết nối -> kích hoạt thông báo phục hồi xanh
        if (wasAlertActive) {
          this.callbacks.onMqttReconnectedAlert?.();
        }

        if (this.subscribedTopics.size > 0) {
          this.subscribe(Array.from(this.subscribedTopics));
        }
      });

      this.client.on("message", (topic, payload) => {
        if (this.callbacks.onMessage) {
          this.callbacks.onMessage(topic, payload.toString());
        }
      });

      this.client.on("error", (err) => {
        console.error("[MQTT] Lỗi kết nối:", err);
        if (this.callbacks.onError) this.callbacks.onError(err);
        this.handleDisconnectOrError();
      });

      this.client.on("close", () => {
        if (!this.closing) {
          this.callbacks.onDisconnect?.();
          this.handleDisconnectOrError();
        }
      });

      return this.client;
    } catch (e: unknown) {
      console.error("[MQTT] Không thể khởi tạo:", e);
      const error = e instanceof Error ? e : new Error(String(e));
      if (this.callbacks.onError) this.callbacks.onError(error);
      this.handleDisconnectOrError();
      return null;
    }
  }

  /**
   * Xử lý khi mất kết nối hoặc gặp lỗi socket:
   * - Bắt đầu tính giờ mất kết nối
   * - Sau 5 giây kích hoạt cảnh báo CRITICAL mqtt_disconnected
   * - Lên lịch Auto-reconnect sau 3s, 5s, 10s
   */
  private handleDisconnectOrError() {
    if (this.closing && !this.isSimulatedDisconnect) return;

    if (this.disconnectStartTime === 0) {
      this.disconnectStartTime = Date.now();
    }

    // Khởi động watchdog 5 giây nếu chưa có
    if (!this.disconnectDebounceTimer && !this.isAlertTriggered) {
      this.disconnectDebounceTimer = setTimeout(() => {
        if (!this.isConnected()) {
          this.isAlertTriggered = true;
          this.callbacks.onMqttDisconnectedAlert?.(
            Math.max(1, this.reconnectAttempt),
            5
          );
        }
      }, 5000);
    }

    // Lên lịch thử kết nối lại tự động nếu không phải đang ngắt bằng tay
    if (!this.isSimulatedDisconnect) {
      this.scheduleNextReconnect();
    }
  }

  private scheduleNextReconnect() {
    if (this.reconnectTimer) return;

    const nextAttempt = this.reconnectAttempt + 1;
    const delay = this.getReconnectDelay(nextAttempt);
    const delaySec = Math.round(delay / 1000);

    this.callbacks.onReconnectAttempt?.(nextAttempt, delaySec);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected() && !this.closing && !this.isSimulatedDisconnect) {
        this.reconnectAttempt = nextAttempt;

        // Nếu đã quá 5 giây -> cập nhật thông báo cảnh báo lần thử thứ N
        const elapsed = this.disconnectStartTime > 0 ? Math.round((Date.now() - this.disconnectStartTime) / 1000) : 5;
        if (elapsed >= 5) {
          this.isAlertTriggered = true;
          this.callbacks.onMqttDisconnectedAlert?.(this.reconnectAttempt, elapsed);
        }

        try {
          if (this.client) {
            this.client.reconnect();
          } else {
            this.connect(Array.from(this.subscribedTopics));
          }
        } catch (err) {
          console.warn("[MQTT Auto-Reconnect] Thử kết nối lại thất bại:", err);
          this.handleDisconnectOrError();
        }
      }
    }, delay);
  }

  private clearTimers() {
    if (this.disconnectDebounceTimer) {
      clearTimeout(this.disconnectDebounceTimer);
      this.disconnectDebounceTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.simReconnectInterval) {
      clearTimeout(this.simReconnectInterval);
      this.simReconnectInterval = null;
    }
  }

  /**
   * Phương thức Demo: Giả lập ngắt kết nối MQTT Client
   */
  public simulateDisconnect() {
    this.isSimulatedDisconnect = true;
    this.clearTimers();
    this.disconnectStartTime = Date.now();
    this.reconnectAttempt = 0;

    // Ngắt kết nối socket thật
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
    }
    if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();

    // Bắt đầu đếm 5 giây để kích hoạt cảnh báo CRITICAL
    this.disconnectDebounceTimer = setTimeout(() => {
      this.isAlertTriggered = true;
      this.reconnectAttempt = 1;
      this.callbacks.onMqttDisconnectedAlert?.(1, 5);

      // Bắt đầu chu trình mô phỏng tăng dần số lần thử kết nối lại (3s, 5s, 10s...)
      this.scheduleSimulatedReconnectSequence();
    }, 5000);
  }

  private scheduleSimulatedReconnectSequence() {
    if (!this.isSimulatedDisconnect) return;

    const nextAttempt = this.reconnectAttempt + 1;
    const delay = this.getReconnectDelay(nextAttempt);

    this.simReconnectInterval = setTimeout(() => {
      if (this.isSimulatedDisconnect) {
        this.reconnectAttempt = nextAttempt;
        const elapsed = this.disconnectStartTime > 0 ? Math.round((Date.now() - this.disconnectStartTime) / 1000) : 5;
        this.callbacks.onMqttDisconnectedAlert?.(this.reconnectAttempt, elapsed);
        this.scheduleSimulatedReconnectSequence();
      }
    }, delay);
  }

  /**
   * Phương thức Demo / Manual: Khôi phục kết nối MQTT
   */
  public reconnectManual() {
    this.isSimulatedDisconnect = false;
    this.clearTimers();
    this.connect(Array.from(this.subscribedTopics));
  }

  public subscribe(topics: string | string[]) {
    const topicList = (Array.isArray(topics) ? topics : [topics])
      .filter((topic): topic is string => typeof topic === "string")
      .map((topic) => topic.trim())
      .filter(Boolean);
    topicList.forEach((topic) => this.subscribedTopics.add(topic));
    if (!this.client || !this.client.connected || topicList.length === 0) return;

    this.client.subscribe(topicList, { qos: 1 }, (err) => {
      if (!err) {
      } else {
        console.error("[MQTT] Lỗi đăng ký topic:", err);
      }
    });
  }

  public publish(
    topic: string,
    message: string | object,
    qos: 0 | 1 | 2 = 1
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const topicName = typeof topic === "string" ? topic.trim() : "";
      if (!topicName || !this.client || !this.client.connected) {
        console.warn("[MQTT] Không thể xuất bản vì máy khách chưa kết nối");
        resolve(false);
        return;
      }

      let payload: string;
      try {
        payload = typeof message === "string" ? message : JSON.stringify(message);
      } catch (error) {
        console.error(`[MQTT] Payload không thể mã hóa cho ${topicName}:`, error);
        resolve(false);
        return;
      }

      try {
        this.client.publish(topicName, payload, { qos }, (err) => {
          if (err) {
            console.error(`[MQTT] Lỗi xuất bản tới ${topicName}:`, err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.error(`[MQTT] Lỗi xuất bản tới ${topicName}:`, error);
        resolve(false);
      }
    });
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.connected && !this.isSimulatedDisconnect);
  }

  public isSimulated(): boolean {
    return this.isSimulatedDisconnect;
  }

  public getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  public disconnect() {
    this.clearTimers();
    if (this.client) {
      this.closing = true;
      this.client.end(true);
      this.client = null;
    }
  }
}
