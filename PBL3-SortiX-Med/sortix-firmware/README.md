# SortiX Firmware (ESP-IDF v5.5.x)
### Vi điều khiển: ESP32-C5 RISC-V 32-bit Single-Core @ 240 MHz (WeAct Studio ESP32-C5-A-N8R8)

---

## 1. Giới Thiệu
Mã nguồn firmware điều khiển hệ thống băng tải phân loại dụng cụ y tế tự động SortiX. Firmware kết nối với trạm AI thị giác máy tính (**YOLO11** chạy trên PC trong thư mục `PBL.v1i.yolov11`) và ứng dụng điều khiển trung tâm **SortiX-Dashboard** thông qua giao thức **MQTT** và **HTTP REST**.

---

## 2. Toàn Bộ Cấu Trúc Thư Mục & Vai Trò Từng Thành Phần

```text
sortix-firmware/
├── CMakeLists.txt                          # CMake project gốc, kết nối toolchain ESP-IDF
├── sdkconfig.defaults                      # Cấu hình cứng target esp32c5, Flash 8MB, PSRAM 8MB
├── partitions.csv                          # Bảng phân vùng Flash 8MB (NVS, Otadata, OTA_0, OTA_1, Storage)
├── README.md                               # Sổ tay kiến trúc, pinout, hướng dẫn build firmware
│
├── main/                                   # THƯ MỤC CHA 1: Ứng dụng chính & Định nghĩa lõi
│   ├── CMakeLists.txt                      # Đăng ký main.c và khai báo các component phụ thuộc
│   ├── idf_component.yml                   # Khai báo dependency cJSON (espressif/cjson)
│   ├── Kconfig.projbuild                   # Cấu hình menu tương tác menuconfig (Wi-Fi, MQTT, timeout)
│   ├── main.c                              # Khởi tạo app_main(), các FreeRTOS Tasks & đăng ký Callbacks
│   ├── app_config.h                        # Macro cấu hình toàn hệ thống, MQTT topics, HTTP endpoint
│   ├── pin_definitions.h                   # Sơ đồ gán chân GPIO chuẩn hóa theo BOM danh-sach-linh-kien.md
│   └── version.h                           # Định nghĩa thông tin phiên bản firmware v1.0.0
│
├── components/                             # THƯ MỤC CHA 2: Các module chức năng độc lập (14 components)
│   ├── motor_control/                      # Điều khiển động cơ DC qua L298N (IN1: GPIO8, IN2: GPIO9)
│   │   ├── include/motor_control.h         # Header: forward, reverse, dynamic brake, coast/stop
│   │   ├── motor_control.c                 # Code thực thi: Mutex bảo vệ trạng thái, ghi mức GPIO
│   │   └── CMakeLists.txt
│   │
│   ├── encoder/                            # Đọc encoder 2 pha dùng New PCNT Driver (driver/pulse_cnt.h)
│   │   ├── include/encoder.h               # Header: đọc count 64-bit, reset, quy đổi counts <-> mm
│   │   ├── encoder.c                       # Code thực thi: Quadrature x4, bộ lọc nhiễu 1us, watchpoint overflow
│   │   └── CMakeLists.txt
│   │
│   ├── servo/                              # Điều khiển 2 servo MG996R non-blocking qua LEDC PWM (GPIO6, GPIO7)
│   │   ├── include/servo.h                 # Header: trigger non-blocking, reset, đọc FSM state
│   │   ├── servo.c                         # Code thực thi: FSM (IDLE->OPENING->HOLDING->CLOSING->IDLE) qua esp_timer
│   │   └── CMakeLists.txt
│   │
│   ├── sensors/                            # Quản lý cảm biến quang và cảm biến ánh sáng
│   │   ├── include/sensors.h               # Header: ngắt S1 chốt xung encoder và timestamp, đọc LDR
│   │   ├── sensors.c                       # Code thực thi: Ngắt cạnh xuống GPIO0, debounce 80ms, đọc DO GPIO5
│   │   └── CMakeLists.txt
│   │
│   ├── button/                             # Nút nhấn Start vật lý (GPIO23)
│   │   ├── include/button.h                # Header: callback khi nhấn nút Start
│   │   ├── button.c                        # Code thực thi: Ngắt cạnh xuống GPIO23 kèm timer debounce 20ms
│   │   └── CMakeLists.txt
│   │
│   ├── led_indicator/                      # Đèn LED trạng thái màu xanh lá (GPIO10)
│   │   ├── include/led_indicator.h         # Header: chế độ OFF, IDLE (1Hz), RUNNING (ON), JAMMED (5Hz)
│   │   ├── led_indicator.c                 # Code thực thi: Quản lý nhấp nháy qua software timer 100ms
│   │   └── CMakeLists.txt
│   │
│   ├── wifi_manager/                       # Quản lý kết nối Wi-Fi Station & SoftAP Fallback
│   │   ├── include/wifi_manager.h          # Header: kiểm tra trạng thái, đọc RSSI, lấy chuỗi IP và Band
│   │   ├── wifi_manager.c                  # Code thực thi: Tự động kết nối lại, nhận diện 2.4GHz / 5GHz Wi-Fi 6
│   │   └── CMakeLists.txt
│   │
│   ├── mqtt_handler/                       # MQTT Client đồng bộ 100% schemas & topics SortiX-Dashboard
│   │   ├── include/mqtt_handler.h          # Header: publish telemetry, heartbeat, classification, jam, temp
│   │   ├── mqtt_handler.c                  # Code thực thi: Subscribe vision, control, config/set, backoff reconnect
│   │   └── CMakeLists.txt
│   │
│   ├── http_telemetry/                     # Gửi HTTP POST telemetry lên backend Node.js port 5000
│   │   ├── include/http_telemetry.h        # Header: gửi payload định kỳ 5s
│   │   ├── http_telemetry.c                # Code thực thi: Đóng gói JSON (tuyệt đối không gửi optical_sensor)
│   │   └── CMakeLists.txt
│   │
│   ├── sorting_engine/                     # Trọng tâm điều khiển logic phân loại
│   │   ├── include/sorting_engine.h        # Header: queue 15 phôi, matching FIFO, apply config động
│   │   ├── sorting_engine.c                # Code thực thi: Tính cự ly encoder, kích hoạt servo, fallback timeout
│   │   └── CMakeLists.txt
│   │
│   ├── state_machine/                      # Quản lý trạng thái hệ thống
│   │   ├── include/state_machine.h         # Header: SYSTEM_STATE_IDLE, RUNNING, STOPPED, JAMMED
│   │   ├── state_machine.c                 # Code thực thi: Chuyển trạng thái, khóa an toàn E-Stop, an toàn boot
│   │   └── CMakeLists.txt
│   │
│   ├── safety_monitor/                     # Giám sát an toàn kẹt cơ khí & nhiệt độ SoC
│   │   ├── include/safety_monitor.h        # Header: callback kẹt phôi, callback cảnh báo nhiệt
│   │   ├── safety_monitor.c                # Code thực thi: Encoder stall detection (>1.8s) & driver/temperature_sensor.h
│   │   └── CMakeLists.txt
│   │
│   ├── nvs_config/                         # Lưu trữ cấu hình bền vững vào NVS Flash
│   │   ├── include/nvs_config.h            # Header: struct sys_config, load, save, factory reset
│   │   ├── include/app_config.h            # Header dùng chung các topics và tham số hệ thống
│   │   ├── nvs_config.c                    # Code thực thi: Ghi đọc NVS namespace sortix_cfg
│   │   └── CMakeLists.txt
│   │
│   └── captive_portal/                     # Cấu hình Wi-Fi/MQTT qua trang Web SoftAP nội bộ
│       ├── include/captive_portal.h        # Header: start, stop HTTP server port 80
│       ├── captive_portal.c                # Code thực thi: Giao diện web HTML, nhận form POST và lưu NVS
│       └── CMakeLists.txt
│
└── test/                                   # THƯ MỤC CHA 3: Unit Tests với Unity Test Framework
    ├── CMakeLists.txt                      # Cấu hình biên dịch runner test
    ├── test_encoder.c                      # Kiểm thử quy đổi xung - mm và xử lý overflow
    ├── test_sorting_engine.c               # Kiểm thử ring buffer FIFO, vision matching, dynamic config
    └── test_state_machine.c                # Kiểm thử an toàn khởi động IDLE, E-Stop release
```

