# SortiX-Med: Hệ Thống Băng Tải Phân Loại Dụng Cụ Y Tế Tự Động
### Edge AI & Biomedical IoT Sorting System (ESP32-C5 RISC-V + Next.js Dashboard + YOLO11)
**GitHub Repository:** [duyphong375/PBL3-SortiX-Med](https://github.com/duyphong375/PBL3-SortiX-Med)

---

## 1. Tổng Quan Toàn Bộ Dự Án

Hệ thống **SortiX-Med** là giải pháp phân loại tự động dụng cụ y tế và chất thải y tế tại nguồn nhằm nâng cao an toàn sinh học, giảm thiểu rủi ro tai nạn nghề nghiệp cho nhân viên y tế (vết thương do vật sắc nhọn) và tối ưu quy trình xử lý tiệt trùng Autoclave trong bệnh viện. 

Hệ thống là sự kết hợp chặt chẽ giữa 3 phân hệ cốt lõi:
1. **Phần cứng nhúng thời gian thực (sortix-firmware):** Vi điều khiển **ESP32-C5** (RISC-V 32-bit @ 240 MHz, Dual-Band Wi-Fi 6, 8 MB Flash + 8 MB PSRAM) điều khiển động cơ DC qua driver L298N, giải mã xung encoder qua New PCNT Hardware Counter, điều khiển 2 cơ cấu servo gạt phôi non-blocking (LEDC PWM) và giám sát an toàn đa tầng (E-Stop, kẹt phôi, quá nhiệt SoC).
2. **Trạm thị giác máy tính biên (PBL.v1i.yolov11):** Camera USB / Webcam kết hợp mô hình AI **YOLO11** (Ultralytics) nhận diện và phân loại dụng cụ y tế với độ trễ thấp, truyền kết quả phân loại thời gian thực qua giao thức MQTT.
3. **Bảng điều khiển trung tâm & Giám sát SCADA (SortiX-Dashboard):** Ứng dụng Next.js 14 App Router kết hợp máy chủ Node.js độc lập (`node:http`), tích hợp trợ lý **AI Copilot Google Gemini 3.5 Flash Lite**, **Telegram Bot Gateway 2 chiều** (`@SortiX_Med_Bot`), giao diện SCADA Kiosk toàn màn hình Fit-Screen (zero-scroll) và hỗ trợ đa nền tảng (Web, Android APK & iOS PWA).

```
                   ┌────────────────────────────────────────┐
                   │    Webcam USB 2K / Camera AI (PC)      │
                   └───────────────────┬────────────────────┘
                                       │ (Hình ảnh vật thể)
                                       ▼
                   ┌────────────────────────────────────────┐
                   │     PC Edge AI Station (YOLO11)        │
                   │  (PBL.v1i.yolov11 / test_yolo.py)      │
                   └───────────────────┬────────────────────┘
                                       │ MQTT: sorter/sorter_01/vision
                                       ▼
┌───────────────────────────┐      MQTT / HTTP       ┌───────────────────────────┐
│     SortiX-Dashboard      │ ◄────────────────────► │      sortix-firmware      │
│  (Next.js 14 + Node.js)   │  Port 1883 / Port 5000 │ (ESP32-C5 RISC-V @ 240MHz)│
└───────────────────────────┘                        └─────────────┬─────────────┘
                                                                   │ GPIO / PCNT / PWM
                                                                   ▼
                                                     ┌───────────────────────────┐
                                                     │     Băng Tải Cơ Khí       │
                                                     │ (L298N, Encoder, 2x Servos│
                                                     │  IR S1, LDR, E-Stop 12V)  │
                                                     └───────────────────────────┘
```

---

## 2. Toàn Bộ Cấu Trúc Dự Án Của Từng Folder Cha

Dự án được tổ chức khoa học theo mô hình đa tầng (multi-tier system) với các thư mục chuyên biệt:

```text
d:/PBL3_NHOM5/
│
├── sortix-firmware/                        # [FOLDER CHA 1] MÃ NGUỒN NHÚNG ESP-IDF v5.5.x
│   ├── CMakeLists.txt                      # Cấu hình build cấp cao nhất cho firmware
│   ├── sdkconfig.defaults                  # Cấu hình target esp32c5, PSRAM 8MB, Flash 8MB
│   ├── partitions.csv                      # Bảng phân vùng bộ nhớ Flash (NVS, Otadata, OTA_0, OTA_1, Storage)
│   ├── README.md                           # Sổ tay kiến trúc, pinout, hướng dẫn build firmware
│   │
│   ├── main/                               # Entrypoint và cấu hình cốt lõi
│   │   ├── CMakeLists.txt                  # Khai báo source file và liên kết module
│   │   ├── idf_component.yml               # Quản lý thư viện bên ngoài (espressif/cjson)
│   │   ├── Kconfig.projbuild               # Giao diện menuconfig cấu hình Wi-Fi, MQTT, timeout
│   │   ├── main.c                          # Khởi tạo app_main, 5 FreeRTOS Tasks và các ngắt
│   │   ├── app_config.h                    # Định nghĩa topic MQTT, schema, địa chỉ server, hằng số cơ khí
│   │   ├── pin_definitions.h               # Sơ đồ gán chân GPIO chuẩn hóa cho bo WeAct ESP32-C5
│   │   └── version.h                       # Định nghĩa phiên bản firmware v1.0.0
│   │
│   ├── components/                         # 14 module nhúng độc lập (Loose Coupling)
│   │   ├── motor_control/                  # Điều khiển động cơ DC qua L298N (IN1: GPIO8, IN2: GPIO9)
│   │   ├── encoder/                        # Bộ đếm xung New PCNT quadrature x4 (Kênh A: GPIO1, Kênh B: GPIO4)
│   │   ├── servo/                          # Điều khiển 2 Servo MG996R non-blocking qua LEDC PWM (GPIO6, GPIO7)
│   │   ├── sensors/                        # Ngắt IR S1 (GPIO0) và đọc quang trở LDR (GPIO5)
│   │   ├── button/                         # Ngắt nút nhấn Start vật lý (GPIO23) + debounce 20ms
│   │   ├── led_indicator/                  # Quản lý hiệu ứng LED xanh trạng thái (GPIO10) qua timer 100ms
│   │   ├── wifi_manager/                   # Kết nối Wi-Fi Station (2.4GHz & 5GHz Wi-Fi 6), tự động chuyển SoftAP
│   │   ├── mqtt_handler/                   # Client MQTT đồng bộ 100% schemas & topics với SortiX-Dashboard
│   │   ├── http_telemetry/                 # Gửi HTTP POST telemetry định kỳ 5s lên backend port 5000
│   │   ├── sorting_engine/                 # Tracking queue 15 phôi, ghép cặp Vision FIFO, gán khay động
│   │   ├── state_machine/                  # Máy trạng thái hệ thống: IDLE, RUNNING, STOPPED, JAMMED
│   │   ├── safety_monitor/                 # Phát hiện kẹt cơ khí (Encoder Stall) & đo nhiệt SoC nội chip
│   │   ├── nvs_config/                     # Quản lý đọc/ghi cấu hình bền vững vào bộ nhớ Flash NVS
│   │   └── captive_portal/                 # Web server nội bộ (port 80) cấu hình Wi-Fi/MQTT qua SoftAP
│   │
│   └── test/                               # Thư mục kiểm thử phần mềm tự động (Unity Framework)
│       ├── CMakeLists.txt                  # Cấu hình biên dịch runner test
│       ├── test_encoder.c                  # Test đơn vị chuyển đổi xung sang mm và chống tràn
│       ├── test_sorting_engine.c           # Test đơn vị ring buffer FIFO, vision matching, dynamic config
│       └── test_state_machine.c            # Test đơn vị an toàn khởi động IDLE, E-Stop release
│
├── SortiX-Dashboard/                       # [FOLDER CHA 2] GIAO DIỆN WEB & BACKEND SERVER TẬP TRUNG
│   ├── backend/                            # Native HTTP server (Node.js, TypeScript) port 5000
│   │   ├── database/                       # Migrations và Seeds tham chiếu (PostgreSQL, MySQL, SQLite, MongoDB)
│   │   └── src/                            # server.ts, controllers, routes, middlewares, services, models
│   ├── frontend/                           # Giao diện Next.js 14 App Router, Tailwind CSS, Lucide icons
│   │   ├── src/app/                        # Dashboard thời gian thực, Giám sát băng tải, Lịch sử, Cấu hình, Users
│   │   ├── src/components/                 # layout, overview, conveyor, ui, users, widgets, AiCopilot
│   │   └── capacitor.config.ts             # Cấu hình Capacitor 8 đóng gói Android APK & iOS PWA
│   ├── shared/                             # Thư viện dùng chung giữa Frontend, Backend và Firmware
│   │   ├── schemas/                        # Zod schemas (TelemetrySchema, ClassificationRecordSchema, v.v.)
│   │   ├── constants/                      # Hằng số topics MQTT, định danh khay phân loại mặc định
│   │   └── types/                          # TypeScript interfaces dùng chung
│   ├── data/                               # Bộ lưu trữ JSON runtime bền vững (history, notifications, sync_state, users)
│   ├── scripts/                            # dev-all.cjs, telegram-poller.cjs, e2e.cjs, free-port.cjs
│   ├── tests/                              # Bộ kiểm thử 26 test suites tự động (175/175 unit tests)
│   ├── docs/                               # architecture.md, api.md
│   ├── package.json                        # Monorepo workspaces cấu hình dependencies & scripts
│   └── vercel.json                         # Cấu hình triển khai tự động lên Vercel
│
├── PBL.v1i.yolov11/                        # [FOLDER CHA 3] TRẠM THỊ GIÁC AI (YOLO11 - Dữ liệu thử nghiệm / Pilot Train)
│   ├── data.yaml                           # Cấu hình tập dữ liệu thử nghiệm (2 nhãn: HH, T)
│   ├── README.md                           # Sổ tay kiến trúc, lưu ý về dataset thử nghiệm & hướng dẫn chạy
│   ├── test_yolo.py                        # Script Python đa năng: Train, Val, Predict thư mục, Real-time Webcam
│   ├── yolo11n.pt                          # Trọng số mô hình cơ sở YOLO11 Nano từ Ultralytics
│   ├── train/                              # Tập ảnh và nhãn huấn luyện thử nghiệm
│   ├── valid/                              # Tập ảnh và nhãn kiểm định thử nghiệm
│   ├── test/                               # Tập ảnh và nhãn kiểm thử độc lập
│   └── runs/                               # Kết quả thực nghiệm tập dượt và best.pt
│
├── danh-sach-linh-kien.md                  # [TÀI LIỆU PHẦN CỨNG 1] BOM linh kiện, đặc tính điện, contact rating, bảo vệ nguồn
├── ESP32-C5-WROOM-1-thong-tin-pinout.md    # [TÀI LIỆU PHẦN CỨNG 2] Thuyết minh chi tiết các chân rào J6/J7 bo WeAct
├── huong-dan-backup-git.md                 # [TÀI LIỆU QUY TRÌNH] Cẩm nang quản lý Git, chiến lược backup & workflow nhóm
├── ESP32-C5-Pinout.png                     # [HÌNH ẢNH PHẦN CỨNG] Sơ đồ trực quan pinout chân vi điều khiển
├── ESP32-C5-WROOM-1.PDF                    # [DATASHEET CHÍNH THỨC] Tài liệu kỹ thuật SoC ESP32-C5 từ Espressif
└── vercel.json                             # Cấu hình root triển khai monorepo lên Vercel
```

---

## 3. Vai Trò Chi Tiết Của Từng Folder Cha

### 3.1. Thư mục `sortix-firmware/`
- **Mục đích:** Chịu trách nhiệm vận hành thời gian thực nghiêm ngặt (Hard Real-Time) của toàn bộ cơ cấu chấp hành cơ khí.
- **Nền tảng:** ESP-IDF v5.5.x, chuẩn C11, target `esp32c5`.
- **Cơ chế hoạt động:**
  - `task_conveyor` (Priority 6): Đọc xung bộ đếm phần cứng PCNT từ encoder motor, phát hiện kẹt cơ khí (Encoder Stall) khi motor quay nhưng trục không chuyển động trong 1.8s.
  - `task_sorting` (Priority 5): Quản lý Tracking Ring Buffer (tối đa 15 phôi trên băng tải). Khi vật cản đi qua cảm biến IR S1 (GPIO0), ngắt cạnh xuống kích hoạt chốt xung encoder và timestamp. Khi có kết quả Vision AI từ MQTT, phôi được ghép cặp FIFO và tính toán cự ly để kích hoạt Servo 1 (GPIO6) hoặc Servo 2 (GPIO7) theo FSM non-blocking.
  - `task_mqtt` (Priority 4): Gửi định kỳ Telemetry (1.5s), Heartbeat (2.0s), kết quả phân loại (`classification`), cảnh báo kẹt (`conveyor/sensor/jam`) và nhiệt SoC (`conveyor/telemetry/temp`).
  - `task_http_tele` (Priority 2): Định kỳ 5s gửi dữ liệu HTTP POST lên Backend Node.js port 5000 (`/api/telemetry`).
  - `task_safety` (Priority 5): Giám sát nhiệt độ lõi chip qua cảm biến nhiệt nội (`driver/temperature_sensor.h`) và quản lý watchdog.

### 3.2. Thư mục `SortiX-Dashboard/`
- **Mục đích:** Bảng điều khiển trung tâm dành cho người vận hành y tế, điều dưỡng và kỹ sư bảo trì.
- **Tính năng nổi bật:**
  - **Giám sát thời gian thực 60fps**: Trực quan hóa băng chuyền phân loại 4 nhóm dụng cụ y tế (Bơm tiêm / Dao mổ, Kẹp Pean, Kéo mổ, Ống nghiệm) theo 3 khay chứa y tế chuyên dụng.
  - **Trợ lý AI Copilot 2 Chiều & Telegram Bot Gateway**: Tích hợp mô hình Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) độ trễ cực thấp (~1s) trực tiếp qua API v1beta. Hỗ trợ hỏi đáp thông minh và điều khiển SCADA từ xa qua Telegram Bot (`@SortiX_Med_Bot`) với bàn phím Inline Keyboard an toàn (`/status`, `/temp`, `/estop`, `/start`, `/stop`, `/clear_bin`).
  - **Giao diện SCADA Kiosk & Fit Màn Hình**: Hỗ trợ chuyển đổi mật độ hiển thị (Display Density: Compact / Comfortable) và chế độ toàn màn hình F11 Kiosk không cuộn trang (zero-scroll).
  - **Báo cáo 1 ngày làm việc (Shift Summary)**: Tự động tổng kết sản lượng phân loại, tỷ lệ đạt/lỗi, xuất báo cáo UTF-8 BOM CSV và PDF đạt chuẩn y tế.
  - **Hệ thống an toàn công nghiệp**: Dừng khẩn cấp E-Stop, cảnh báo kẹt phôi, đầy khay, quá nhiệt và tự động phát hiện mất kết nối MQTT.

