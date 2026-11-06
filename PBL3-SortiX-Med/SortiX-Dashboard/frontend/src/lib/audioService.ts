// Bộ tổng hợp âm thanh công nghiệp dựa trên Web Audio API (Không cần tải file âm thanh ngoài)
class IndustrialAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private activeAlarmOsc: OscillatorNode | null = null;
  private activeAlarmGain: GainNode | null = null;
  private continuousAlarmInterval: NodeJS.Timeout | null = null;

  // Còi kẹt phôi
  private activeJamOsc: OscillatorNode | null = null;
  private activeJamGain: GainNode | null = null;
  private continuousJamInterval: NodeJS.Timeout | null = null;

  // Còi khay đầy
  private activeBinFullOsc: OscillatorNode | null = null;
  private activeBinFullGain: GainNode | null = null;
  private continuousBinFullInterval: NodeJS.Timeout | null = null;

  // Còi quá nhiệt
  private activeTempOsc: OscillatorNode | null = null;
  private activeTempGain: GainNode | null = null;
  private continuousTempInterval: NodeJS.Timeout | null = null;

  // Còi mất kết nối thiết bị ngoại tuyến
  private activeOfflineOsc: OscillatorNode | null = null;
  private continuousOfflineInterval: NodeJS.Timeout | null = null;

  // Thuộc tính điều chỉnh còi cảnh báo (Buzzer / Horn)
  private buzzerVolume: number = 0.7;
  private buzzerEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = window.localStorage ? window.localStorage.getItem("pbl3_sound_muted") : null;
      this.isMuted = saved === "true";

      const savedBuzzerVol = window.localStorage ? window.localStorage.getItem("pbl3_buzzer_volume") : null;
      if (savedBuzzerVol !== null) {
        const parsed = parseFloat(savedBuzzerVol);
        if (!isNaN(parsed)) this.buzzerVolume = Math.max(0, Math.min(1, parsed));
      }
      const savedBuzzerMuted = window.localStorage ? window.localStorage.getItem("pbl3_buzzer_muted") : null;
      this.buzzerEnabled = savedBuzzerMuted !== "true";

      // Tự động unlock Web AudioContext ngay khi người dùng tương tác lần đầu trên trang
      const unlockAudio = () => {
        this.initContext();
        ["click", "keydown", "touchstart", "pointerdown"].forEach((event) => {
          window.removeEventListener(event, unlockAudio);
        });
      };

      ["click", "keydown", "touchstart", "pointerdown"].forEach((event) => {
        window.addEventListener(event, unlockAudio, { once: true, passive: true });
      });
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("pbl3_sound_muted", String(muted));
    }
    if (muted) {
      this.silenceAll();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getBuzzerVolume(): number {
    return this.buzzerVolume;
  }

  public setBuzzerVolume(vol: number) {
    this.buzzerVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("pbl3_buzzer_volume", String(this.buzzerVolume));
    }
  }

  public isBuzzerEnabled(): boolean {
    return this.buzzerEnabled;
  }

  public setBuzzerEnabled(enabled: boolean) {
    this.buzzerEnabled = enabled;
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("pbl3_buzzer_muted", String(!enabled));
    }
    if (!enabled) {
      this.stopContinuousEmergencyAlarm();
      this.stopContinuousJamAlarm();
      this.stopContinuousBinFullAlarm();
      this.stopContinuousTemperatureAlarm();
      this.stopContinuousDeviceOfflineAlarm();
    }
  }

  public isAlarmSounding(): boolean {
    return (
      this.continuousAlarmInterval !== null ||
      this.continuousJamInterval !== null ||
      this.continuousBinFullInterval !== null ||
      this.continuousTempInterval !== null ||
      this.continuousOfflineInterval !== null
    );
  }

  // 1. Tiếng bíp cảm biến quang (S1/S2/S3 phát hiện vật)
  public playSensorBeep() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(920, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1240, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  // 2. Tiếng cơ cấu servo gạt phôi
  public playServoArm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(140, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch (e) {}
  }

  // 3. Tiếng chuông xác nhận phân loại thành công vào khay
  public playSortSuccess() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  // 4. Tiếng còi hú khẩn cấp (E-Stop hoặc sự cố nghiêm trọng) - Còi an toàn công nghiệp
  public playEmergencyAlarm() {
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      // Dừng âm thanh còi trước đó nếu đang kêu dở
      this.stopEmergencyAlarm();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      this.activeAlarmOsc = osc;
      this.activeAlarmGain = gain;

      // Còi hú công nghiệp hai tần số lượn sóng (620Hz -> 960Hz)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(960, now + 0.2);
      osc.frequency.linearRampToValueAtTime(620, now + 0.4);

      // Âm lượng rõ nét, mạnh mẽ cho tình huống khẩn cấp
      const vol = Math.max(0.6, this.buzzerVolume ?? 0.8);
      const effectiveGain = 0.35 * vol;
      gain.gain.setValueAtTime(effectiveGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.47);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => {
        if (this.activeAlarmOsc === osc) {
          this.activeAlarmOsc = null;
          this.activeAlarmGain = null;
        }
      };

      osc.start(now);
      osc.stop(now + 0.48);
    } catch (e) {
      console.warn("Lỗi phát âm thanh còi khẩn cấp:", e);
    }
  }

  // Bắt đầu còi E-Stop hú liên tục không ngừng cho đến khi được xác nhận / mở khóa
  public startContinuousEmergencyAlarm() {
    // Luôn đảm bảo buzzer được kích hoạt khi có sự cố dừng khẩn cấp
    this.buzzerEnabled = true;
    if (this.continuousAlarmInterval) return;

    this.initContext();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().then(() => {
        this.playEmergencyAlarm();
      }).catch(() => {});
    } else {
      this.playEmergencyAlarm();
    }

    this.continuousAlarmInterval = setInterval(() => {
      this.playEmergencyAlarm();
    }, 500);
  }

  // Dập tắt ngay lập tức còi hú E-Stop
  public stopContinuousEmergencyAlarm() {
    if (this.continuousAlarmInterval) {
      clearInterval(this.continuousAlarmInterval);
      this.continuousAlarmInterval = null;
    }
    this.stopEmergencyAlarm();
  }

  public stopEmergencyAlarm() {
    try {
      if (this.activeAlarmGain && this.ctx) {
        this.activeAlarmGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.activeAlarmGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.activeAlarmOsc) {
        try {
          this.activeAlarmOsc.stop(this.ctx ? this.ctx.currentTime : 0);
          this.activeAlarmOsc.disconnect();
        } catch {}
        this.activeAlarmOsc = null;
      }
      this.activeAlarmGain = null;
    } catch (e) {}
  }

  // 5. Còi cảnh báo KẸT PHÔI (Jam Detected Alarm) - Tiếng còi cứu hộ dồn dập (880Hz - 1100Hz)
  public playJamAlarm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.stopJamAlarm();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      this.activeJamOsc = osc;
      this.activeJamGain = gain;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(1150, now + 0.15);
      osc.frequency.linearRampToValueAtTime(650, now + 0.35);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => {
        if (this.activeJamOsc === osc) {
          this.activeJamOsc = null;
          this.activeJamGain = null;
        }
      };

      osc.start(now);
      osc.stop(now + 0.43);
    } catch (e) {}
  }

  // Kích hoạt còi kẹt phôi kêu liên tục cho đến khi gỡ kẹt
  public startContinuousJamAlarm() {
    if (this.isMuted) return;
    if (this.continuousJamInterval) return;

    this.playJamAlarm();
    this.continuousJamInterval = setInterval(() => {
      if (this.isMuted) {
        this.stopContinuousJamAlarm();
        return;
      }
      this.playJamAlarm();
    }, 480);
  }

  // Dập tắt còi kẹt phôi
  public stopContinuousJamAlarm() {
    if (this.continuousJamInterval) {
      clearInterval(this.continuousJamInterval);
      this.continuousJamInterval = null;
    }
    this.stopJamAlarm();
  }

  public stopJamAlarm() {
    try {
      if (this.activeJamGain && this.ctx) {
        this.activeJamGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.activeJamGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.activeJamOsc) {
        try {
          this.activeJamOsc.stop(this.ctx ? this.ctx.currentTime : 0);
          this.activeJamOsc.disconnect();
        } catch {}
        this.activeJamOsc = null;
      }
      this.activeJamGain = null;
    } catch (e) {}
  }

  // 6. Còi cảnh báo KHAY ĐẦY (Bin Full Warning Buzzer) - 2 tiếng bíp sắc bén lặp lại
  public playBinFullAlarm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.stopBinFullAlarm();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      this.activeBinFullOsc = osc;
      this.activeBinFullGain = gain;

      osc.type = "square";
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.frequency.setValueAtTime(1046.5, now + 0.12);
      osc.frequency.setValueAtTime(1318.5, now + 0.18); // E6
      osc.frequency.setValueAtTime(1318.5, now + 0.32);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.setValueAtTime(0.001, now + 0.13);
      gain.gain.setValueAtTime(0.11, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => {
        if (this.activeBinFullOsc === osc) {
          this.activeBinFullOsc = null;
          this.activeBinFullGain = null;
        }
      };

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {}
  }

  // Kích hoạt còi báo khay đầy liên tục (chu kỳ 1.2s) cho đến khi dọn khay
  public startContinuousBinFullAlarm() {
    if (this.isMuted) return;
    if (this.continuousBinFullInterval) return;

    this.playBinFullAlarm();
    this.continuousBinFullInterval = setInterval(() => {
      if (this.isMuted) {
        this.stopContinuousBinFullAlarm();
        return;
      }
      this.playBinFullAlarm();
    }, 1200);
  }

  // Dập tắt còi báo khay đầy
  public stopContinuousBinFullAlarm() {
    if (this.continuousBinFullInterval) {
      clearInterval(this.continuousBinFullInterval);
      this.continuousBinFullInterval = null;
    }
    this.stopBinFullAlarm();
  }

  public stopBinFullAlarm() {
    try {
      if (this.activeBinFullGain && this.ctx) {
        this.activeBinFullGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.activeBinFullGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.activeBinFullOsc) {
        try {
          this.activeBinFullOsc.stop(this.ctx ? this.ctx.currentTime : 0);
          this.activeBinFullOsc.disconnect();
        } catch {}
        this.activeBinFullOsc = null;
      }
      this.activeBinFullGain = null;
    } catch (e) {}
  }

  // 7. Còi cảnh báo QUÁ NHIỆT ĐỘNG CƠ / CPU (Temperature Warning Buzzer) - 2 âm cảnh báo 740Hz - 880Hz
  public playTemperatureAlarm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.stopTemperatureAlarm();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      this.activeTempOsc = osc;
      this.activeTempGain = gain;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.setValueAtTime(880, now + 0.16);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.001, now + 0.14);
      gain.gain.setValueAtTime(0.12, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => {
        if (this.activeTempOsc === osc) {
          this.activeTempOsc = null;
          this.activeTempGain = null;
        }
      };

      osc.start(now);
      osc.stop(now + 0.39);
    } catch (e) {}
  }

  // Kích hoạt còi cảnh báo quá nhiệt liên tục (chu kỳ 1.5s) cho đến khi hạ nhiệt
  public startContinuousTemperatureAlarm() {
    if (this.isMuted) return;
    if (this.continuousTempInterval) return;

    this.playTemperatureAlarm();
    this.continuousTempInterval = setInterval(() => {
      if (this.isMuted) {
        this.stopContinuousTemperatureAlarm();
        return;
      }
      this.playTemperatureAlarm();
    }, 1500);
  }

  // Dập tắt còi quá nhiệt
  public stopContinuousTemperatureAlarm() {
    if (this.continuousTempInterval) {
      clearInterval(this.continuousTempInterval);
      this.continuousTempInterval = null;
    }
    this.stopTemperatureAlarm();
  }

  public stopTemperatureAlarm() {
    try {
      if (this.activeTempGain && this.ctx) {
        this.activeTempGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.activeTempGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.activeTempOsc) {
        try {
          this.activeTempOsc.stop(this.ctx ? this.ctx.currentTime : 0);
          this.activeTempOsc.disconnect();
        } catch {}
          this.activeTempOsc = null;
      }
      this.activeTempGain = null;
    } catch (e) {}
  }

  // 6. Còi cảnh báo thiết bị vi điều khiển mất kết nối ngoại tuyến
  public playDeviceOfflineAlarm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      this.activeOfflineOsc = osc;

      osc.type = "sawtooth";
      // Âm trầm hạ dần cảnh báo đứt kết nối (520Hz -> 260Hz)
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, this.ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.onended = () => {
        if (this.activeOfflineOsc === osc) {
          this.activeOfflineOsc = null;
        }
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };

      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {}
  }

  public startContinuousDeviceOfflineAlarm() {
    if (this.isMuted) return;
    if (this.continuousOfflineInterval) return;

    this.playDeviceOfflineAlarm();
    this.continuousOfflineInterval = setInterval(() => {
      this.playDeviceOfflineAlarm();
    }, 2500);
  }

  public stopContinuousDeviceOfflineAlarm() {
    if (this.continuousOfflineInterval) {
      clearInterval(this.continuousOfflineInterval);
      this.continuousOfflineInterval = null;
    }
    try {
      if (this.activeOfflineOsc) {
        try {
          this.activeOfflineOsc.stop(this.ctx ? this.ctx.currentTime : 0);
          this.activeOfflineOsc.disconnect();
        } catch {}
        this.activeOfflineOsc = null;
      }
    } catch (e) {}
  }

  // Tắt toàn bộ mọi âm thanh khẩn cấp và cảnh báo đang phát
  public silenceAll() {
    this.stopContinuousEmergencyAlarm();
    this.stopContinuousJamAlarm();
    this.stopContinuousBinFullAlarm();
    this.stopContinuousTemperatureAlarm();
    this.stopContinuousDeviceOfflineAlarm();
  }

  // 7. Tiếng click nút bấm UI
  public playClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {}
  }

  // 9. Chuông thông báo BÁO CÁO CA LÀM VIỆC (Shift Summary Chime) - Hợp âm C5-E5-G5 (523Hz -> 659Hz -> 784Hz)
  public playShiftSummaryChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        const startTime = now + idx * 0.12;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.48);
      });
    } catch (e) {}
  }

  // 10. Âm thanh MẤT KẾT NỐI MQTT BROKER (Double Low Warning Tone)
  public playMqttDisconnectedAlarm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [0, 0.18].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(520, now + offset);
        osc.frequency.exponentialRampToValueAtTime(260, now + offset + 0.14);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch (e) {}
  }

  // 11. Âm thanh PHỤC HỒI KẾT NỐI MQTT THÀNH CÔNG (Upward Chime D5 -> A5)
  public playMqttReconnectedChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const freqs = [587.33, 880.0]; // D5, A5

      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        const startTime = now + idx * 0.14;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.42);
      });
    } catch (e) {}
  }
}

export const industrialAudio = new IndustrialAudioService();