---

## 3. Bảng Phân Bổ GPIO Chuẩn (Đối chiếu BOM danh-sach-linh-kien.md)

| Chức năng                   | GPIO       | Vị trí Header WeAct | Chế độ / Cấu hình                 |
|-----------------------------|------------|---------------------|-----------------------------------|
| Cảm biến vật cản IR (S1)    | **GPIO0**  | Trái Pin 5          | Input, Pull-up, Falling Edge ISR  |
| Encoder Kênh A (Xung)       | **GPIO1**  | Trái Pin 6          | PCNT Pulse Counter (Edge Input)   |
| Encoder Kênh B (Chiều)      | **GPIO4**  | Phải Pin 8          | PCNT Pulse Counter (Level Input)  |
| Cảm biến quang trở LDR (DO) | **GPIO5**  | Phải Pin 9          | Input Digital                     |
| Servo 1 - PWM (Gạt 1)       | **GPIO6**  | Trái Pin 7          | LEDC PWM 50Hz (Timer 0, Ch 0)     |
| Driver L298N IN1            | **GPIO8**  | Trái Pin 9          | Output (FWD=1, REV=0, BRAKE=1)    |
| Driver L298N IN2            | **GPIO9**  | Trái Pin 10         | Output (FWD=0, REV=1, BRAKE=1)    |
| LED trạng thái (Xanh lá)    | **GPIO10** | Trái Pin 11         | Output, 100ms Software Timer      |
| Nút Start vật lý            | **GPIO23** | Phải Pin 5          | Input Pull-up, Debounce RC + 20ms |
| Servo 2 - PWM (Gạt 2)       | **GPIO7**  | Trái Pin 8          | LEDC PWM 50Hz (Timer 0, Ch 1)     |