### 3.3. Thư mục `PBL.v1i.yolov11/`
- **Mục đích:** Trạm thị giác máy tính biên (Edge AI Computer Vision) thực hiện nhận diện và phân loại thời gian thực hình ảnh dụng cụ y tế đi qua buồng quét camera.
- **Trạng thái dữ liệu hiện tại:** Dữ liệu trong thư mục này hiện là **bộ dữ liệu thử nghiệm nội bộ (Pilot / Trial Training Data)** dùng để tập dượt huấn luyện, kiểm thử script và kiểm chứng luồng truyền thông MQTT với ESP32-C5 / Dashboard. **Chưa phải là bộ mẫu vật y tế chính thức** của đề tài (bộ mẫu vật đầy đủ 4 nhóm sẽ được gán nhãn và tích hợp ở giai đoạn tiếp theo).
- **Nền tảng:** Python 3.10+, PyTorch, Ultralytics YOLO11 (Kiến trúc C3k2, SPPF và C2PSA cải tiến).
- **Cơ chế hoạt động:**
  - Camera USB / Webcam 2K thu nhận luồng hình ảnh phía trên cảm biến IR S1 và buồng chiếu sáng LDR.
  - Script `test_yolo.py` cung cấp 4 chế độ:
    1. Huấn luyện (Train) mô hình thử nghiệm với dataset hiện có.
    2. Đánh giá chất lượng mô hình (Validation / mAP50, mAP50-95).
    3. Dự đoán hàng loạt trên thư mục ảnh (`test/images/`).
    4. Nhận diện trực tiếp theo thời gian thực từ Webcam (Webcam Inference) và đẩy kết quả sang MQTT topic `sorter/sorter_01/vision`.

