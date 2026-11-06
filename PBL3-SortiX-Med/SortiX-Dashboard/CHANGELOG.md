# NHẬT KÝ THAY ĐỔI HỆ THỐNG (CHANGELOG.md)

Tất cả các thay đổi về kiến trúc, tính năng, sửa lỗi và nâng cấp chất lượng của dự án **SortiX-Med** (Hệ thống phân loại dụng cụ y tế & chuẩn bị khử trùng phòng mổ - Đồ án PBL3 Biomedical & Industrial IoT) được ghi lại tại tài liệu này theo tiêu chuẩn [Keep a Changelog](https://keepachangelog.com/).

---

## [3.3.0] - 2026-10-24 (Chuẩn Hóa Toàn Diện Hệ Thống Tài Liệu Kỹ Thuật, Tích Hợp YOLO11 & Đồng Bộ Kiến Trúc Đa Tầng)

### 📚 Chuẩn Hóa Hệ Thống Tài Liệu Markdown (Documentation Standardization)
- **Đồng Bộ Phân Hệ Thị Giác Máy Tính (YOLO11 Integration)**:
  - Cập nhật chuẩn hóa toàn bộ tài liệu từ YOLOv8 sang **Ultralytics YOLO11** (`PBL.v1i.yolov11`), mô tả chi tiết tập dữ liệu y tế (2 nhãn `HH` và `T`), script đa năng `test_yolo.py` và đường truyền MQTT topic `sorter/sorter_01/vision`.
  - Khởi tạo tài liệu kiến trúc độc lập `PBL.v1i.yolov11/README.md`.
- **Đồng Bộ Phần Cứng & Pinout Chuẩn**:
  - Chuẩn hóa chân tín hiệu cơ cấu chấp hành: Servo 1 nối **GPIO6** (PWM LEDC), Servo 2 nối **GPIO7** (PWM LEDC), nút Start vật lý nối **GPIO23** (Debounce RC 20ms).
  - Loại bỏ các mô tả lỗi thời về cảm biến quang học S2/S3 rời; đồng bộ hóa cơ chế theo dõi vị trí phôi qua **bộ đếm xung phần cứng New PCNT (GPIO1 & GPIO4)** và FIFO Tracking Ring Buffer.
- **Đồng Bộ Bảng MQTT Topics & REST API**:
  - Đồng bộ 100% danh mục MQTT topics giữa Firmware ESP32-C5 (`app_config.h`) và Dashboard (`DEFAULT_MQTT_TOPICS`).
  - Bổ sung đặc tả REST API cho Webhook Telegram Bot SCADA 2 chiều (`/api/telegram/webhook`) và Trợ lý AI Copilot Google Gemini 3.5 Flash Lite (`/api/chat/copilot`).
- **Cập Nhật Cây Thư Mục & QA Testing Gate**:
  - Cập nhật toàn diện sơ đồ thư mục Monorepo root `README.md`, bổ sung `PBL.v1i.yolov11` và `huong-dan-backup-git.md`.
  - Cập nhật tài liệu kiểm định với đầy đủ 26 test suites tự động trong `SortiX-Dashboard/tests/`.

---

## [3.2.0] - 2026-10-16 (AI Copilot Gemini 3.5 Flash Lite 2 Chiều, Telegram Bot Gateway SCADA & SCADA Kiosk Zero-Scroll Fit Màn Hình)

### 🤖 Trợ Lý AI Copilot 2 Chiều & Telegram Bot Gateway
- **Nâng Cấp Mô Hình Google Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`)**:
  - Tích hợp trực tiếp Google AI Studio API v1beta, tốc độ phản hồi ~1s, loại bỏ hoàn toàn middleware trung gian.
  - Tự động fallback linh hoạt sang `gemini-3.5-flash`, `gemini-flash-lite-latest`, `gemini-flash-latest`.
  - Khắc phục triệt để lỗi deprecation 404 Not Found từ các model cũ (`gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*`).
- **Telegram Bot SCADA Gateway 2 Chiều (`@SortiX_Med_Bot`)**:
  - Hỗ trợ Kỹ sư và Điều dưỡng nhắn tin hỏi đáp thông minh dựa trên Telemetry thời gian thực.
  - Điều khiển SCADA từ xa qua bàn phím Inline Keyboard (`/status`, `/temp`, `/estop`, `/start`, `/stop`, `/clear_bin`).
  - Xây dựng script `scripts/telegram-poller.cjs` tự động kéo tin nhắn ở môi trường Local/Dev và tích hợp vào runner `npm run dev:all`.

### 🖥️ SCADA Kiosk Fullscreen & Display Density (Fit Màn Hình Zero-Scroll)
- **Mật Độ Hiển Thị Linh Hoạt (Display Density)**:
  - Hỗ trợ chuyển đổi giữa chế độ **Gọn gàng (Compact)** và **Tiêu chuẩn (Comfortable)** ngay trên thanh TopHeader.
  - Tối ưu hóa padding, margins và font size cho màn hình điều khiển công nghiệp.
- **SCADA Kiosk Toàn Màn Hình (F11)**:
  - Tích hợp nút SCADA Kiosk Fullscreen chuẩn công nghiệp.
  - Trang Giám Sát Băng Tải (`/conveyor`) đạt chuẩn Zero-Scroll, vừa vặn hoàn hảo trong 1 khung nhìn (100vh).
- **Khắc Phục Lỗi Giao Diện Header (Anti-Overlap)**:
  - Tối ưu responsive cho nút Trạng Thái Hệ Thống (`TopHeader.tsx`), chuyển text sang `"Mô phỏng"` ngắn gọn và tự động ẩn text trên màn hình nhỏ.
  - Khắc phục triệt để hiện tượng đè lấn (overlap) giữa nút trạng thái và badge Cập nhật thời gian trên mọi độ phân giải.
  - Sửa lỗi cú pháp JSX class template literal trong `ShiftSummaryModal.tsx`.

### 🛡️ Quality Gate & Clean Code
- **163/163 unit tests PASS 100%** trên 21 test suites tự động (`node --test tests/*.test.cjs`).
- **Next.js Production Build 34/34 routes PASS 100%**.
- Dọn dẹp cache build `.tsbuildinfo`, chuẩn hóa monorepo và đồng bộ cây thư mục toàn bộ tài liệu `.md`.

---

## [3.1.0] - 2026-09-29 (Tối Ưu Hóa Codebase, Chế Độ Sáng/Tối, Tinh Gọn AI Copilot & Chuẩn Hóa Tài Liệu)

### 🧹 Clean Code & Refactoring (Tối Ưu & Dọn Dẹp Mã Nguồn)
- **Loại Bỏ Mã Nguồn Dư Thừa & File Chết (Dead Code Elimination)**:
  - Loại bỏ các component không còn sử dụng: `BinTrays.tsx`, `ConveyorControls.tsx`, `QuickFeedBar.tsx`, `JamIncidentBanner.tsx`, `CalendarWidget.tsx`.
  - Loại bỏ các client services trùng lặp: `apiConfigClient.ts`, `apiHistoryClient.ts`, `apiStatsClient.ts`.
  - Dọn dẹp module xử lý cũ `backend/src/utils/dataProcessor.ts` và thư mục tĩnh cũ `legacy_static/`.
  - Dọn dẹp script phụ trợ cũ `scripts/upgrade_n8n_ai_workflow.js`.
  - Xóa thư mục lưu trữ tạm `backups/` và các báo cáo thử nghiệm cũ, giải phóng hơn 5 MB dung lượng dự án.
- **Sửa Lỗi Contract Test**:
  - Đồng bộ mã màu trạng thái `shift_summary` sang chuẩn `#10b981` tại `frontend/src/app/api/email-alert/route.ts` nhằm thỏa mãn 100% hợp đồng kiểm thử `new_day_report_tele_email.test.cjs`.

### 🌓 Theme & UI/UX Enhancements (Giao Diện Sáng / Tối & Tối Ưu Trải Nghiệm)
- **Hỗ Trợ Toàn Diện Light Mode & Dark Mode**:
  - Bổ sung breakpoint `xs: "480px"` trong `frontend/tailwind.config.ts`.
  - Hiển thị nút chuyển đổi giao diện Mặt Trời (Light) / Mặt Trăng (Dark) luôn sẵn sàng trên `TopHeader.tsx`.
  - Cơ chế đồng bộ và chống nhấp nháy giao diện (FOUC) khi tải trang qua inline script tại `<head>` của `layout.tsx`.
  - Lưu trữ tùy chọn giao diện bền vững trong `localStorage ('sortix_theme')`.
- **Tinh Gọn Giao Diện Trợ Lý AI (`AiCopilot.tsx`)**:
  - Rút gọn badge Gemini và thông tin trạng thái mô hình thành 1 dòng nhỏ gọn.
  - Tối ưu hóa các nút gợi ý câu hỏi nhanh (Gợi ý 1 - 4) trên cả Header và thanh nhập liệu.
  - Tinh giản văn bản hiển thị trạng thái phân loại 3 khay y tế và thông báo kết nối Webhook.

### 🛡️ Quality Gate & Documentation (Kiểm Định & Chuẩn Hóa Tài Liệu)
- Bảo toàn **100% tỷ lệ vượt qua kiểm thử** (23/23 test suites PASS).
- TypeScript Typecheck sạch sẽ (0 lỗi).
- Cập nhật chuẩn hóa toàn bộ hệ thống tài liệu Markdown (`README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/api.md`, `CHANGELOG.md`).

---

## [3.0.0] - 2026-09-23 (Chuyển Đổi Sang SortiX-Med: Hệ Thống Phân Loại Dụng Cụ Y Tế & Chuẩn Bị Khử Trùng Phòng Mổ)

### 🏥 Medical & Biomedical Features (Tính Năng Y Tế & Y Sinh)
- **Chuẩn Hóa Danh Mục 4 Nhóm Dụng Cụ Y Tế (`CATALOG_BRANDS`)**:
  - `med_syringe`: "Bơm kim tiêm / Dao mổ" (Vàng y tế `#EAB308`, Khay 1 - Sharps Waste).
  - `med_forceps`: "Kẹp phẫu thuật (Pean)" (Xanh dương y tế `#0284C7`, Khay 2 - Autoclave).
  - `med_scissors`: "Kéo phẫu thuật" (Xanh tím tiệt trùng `#6366F1`, Khay 2 - Autoclave).
  - `med_vial`: "Lọ thuốc / Ống nghiệm" (Xanh ngọc Emerald `#10B981`, Khay 3 - General Supplies).
  - Tương thích ngược hoàn toàn (Backward Compatible) với các mã cũ (`brand_c` -> `med_syringe`, `brand_p` -> `med_forceps`, `brand_r` -> `med_scissors`, `brand_a` -> `med_vial`).
- **Tên & Chức Năng 3 Khay Chứa Y Tế Chuyên Dụng**:
  - **Khay 1**: "Thùng vật sắc nhọn lây nhiễm (Sharps Waste)" — Tiếp nhận bơm tiêm, dao mổ, lưỡi trích (Cơ cấu Servo 1 - PWM GPIO6 gạt vào).
  - **Khay 2**: "Khay hấp tiệt trùng Autoclave (Surgical Instruments)" — Tiếp nhận kẹp phẫu thuật Pean và kéo mổ bằng thép không gỉ (Cơ cấu Servo 2 - PWM IO24 gạt vào).
  - **Khay 3**: "Khay vật tư y tế & Phục hồi / Khay mặc định (General Supplies)" — Tiếp nhận lọ thuốc, ống nghiệm qua máng trượt trọng lực cuối băng tải.
- **Cơ Chế An Toàn Sinh Học Fail-Safe**:
  - Khi độ tin cậy nhận diện `confidence < 60%` (0.60) hoặc vật phẩm không nhận diện được, hệ thống tự động đưa về **Khay 3** để nhân viên y tế kiểm tra lại, loại bỏ 100% rủi ro đưa nhầm vật sắc nhọn vào khay tiệt trùng.
- **Trực Quan Hóa Băng Chuyền Vật Lý 60fps & Nạp Dụng Cụ Nhanh**:
  - Cập nhật thanh công cụ nạp mẫu với 4 nút nạp dụng cụ y tế trực quan kèm icon và mã màu y tế.
  - Cập nhật vật thể kẹt mẫu thành Bơm kim tiêm / Dao mổ (`med_syringe`).
  - Hiển thị drop-shadow phát sáng theo mã màu y tế tương ứng cho từng dụng cụ.

### 📱 Mobile & QR Code Enhancements (Nâng Cấp Di Động & Mã QR)
- **Tạo Mới Mã QR Truy Cập Nhanh (`SortiX_Dashboard.png`)**:
  - Thiết kế mã QR chuẩn đồ họa phân giải cao, hiển thị nhận diện thương hiệu SortiX-Med.
  - Quét mã bằng camera điện thoại Android để mở Web Dashboard trên URL LAN của máy chủ tại thời điểm triển khai.
  - Hỗ trợ tải APK khi asset đã được đặt trong `frontend/public` của bản build tương ứng.
- **Cập Nhật Cấu Hình Capacitor 8 (`frontend/capacitor.config.ts`)**:
  - URL máy chủ hiện lấy từ `CAPACITOR_SERVER_URL`, với fallback được khai báo trong `frontend/capacitor.config.ts`.

### 🛡️ Quality Gate (Kiểm Thử & Đảm Bảo Chất Lượng)
- Bảo toàn các test được nối trong script root `npm test`; script hiện gồm 16 file test.
- Biên dịch thành công Next.js 14 Production Build; danh sách route được Next.js sinh theo App Router hiện tại.

---

## [2.5.0] - 2026-09-19 (Đóng Gói Mobile App Android với Capacitor, Hỗ Trợ iOS PWA & Tối Ưu Giao Diện Mobile)

### 🚀 Added (Thêm mới)
- **Đóng Gói Ứng Dụng Di Động Android (Native APK qua Capacitor 8)**:
  - Tích hợp các thư viện `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` vào `frontend/`.
  - Khởi tạo thành công dự án Native Android trong `frontend/android/` với package ID `com.pbl3.dashboard` và tên ứng dụng `SortiX Dashboard`.
  - Xây dựng thành công file APK cài đặt độc lập: `SortiX-Dashboard.apk` (khoảng 4.1 MB) thông qua Android Studio pipeline.
  - Bổ sung các lệnh thuận tiện trong `package.json`: `npm run cap:sync` (đồng bộ build vào Android project) và `npm run cap:open` (mở Android Studio).
- **Mô Hình 1-Codebase Hybrid Webview Container**:
  - Duy trì 100% mã nguồn Next.js 14 App Router dùng chung giữa Desktop Web, Vercel Cloud, Android APK và iOS PWA.
  - Không sử dụng chế độ tĩnh `output: 'export'` nhằm bảo vệ toàn vẹn 18 dynamic Route Handlers và SSE stream `/api/events`.
  - Cấu hình cầu nối `frontend/capacitor.config.ts` hỗ trợ linh hoạt máy ảo Android (`http://10.0.2.2:3000`), IP mạng LAN (`http://192.168.1.4:3000`) và production Vercel domain.
  - Tạo trang fallback ngoại tuyến `frontend/out/index.html` bảo đảm app không bị sập khi chưa có mạng.
- **Tối Ưu Trải Nghiệm & Viewport Di Động (Next.js 14 Viewport & iOS PWA)**:
  - Xuất cấu hình `Viewport` trong `frontend/src/app/layout.tsx`: `maximumScale: 1, userScalable: false, viewportFit: "cover", themeColor: "#070b14"`.
  - Hỗ trợ cài đặt PWA Standalone toàn màn hình trên iPhone thông qua Safari ("Thêm vào MH chính") với trải nghiệm mượt mà không cần Mac/Xcode.
- **Điều Hướng & Chuyển Đổi Chế Độ Trên Màn Hình Nhỏ (Mobile Navigation)**:
  - Bổ sung nút bấm viên nang nhanh `[🧪 Mô phỏng]` / `[📡 Thực tế]` (`flex shrink-0 sm:hidden`) ngay trên thanh `TopHeader.tsx`.
  - Bổ sung khối "CHẾ ĐỘ VẬN HÀNH" kích thước lớn, trực quan ngay trên đầu menu ngăn kéo `Sidebar.tsx` khi mở nút Hamburger trên điện thoại.
  - Phân quyền chặt chẽ: Nút Mô phỏng chỉ hiển thị cho Quản trị viên (Admin), tài khoản Người vận hành (User) luôn bị khóa cứng ở chế độ Thực tế trên mọi nền tảng.

### 🛡️ Security & Configuration (Bảo mật & Cấu hình)
- Cấu hình `android:usesCleartextTraffic="true"` trong `frontend/android/app/src/main/AndroidManifest.xml` hỗ trợ kết nối HTTP máy chủ cục bộ và telemetry vi điều khiển.
- Cập nhật `.gitignore` loại bỏ triệt để các file build tạm của Android Gradle (`.gradle/`, `build/`, `local.properties`, `*.apk`, `*.aab`).

---

## [2.4.0] - 2026-09-19 (Tích Hợp Toàn Diện, Chuẩn Hóa Monorepo & Khóa Kiểm Thử Cuối)

### 🚀 Added (Thêm mới)
- **Kịch Bản Điều Phối Monorepo (`scripts/dev-all.cjs`)**:
  - Hỗ trợ lệnh `npm run dev:all` khởi chạy song song và tự động quản lý vòng đời của cả Frontend (Next.js 14 tại Port 3000) và Backend (`node:http` tại Port 5000) chỉ bằng một câu lệnh duy nhất.
- **Tự Động Vá Path Alias Backend (`backend/scripts/patch-dist-aliases.cjs`)**:
  - Khắc phục triệt để lỗi không resolve được alias module `@shared/*` trong mã nguồn JavaScript sau khi biên dịch `tsc` bằng cơ chế rewrite module specifier thời gian thực.
- **Xác Thực Token Phiên Ký Số (`backend/src/services/authToken.ts`)**:
  - Chuẩn hóa cơ chế ký số token xác thực phiên người dùng, kiểm tra chéo trạng thái hoạt động (`status: 'active'`) và vai trò phân quyền.
- **API Heartbeat & Token Đồng Bộ**:
  - Bổ sung các routes `/api/auth/heartbeat`, `/api/auth/token` và `/api/auth/logout` ở frontend route handlers và backend standalone khi route tương ứng được triển khai.
- **Báo Cáo Tích Hợp Hệ Thống & Kiểm Định Chất Lượng**:
  - Tổng kết kết quả kiểm tra chất lượng và typecheck theo script tại thời điểm phát hành.

### 🛡️ Security & Quality (Bảo mật & Chất lượng)
- Chuẩn hóa toàn bộ biến môi trường qua `backend/src/config/env.ts` với khả năng tự động đọc file `.env` linh hoạt và an toàn.
- Loại bỏ toàn bộ trường mật khẩu thô `plain_password` trong kho dữ liệu demo `data/users.json`, 100% tài khoản sử dụng mật khẩu băm Bcrypt.
- Xác nhận kiểm thử hồi quy tự động theo các suite được nối trong `package.json` tại thời điểm phát hành.

---

## [2.3.0] - 2026-09-18 (Dung Lượng Khay Động 5-50 SP, Đồng Hồ Nhiệt Độ 2 Chế Độ, Báo Cáo 1 Ngày Làm Việc & MQTT Watchdog)

### 🚀 Added (Thêm mới)
- **Thanh Trượt Điều Chỉnh Độ Rộng / Sức Chứa Khay (Dynamic Bin Capacities 5 - 50 SP)**:
  - Cho phép người dùng tùy chỉnh định mức chứa từ 5 đến 50 sản phẩm riêng biệt cho từng khay (Khay 1, Khay 2, Khay 3).
  - Tự động đồng bộ hóa tức thời trên máng trượt Canvas 60fps (`ConveyorVisualizer.tsx`), widget giám sát (`LiveHealthAndBinWidget.tsx`), chẩn đoán (`ConfigAndDiagnostics.tsx`), `useSorterData.ts` và lưu trữ bền vững trên `localStorage ('sortix_bin_capacities')`.
  - Cơ chế tự động kẹp giá trị an toàn (Clamping [5, 50] SP).
- **Phân Định Rõ Ràng: Đầy Khay (`bin_full`) vs Kẹt Phôi (`jam_detected`)**:
  - `bin_full`: Kích hoạt khi số lượng đạt tới sức chứa định mức của khay (`current_count >= max_capacity`, ví dụ 30/30 hoặc 50/50 SP), hiển thị banner vàng cam, còi báo đầy khay và nút "Xác nhận đã thay khay mới" reset khay về 0.
  - `jam_detected`: Kích hoạt khi cảm biến quang học che khuất liên tục > 5 giây tại Cảm biến #02 / Zone A, dừng băng tải tức thì, còi hú báo kẹt và hiển thị banner đỏ kẹt phôi.
- **Đồng Hồ Đo Nhiệt Độ Bán Nguyệt 2 Chế Độ (Dual-Mode Temperature Gauge Dial)**:
  - `TemperatureGaugeWidget.tsx`: Tự động phân định giao diện theo chế độ vận hành:
    - *Chế độ Mô phỏng*: Hiển thị thanh trượt nhiệt độ ảo (30°C - 95°C) và các nút preset (42.5°C, 72.0°C, 78.5°C) để thử nghiệm phản ứng quá nhiệt.
    - *Chế độ Thực tế*: Tự động ẩn thanh trượt giả lập, hiển thị bảng telemetry cảm biến phần cứng thật (Cảm biến nội vi ESP32-C5) với cờ `[PHẦN CỨNG THẬT]` và kim đo phản ánh dữ liệu cảm biến thực tế.
- **Giám Sát Mất Kết Nối MQTT Broker (`mqtt_disconnected`)**:
  - Watchdog 5 giây debounce chống nhấp nháy mạng ngắn hạn.
  - Tự động chuyển đổi huy hiệu trên TopHeader: `MQTT: ONLINE (Xanh)` <-> `MQTT: DISCONNECTED (Đỏ chớp nháy)`.
  - Phát âm thanh cảnh báo ngắt kết nối và lịch trình tự động kết nối lại theo chu kỳ backoff (3s -> 5s -> 10s).
  - Toast phục hồi màu xanh kèm âm thanh chime khi kết nối lại thành công.
  - Nút thử nghiệm "Ngắt kết nối MQTT Client" / "Khôi phục kết nối MQTT" trong trang Cấu hình và Thiết bị (chỉ hoạt động ở chế độ Mô phỏng).
- **Báo Cáo 1 Ngày Làm Việc (Shift Summary / Daily Work Report)**:
  - Chuẩn hóa tên gọi thành **`[BÁO CÁO 1 NGÀY LÀM VIỆC]`**.
  - Tự động đồng bộ hóa trực tiếp số liệu thời gian thực từ 3 khay chứa, số sản phẩm đạt/lỗi, thời gian vận hành và số lần dừng khẩn cấp.
  - Modal trực quan hóa số liệu, nút Tải báo cáo CSV có UTF-8 BOM hiển thị tiếng Việt chuẩn trên Excel, và mẫu in ấn chuẩn.
- **Bổ Sung 9 Bộ Test Suites Mới**:
  - `tests/bin_sliders_sync.test.cjs` (8 tests)
  - `tests/mqtt_disconnected.test.cjs` (12 tests)
  - `tests/temperature_gauge_simulation_vs_real.test.cjs` (4 tests)
  - `tests/daily_report_sync.test.cjs` (6 tests)
  - `tests/temperature_warning.test.cjs` (8 tests)
  - `tests/device_offline.test.cjs` (10 tests)
  - `tests/shift_summary.test.cjs` (8 tests)
  - `tests/bin_full.test.cjs` (7 tests)
  - `tests/jam_simulation_audio.test.cjs` (5 tests)

---

## [2.2.0] - 2026-09-18 (Hệ Thống An Toàn E-Stop, Cảnh Báo Kẹt Phôi, SSE & Cô Lập Mô Phỏng)

### 🚀 Added (Thêm mới)
- **Hệ Thống Dừng Khẩn Cấp (Industrial E-Stop Safety System)**:
  - `backend/src/services/safetyService.ts`: Quản lý trạng thái an toàn hệ thống (`is_locked`), lưu trữ sự cố khẩn cấp, xác thực mở khóa chỉ dành cho Admin và cơ chế chống kẹt loop echo 5s.
  - `backend/src/controllers/safetyController.ts` & `backend/src/routes/safetyRoutes.ts`: Endpoints `/api/safety/estop`, `/api/safety/unlock`, `/api/safety/status`.
  - `frontend/src/components/layout/EmergencyStopBanner.tsx`: Banner cảnh báo toàn màn hình khi băng chuyền bị khóa khẩn cấp.
  - `frontend/src/components/ui/EmergencyConfirmModal.tsx`: Hộp thoại xác nhận kích hoạt dừng khẩn cấp từ Web.
  - `frontend/src/components/ui/EmergencyUnlockToast.tsx`: Giao diện mở khóa an toàn yêu cầu quyền Quản trị viên và nhập lý do hiện trường.
- **Hệ Thống Cảnh Báo Kẹt Phôi (Jam Detection System)**:
  - `conveyor/sensor/jam`: Topic MQTT phát hiện vật thể đứng yên/che khuất liên tục quá 5 giây tại Cảm biến quang học #02 (Zone A).
  - `/api/safety/jam`: Endpoint ghi nhận sự cố kẹt phôi và lưu trữ bền vững.
  - Toast thông báo màu đỏ cảnh báo kẹt phôi kèm hướng dẫn xử lý và dừng băng tải.
  - Cơ cấu chuyển hướng nâng cấp: Đổi sang kiểu **Piston đẩy thụt ra thụt vô** thay vì servo gạt xoay truyền thống.
  - Tính năng **Dọn khay chủ động**: Bấm dọn khay bất kỳ lúc nào ngay trên máng trượt (không cần chờ đủ định mức).
- **Server-Sent Events (SSE Real-time Event Stream)**:
  - `backend/src/services/sseService.ts` & `/api/events`: Stream sự kiện thời gian thực (E-Stop, Jam Detected, Safety Unlocked) tới tất cả các client đang mở.
- **Kho Dữ Liệu Thông Báo Bền Vững (Notifications Persistence)**:
  - `data/notifications.json` & `backend/src/models/notificationModel.ts`: Lưu trữ vĩnh viễn các thông báo dừng khẩn cấp và kẹt phôi với trạng thái `unprocessed` / `resolved`.
- **Gắn Nhãn Chế Độ Trong Cảnh Báo Tự Động**:
  - Email (SMTP) và Telegram Bot tự động kèm nhãn định danh: `🧪 Chế độ Giả Lập` hoặc `🔴 Phần cứng Thực Tế`.

### 🛡️ Security & Reliability (Bảo mật & Độ tin cậy)
- **Cô lập Tuyệt đối Chế độ Mô phỏng (Strict Simulation Isolation)**:
  - Các nút test giả lập kẹt phôi, giả lập E-Stop, nạp phôi mẫu, tạo dữ liệu demo hoàn toàn bị ẩn và bị chặn thực thi khi ở chế độ Thực tế (Real Hardware Mode).
  - Động cơ vật lý canvas không tự sinh kẹt phôi giả khi đang kết nối máy thật; 100% dữ liệu dựa trên cảm biến quang học thật qua MQTT.
- Chống kẹt lặp bản tin E-Stop: Bỏ qua các tín hiệu dừng lặp lại trong thời gian ân hạn 5 giây sau khi Admin đã mở khóa an toàn.

---

## [2.1.0] - 2026-09-18 (Hệ Thống Xác Thực Đa Lớp, Phân Quyền RBAC & Database Migrations)

### 🚀 Added (Thêm mới)
- **Hệ Thống Xác Thực & Quản Trị Người Dùng (Auth & RBAC)**:
  - `backend/src/services/userService.ts`: Nghiệp vụ băm mật khẩu Bcrypt (10 salt rounds), cấp phát và kiểm chứng Mock OTP (6 chữ số, thời hạn 5 phút), phân quyền RBAC và kiểm soát an toàn tài khoản.
  - `backend/src/controllers/userController.ts`: Tiếp nhận và điều phối các endpoint đăng ký, đăng nhập, đổi mật khẩu, quên mật khẩu OTP và quản trị người dùng.
  - `backend/src/routes/authRoutes.ts` & `backend/src/routes/userRoutes.ts`: Định tuyến RESTful API độc lập cho backend server.
  - `backend/src/models/userModel.ts`: Quản lý nạp và lưu trữ dữ liệu người dùng bền vững trên file `data/users.json`.
  - `data/users.json`: Lưu trữ thông tin tài khoản an toàn với mật khẩu băm Bcrypt.
- **Khởi Tạo Admin & Cơ Sở Dữ Liệu (Migrations & Seeds)**:
  - `backend/database/seeds/seed_admins.ts` & `seed_admins.sql`: Tự động khởi tạo 4 tài khoản Ban Quản trị đại diện nhóm đề tài PBL3 (`admin1`, `admin2`, `admin3`, `admin4`).
  - `backend/database/migrations/`: 4 tệp DDL tạo bảng người dùng chuẩn hóa cho đa hệ quản trị CSDL (SQLite, PostgreSQL, MySQL, MongoDB).
- **Giao Diện & Trải Nghiệm Người Dùng (Frontend UI)**:
  - `frontend/src/app/users/page.tsx`: Giao diện quản trị thành viên trực quan, phân quyền theo vai trò (Admin / User), tạo mới và khóa tài khoản.
  - `frontend/src/app/login/page.tsx`: Nâng cấp giao diện đăng nhập với liên kết mở Modal Quên mật khẩu.
  - `frontend/src/components/ui/ForgotPasswordModal.tsx`: Hộp thoại yêu cầu mã OTP và đặt lại mật khẩu mới.
  - `frontend/src/components/ui/ChangePasswordModal.tsx`: Hộp thoại đổi mật khẩu với xác thực độ phức tạp.

---

## [2.0.0] - 2026-09-17 (Tái Cấu Trúc Monorepo Frontend / Backend / Shared)

### 🚀 Added (Thêm mới)
- **Tầng Dùng Chung (`shared/`)**:
  - `shared/types/index.ts`: Toàn bộ TypeScript interfaces chuẩn (`TelemetryData`, `VisionDetection`, `SorterConfig`, `ClassificationRecord`, `AlertEvent`).
  - `shared/schemas/index.ts`: Schemas Zod có `.passthrough()` đảm bảo tính tương thích với firmware ESP32-C5.
  - `shared/constants/index.ts`: Hằng số MQTT topics, mã màu 3 khay, vai trò người dùng (RBAC).
- **Tầng Backend Độc Lập (`backend/`)**:
  - `backend/src/controllers/`: `configController`, `historyController`, `statsController`, `alertController`.
  - `backend/src/routes/`: `configRoutes`, `historyRoutes`, `statsRoutes`, `alertRoutes`.
  - `backend/src/models/`: `historyModel`, `configModel` (bộ đệm an toàn giới hạn tối đa 1000 bản ghi).
  - `backend/src/server.ts`: `node:http` Server độc lập chạy song song trên cổng 5000.