### ⚠ CÁC CHÂN CẤM SỬ DỤNG (FORBIDDEN GPIOs):
- **GPIO15 (SPICS1):** Đã nối cứng nội bộ với IC PSRAM 8MB Quad SPI bên trong nắp shield kim loại.
- **GPIO13 / GPIO14:** Cổng USB Native (D- / D+) dùng nạp code, JTAG và USB-CDC Debug.
- **GPIO11 / GPIO12:** Cổng UART0 Console (TX0 / RX0 qua chip CH343).
- **GPIO26 / GPIO27 / GPIO28:** Chân cấu hình khởi động (Strapping Pins), RGB LED và nút BOOT onboard.

---

## 4. Bảng Tra Cứu MQTT Topics (Đồng Bộ 100% Với SortiX-Dashboard)

| Nhóm | Topic MQTT | Hướng truyền | Mục đích / Payload |
|---|---|:---:|---|
| **Vision AI** | `sorter/sorter_01/vision` | Trạm AI -> Firmware | Nhận diện kết quả phân loại: `{ item_id, brand, confidence, timestamp }` |
| **Điều khiển** | `sorter/sorter_01/control` | Dashboard -> Firmware | Lệnh vận hành: `{ command: "START" \| "STOP" \| "RESET", auth_token }` |
| **Cấu hình** | `sorter/sorter_01/config/set` | Dashboard -> Firmware | Cập nhật cấu hình phân loại: `{ version, bins, apply_mode, auth_token }` |
| **Trạng thái cấu hình** | `sorter/sorter_01/config/status` | Firmware -> Dashboard | Phản hồi xác nhận cấu hình: `{ version, status: "APPLIED", timestamp }` |
| **Telemetry** | `sorter/sorter_01/telemetry` | Firmware -> Dashboard | Trạng thái định kỳ 1.5s: `{ state, speed, encoder_count, current_temp }` |
| **Trạng thái máy** | `sorter/sorter_01/status` | Firmware -> Dashboard | Trạng thái máy tức thời: `{ state: "IDLE" \| "RUNNING" \| "JAMMED", uptime }` |
| **Phân loại** | `sorter/sorter_01/classification` | Firmware -> Dashboard | Báo cáo phân loại hoàn tất: `{ item_id, routed_bin, brand, status }` |
| **Heartbeat** | `conveyor/heartbeat` | Firmware -> Dashboard | Nhịp tim định kỳ 2.0s để Watchdog giám sát sống còn |
| **Kẹt phôi** | `conveyor/sensor/jam` | Firmware -> Dashboard | Cảnh báo kẹt động cơ / cơ cấu băng tải (>1.8s không xung) |
| **Nhiệt SoC** | `conveyor/telemetry/temp` | Firmware -> Dashboard | Cảnh báo nhiệt độ chip vượt ngưỡng an toàn (>75°C) |
| **Dừng khẩn cấp** | `conveyor/safety/estop` | Dashboard -> Firmware | Lệnh dừng khẩn cấp: `{ event: "estop", auth_token, reason }` |
| **ACK Dừng khẩn** | `conveyor/safety/estop/ack` | Firmware -> Dashboard | Xác nhận dừng an toàn: `{ event: "estop_ack", state: "SYSTEM_STATE_ESTOP" }` |
| **Giải phóng E-Stop** | `conveyor/safety/estop/release` | Dashboard -> Firmware | Lệnh giải phóng E-Stop: `{ event: "estop_release", auth_token }` |