### 3.4. Các tài liệu phần cứng & quy trình
- `danh-sach-linh-kien.md`: Chuẩn hóa phần cứng, phân tích tải nguồn (12V nguồn chính, 5V buck XL4015, 3.3V bo WeAct).
- `ESP32-C5-WROOM-1-thong-tin-pinout.md`: Thuyết minh chi tiết các chân rào J6/J7 bo WeAct và bảo vệ các chân cấm (GPIO15 PSRAM, GPIO13/14 USB, GPIO11/12 UART0, GPIO26/27/28 Strapping).
- `huong-dan-backup-git.md`: Cẩm nang quản trị Git, chiến lược backup nhiều lớp và quy trình phối hợp nhóm không xung đột.

---

## 4. Hướng Dẫn Vận Hành Nhanh Hệ Thống

### Bước 1: Khởi động Dashboard & Telegram Bot Poller (PC)
```bash
cd d:/PBL3_NHOM5/SortiX-Dashboard
npm run dev:all
```
> **Lưu ý:** Lệnh `npm run dev:all` khởi động đồng thời cả 3 tiến trình:
> - Frontend Next.js: `http://localhost:3000`
> - Backend Node.js API: `http://localhost:5000`
> - Telegram Bot Poller 2 chiều: Kết nối trực tiếp Bot Telegram `@SortiX_Med_Bot` với hệ thống SCADA.

### Bước 2: Khởi động Trạm Thị Giác Máy Tính (YOLO11 Edge AI)
Mở cửa sổ Terminal thứ hai:
```bash
cd d:/PBL3_NHOM5/PBL.v1i.yolov11
python test_yolo.py --mode webcam --conf 0.3
```

### Bước 3: Nạp Firmware & Giám Sát ESP32-C5
Mở PowerShell ESP-IDF:
```powershell
. "C:\Espressif\tools\Microsoft.v5.5.4.PowerShell_profile.ps1"
cd d:\PBL3_NHOM5\sortix-firmware
idf.py -p COM5 flash monitor
```

### Bước 4: Vận hành hệ thống
1. Bật nguồn 12V tổng.
2. Kiểm tra đèn LED trạng thái GPIO10 chớp chậm 1 Hz (Báo hiệu hệ thống đang ở trạng thái `IDLE` an toàn).
3. Nhấn nút Start vật lý (GPIO23) hoặc nhấn **START** trên giao diện Web Dashboard (hoặc gửi lệnh `/start` trên Telegram Bot) để băng tải bắt đầu vận hành.

---

## 5. Kiểm Thử Tự Động & Đảm Bảo Chất Lượng (QA)

Toàn bộ hệ thống được bảo vệ bởi bộ kiểm thử tự động toàn diện:
```bash
cd SortiX-Dashboard
npm test
```
- **Phạm vi kiểm thử:** Bao phủ 26 file test suites tự động:
  - An toàn E-Stop & Khóa liên động phần cứng (`estop_safety`, `security_audit_remediation`).
  - Phát hiện kẹt cơ khí & Audio báo động (`jam_detection`, `jam_simulation_audio`).
  - Quản lý đầy khay & Cảnh báo quá nhiệt (`bin_full`, `temperature_warning`, `temperature_gauge_simulation_vs_real`).
  - Giám sát Watchdog & Mất kết nối (`device_offline`, `mqtt_disconnected`).
  - Báo cáo ca làm việc & Đồng bộ đa thiết bị (`shift_summary`, `daily_report_sync`, `cross_device_sync`).
  - Xác thực bảo mật, RBAC & Quản lý người dùng (`users`, `api_schemas`).
  - Giao diện SCADA Kiosk Fit-Screen & Telegram Copilot 2 chiều (`anti_ai_industrial_scada_ui`, `telegram_copilot_2way_and_screenfit`).