---

## 5. Kiến Trúc Nhiệm Vụ FreeRTOS & An Toàn

1. **`task_conveyor` (Priority 6):**
   - Quản lý điều khiển cầu H L298N (Tiến, Lùi, Thắng động cơ, Thả trôi).
   - Đọc bộ đếm xung phần cứng từ New PCNT Driver (`driver/pulse_cnt.h`).
   - Giám sát hiện tượng kẹt cơ khí (Encoder Stall): Khi động cơ đang chạy, nếu xung encoder không thay đổi quá 1.8s (ngoài thời gian ân hạn khởi động 1.0s), hệ thống kích hoạt phanh động cơ ngay lập tức và chuyển sang trạng thái `JAMMED`.
2. **`task_sorting` (Priority 5):**
   - Quản lý bộ đệm xoay vòng FIFO (Tracking Queue) tối đa 15 vật thể trên băng tải.
   - Nhận ngắt từ S1 (GPIO0) kèm giá trị xung encoder và timestamp vi giây.
   - Ghép cặp kết quả Vision AI từ MQTT (`sorter/sorter_01/vision`) theo thứ tự FIFO.
   - Điều khiển Servo 1 (GPIO6) và Servo 2 (GPIO7) qua FSM Non-blocking (`IDLE -> OPENING -> HOLDING -> CLOSING -> IDLE`).
   - Áp dụng `PAUSE_AND_HOLD` hoặc `DIVERT_TO_DEFAULT`; bản ghi có `routed_bin` để thống kê hướng firmware đã điều khiển, còn `actual_bin: 0` và trạng thái `unverified` nếu chưa có cảm biến xác nhận phôi vào khay.
3. **`task_mqtt` (Priority 4):**
   - Quản lý kết nối MQTT Client với cơ chế tự động kết nối lại (exponential backoff: 3s, 5s, 10s, 30s).
   - Publish định kỳ Telemetry (1.5s), Heartbeat (2.0s), trạng thái hệ thống, kết quả phân loại, cảnh báo kẹt và cảnh báo nhiệt SoC.
4. **`task_http_tele` (Priority 2):**
   - Gửi HTTPS POST định kỳ 5s lên backend Node.js khi đã provision endpoint và Device API Token (`https://<DASHBOARD_HOST>/api/telemetry`).
   - Tuyệt đối không gửi trường `optical_sensor` để tránh xung đột với logic tự động dừng của backend.
5. **`task_safety` (Priority 5):**
   - Đọc cảm biến nhiệt độ nội chip SoC ESP32-C5 qua `driver/temperature_sensor.h` (chu kỳ 2s). Cảnh báo lên MQTT khi nhiệt độ chip vượt 75°C.
   - Tự động bật SoftAP + Captive Portal khi không có cấu hình MQTT hợp lệ lúc khởi động hoặc Wi-Fi mất kết nối kéo dài (>10s).

---

## 6. Hướng Dẫn Cấu Hình, Build & Nạp Code

### 6.1 Kích hoạt môi trường ESP-IDF (PowerShell)
```powershell
. "C:\Espressif\tools\Microsoft.v5.5.4.PowerShell_profile.ps1"
```

### 6.2 Thiết lập Target ESP32-C5
```powershell
cd d:\PBL3_NHOM5\sortix-firmware
idf.py set-target esp32c5
```

### 6.3 Provisioning cấu hình thiết bị
Cấu hình Wi-Fi, MQTT và token được provision qua Captive Portal; firmware không chứa SSID/password Wi-Fi, MQTT URI, Control Secret hoặc API token mặc định. Khi chưa có cấu hình MQTT hợp lệ, thiết bị bật SoftAP với SSID `SortiX-Setup-<đuôi MAC>` và mật khẩu ngẫu nhiên 16 ký tự. Lấy mật khẩu từ console serial cục bộ, kết nối SoftAP rồi mở `http://192.168.4.1`.

Điền các trường sau:
- Wi-Fi Station SSID và password. Đánh dấu tùy chọn mạng không mật khẩu nếu dùng Wi-Fi mở.
- MQTT URI có TLS: `mqtts://<broker>:8883` hoặc `wss://<broker>:443`. Firmware từ chối `mqtt://` và `ws://` không mã hóa khi triển khai thực tế.
- MQTT username/password của broker nếu broker yêu cầu.
- `Control Secret` dài 16–63 ký tự, phải khớp `SORTIX_CONTROL_SECRET` của Dashboard/backend. Lệnh `START`, `STOP`, `ESTOP`, mở khóa và cấu hình sorter đều phải mang token này. Producer Vision bên ngoài (YOLO11) cũng phải gửi `auth_token` khớp với secret.
- Nếu bật telemetry HTTP, dùng URL `https://...` và một `Device API Token` riêng, khớp `DEVICE_TOKEN` hoặc `SORTIX_DEVICE_TOKEN` ở backend. Firmware gửi token trong header `X-Device-Token`; để trống URL để tắt luồng HTTP telemetry.

Thông số hiệu chuẩn có thể cập nhật trong cấu hình/NVS:
- Chính sách an toàn khi quá hạn nhận diện Vision AI (`PAUSE_AND_HOLD` dừng băng tải an toàn hoặc `DIVERT_TO_DEFAULT`).
- Khoảng cách hiệu chuẩn trạm phân loại lưu trong NVS (`dist_s1_servo1_mm`, `dist_s1_servo2_mm`, `dist_s1_end_mm`) và `counts_per_mm`.

### 6.4 Biên dịch (Build)
```powershell
idf.py build
```

### 6.5 Nạp Firmware & Mở Console Monitor
```powershell
idf.py -p COM5 flash monitor
```
*(Thay `COM5` bằng cổng COM thực tế của bo WeAct trên máy tính).*

---

## 7. Giao Thức E-Stop & Mở Khóa An Toàn

1. **E-Stop Vật Lý (Hard-wired Emergency Stop):**
   - Thiết kế mạch E-Stop phần cứng ngắt nguồn động cơ 12V trước tiếp điểm contactor/rơ-le, độc lập với MCU, mạng và phần mềm.
   - Khi E-Stop ngắt nguồn, toàn bộ cơ cấu chấp hành mất điện tức thời.
   - Khi cấp điện trở lại, hệ thống luôn khởi động về trạng thái `SYSTEM_STATE_IDLE` an toàn, chờ lệnh `START` có chủ đích của con người.

2. **Giao Thức E-Stop Phần Mềm & ACK Phần Cứng:**
   - Firmware chỉ chấp nhận E-Stop MQTT có `auth_token` hợp lệ; lệnh từ topic điều khiển dùng cùng cơ chế xác thực.
   - Khi nhận E-Stop, firmware chốt `SYSTEM_STATE_ESTOP`, yêu cầu phanh động cơ và đưa duty điều khiển servo về 0. 
   - Hàm `mqtt_handler_publish_estop_ack()` sẽ phát ACK lên topic `conveyor/safety/estop/ack` để báo trạng thái đã dừng an toàn cho Dashboard.

3. **Luồng Mở Khóa An Toàn (ESTOP_RELEASE):**
   - Chỉ tài khoản Quản trị viên (Admin) được phép kích hoạt mở khóa từ Dashboard, bắt buộc phải nhập ghi chú hiện trường.
   - Dashboard gửi lệnh `ESTOP_RELEASE` kèm trường xác thực `auth_token` tới firmware.
   - Firmware xác minh `auth_token` khớp với `control_secret` lưu trong NVS trước khi xử lý.
   - Khi mở khóa thành công, firmware chỉ chuyển về `SYSTEM_STATE_IDLE` nếu GPIO dừng động cơ được đặt thành công; hệ thống **không tự khởi động lại động cơ**.
   - Nếu còn vật phẩm chưa được xử lý trên băng tải (`sorting_engine_has_unresolved_items()`), hệ thống chặn lệnh START cho đến khi người vận hành xác nhận giải phóng vật thể an toàn.
