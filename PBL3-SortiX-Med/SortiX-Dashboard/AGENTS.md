# QUY TẮC PHÁT TRIỂN DỰ ÁN SORTIX-MED (AGENTS.md)

Tài liệu này quy định các tiêu chuẩn kỹ thuật, ràng buộc kiến trúc và nguyên tắc an toàn y sinh **BẮT BUỘC** áp dụng cho tất cả các AI Agent và Lập trình viên khi làm việc với codebase của **SortiX-Med** — Hệ thống tự động phân loại dụng cụ y tế & chuẩn bị khử trùng phòng mổ (Đồ án PBL3 Biomedical & Industrial IoT).

---

## 📌 Mục Lục
1. [Kiến Trúc Monorepo & Quy Chuẩn Mã Nguồn](#1-kiến-trúc-monorepo--quy-chuẩn-mã-nguồn)
2. [Tiêu Chuẩn TypeScript Khắt Khe (Strict Typing)](#2-tiêu-chuẩn-typescript-khắt-khe-strict-typing)
3. [Xác Thực Dữ Liệu & Quy Tắc Zod Schema](#3-xác-thực-dữ-liệu--quy-tắc-zod-schema)
4. [Nguyên Tắc Bảo Mật & Xác Thực (Security & RBAC)](#4-nguyên-tắc-bảo-mật--xác-thực-security--rbac)
5. [An Toàn Công Nghiệp & Cô Lập Mô Phỏng (Industrial Safety & Simulation Isolation)](#5-an-toàn-công-nghiệp--cô-lập-mô-phỏng-industrial-safety--simulation-isolation)
6. [Đảm Bảo Chất Lượng & Bảo Vệ Kiểm Thử (Testing Gates)](#6-đảm-bảo-chất-lượng--bảo-vệ-kiểm-thử-testing-gates)

---

## 1. Kiến Trúc Monorepo & Quy Chuẩn Mã Nguồn

- **Mô hình Monorepo (npm workspaces)**:
  - `frontend/`: Ứng dụng Next.js 14 App Router (`frontend/src/app/`).
  - `backend/`: Máy chủ độc lập TypeScript dùng module chuẩn `node:http` (`backend/src/`).
  - `shared/`: Thư viện dùng chung (`types/`, `schemas/`, `constants/`).
  - `scripts/`: Kịch bản dev, build, e2e, test, giải phóng cổng và nâng cấp workflow.
- **Khởi chạy ứng dụng**:
  - Chạy đồng thời cả Frontend và Backend: `npm run dev:all`.
  - Chạy riêng Frontend: `npm run dev:frontend` (Port 3000).
  - Chạy riêng Backend: `npm run dev:backend` (Port 5000).
- **Server vs. Client Components**:
  - Mặc định ưu tiên Server Components trong Next.js.
  - Chỉ khai báo `'use client'` khi bắt buộc sử dụng Browser APIs (React state/hooks, Canvas, Web Audio API, Recharts, MQTT WebSocket Client).
- **Quy tắc Path Alias**:
  - Tại Frontend: Luôn sử dụng alias `@/` trỏ tới `frontend/src/` và `@shared/*` trỏ tới `shared/*`.
  - Tại Backend: Luôn import từ `@shared/*` hoặc relative path chuẩn mực.
  - Tuyệt đối không dùng các đường dẫn tương đối xuyên tầng lộn xộn (ví dụ: `../../../../shared/types`).
- **Persistence hiện tại**:
  - Runtime sử dụng `data/history.json`, `data/notifications.json`, `data/sync_state.json` và `data/users.json`.
  - `ConfigModel` giữ cấu hình mặc định trong bộ nhớ; không tự tạo hoặc xóa `data/config.json` nếu source không yêu cầu.
  - `backend/database/migrations` và `backend/database/seeds` là artifact tham chiếu; phải giữ nguyên khi refactor.
- **API layers**:
  - Next route handlers nằm dưới `frontend/src/app/api` và backend standalone cùng phục vụ một số route tương thích.
  - Không hợp nhất, đổi tên hoặc xóa alias route chỉ vì thấy endpoint trùng tên.

---

## 2. Tiêu Chuẩn TypeScript Khắt Khe (Strict Typing)

- **TypeScript Strict Mode**: Toàn bộ dự án bắt buộc duy trì `"strict": true` trong `tsconfig.json`.
- **Nghiêm cấm kiểu `any` tùy tiện**: Tuyệt đối không khai báo biến kiểu `any` hoặc gắn comment `@ts-ignore` để che giấu lỗi type.
- **Sử dụng Kiểu Dữ Liệu Tập Trung**:
  - Mọi interface cốt lõi (`TelemetryData`, `VisionDetection`, `SorterConfig`, `ClassificationRecord`, `AlertEvent`, `User`, `SafeUser`) phải được import trực tiếp từ `shared/types`.
- **Xác thực Typecheck trước khi bàn giao**:
  ```powershell
  npx tsc --noEmit --pretty false
  ```

---

## 3. Xác Thực Dữ Liệu & Quy Tắc Zod Schema

- **Xác thực Untrusted Input**: Mọi dữ liệu nhận từ giao thức mạng (gói tin MQTT từ ESP32-C5 hoặc HTTP request từ client) **BẮT BUỘC** phải được parse và xác thực bằng Zod schemas định nghĩa trong `shared/schemas/`.
- **Quy tắc `.passthrough()` Bắt Buộc**:
  - Các Zod Schema định nghĩa cho thiết bị (như `TelemetrySchema`, `VisionDetectionSchema`, `SorterConfigSchema`) phải luôn kết thúc bằng `.passthrough()`.
  - *Mục đích*: Ngăn chặn tình trạng Dashboard crash khi phần cứng ESP32-C5 gửi thêm các cờ chẩn đoán firmware mới.

---

## 4. Nguyên Tắc Bảo Mật & Xác Thực (Security & RBAC)

- **Băm mật khẩu Bcrypt**:
  - Mọi mật khẩu người dùng lưu trữ trong cơ sở dữ liệu hoặc `data/users.json` **bắt buộc** phải được băm bằng thuật toán `bcrypt` với tối thiểu `10 salt rounds`. Tuyệt đối không lưu trữ hay so khớp mật khẩu dạng plain text.
- **Chống Tấn Công Leo Thang Đặc Quyền (Privilege Escalation Prevention)**:
  - Endpoint đăng ký tự do (`/api/auth/register`) luôn luôn gán cứng `role: 'user'`, bỏ qua bất kỳ trường `role` nào được gửi từ client.
- **Phân Quyền Vai Trò (RBAC)**:
  - Mọi endpoint tác động đến cấu hình máy (`/api/config`), xóa lịch sử (`DELETE /api/history`), quản trị người dùng (`/api/users/*`), và mở khóa an toàn sau dừng khẩn cấp (`/api/safety/unlock`) bắt buộc phải đi qua middleware kiểm tra quyền Admin (`requireAdmin`). Người dùng thường vi phạm sẽ nhận mã `403 Forbidden`.
- **Ràng Buộc An Toàn Dành Cho Admin**:
  - Admin **không được phép tự xóa tài khoản của chính mình** khi đang trong phiên đăng nhập.
  - Tuyệt đối **không được phép xóa tài khoản Admin nếu số lượng Admin trong hệ thống còn lại $\le 1$** (đảm bảo hệ thống luôn có người quản trị).
- **Cơ Chế Mock OTP**:
  - Mã OTP đặt lại mật khẩu phải là chuỗi ngẫu nhiên 6 chữ số với thời hạn hết hạn nghiêm ngặt là **5 phút (300 giây)**.
  - Chống tái sử dụng mã OTP (hủy mã ngay sau lần xác thực thành công đầu tiên).
  - Chặn khôi phục từ bên ngoài đối với các tài khoản có role `admin`.

---

## 5. An Toàn Công Nghiệp & Cô Lập Mô Phỏng (Industrial Safety & Simulation Isolation)

- **An Toàn Dừng Khẩn Cấp (E-Stop)**:
  - Khi kích hoạt Dừng khẩn cấp: Lập tức ngắt băng tải (`isRunning = false`), bật còi hú liên tục, hiển thị banner toàn màn hình khóa hệ thống và lưu bản ghi vào `data/notifications.json`.
  - **Mở khóa an toàn (Safe Unlock)**: Chỉ Quản trị viên (Admin) mới có quyền mở khóa, bắt buộc nhập ghi chú xác nhận hiện trường.
  - **Chống Kẹt Loop Echo**: Áp dụng thời gian ân hạn 5 giây sau khi mở khóa an toàn để bỏ qua tín hiệu dừng lặp lại từ MQTT/SSE.
- **Phân Định Rõ Ràng: Đầy Khay (`bin_full`) vs Kẹt Phôi (`jam_detected`)**:
  - **Kẹt phôi**: Cảm biến quang học che khuất liên tục > 5 giây tại Cảm biến #02 / Zone A (MQTT `conveyor/sensor/jam`), bật còi hú báo kẹt, dừng băng chuyền và hiển thị banner đỏ kẹt phôi.
  - **Đầy khay**: Số lượng sản phẩm đạt tới sức chứa định mức của khay (`current_count >= max_capacity`, biên độ 5 - 50 SP), bật còi chuông cảnh báo, banner vàng cam và nút "Xác nhận đã thay khay mới" reset khay về 0.
- **Độ Rộng / Dung Lượng Khay Động (Dynamic Bin Capacities 5 - 50 SP)**:
  - Mỗi khay cho phép tùy biến định mức từ 5 đến 50 SP. Mọi giá trị cập nhật phải được kẹp an toàn qua clamp logic [5, 50] và đồng bộ đồng thời qua `useSorterData`, Context, các máng trượt Canvas 60fps và `localStorage ('sortix_bin_capacities')`.
- **Đồng Hồ Nhiệt Độ Bán Nguyệt 2 Chế Độ (Gauge Dial Mode Isolation)**:
  - Chế độ Mô phỏng: Cung cấp thanh trượt nhiệt độ ảo (30°C - 95°C) và nút preset phục vụ thử nghiệm cảnh báo quá nhiệt (> 75°C).
  - Chế độ Thực tế: Ẩn tuyệt đối thanh trượt ảo, hiển thị bảng telemetry cảm biến phần cứng thật (Cảm biến nội vi ESP32-C5) với nhãn `[PHẦN CỨNG THẬT]` và kim đo phản ánh dữ liệu cảm biến thực tế.
- **Mất Kết Nối MQTT Broker (`mqtt_disconnected`)**:
  - Watchdog 5 giây debounce. Khi mất kết nối quá 5s, đổi huy hiệu TopHeader sang `MQTT: DISCONNECTED (Đỏ chớp nháy)`, phát còi báo và áp dụng lịch trình tự động kết nối lại (3s -> 5s -> 10s).
- **Chuẩn Hóa Báo Cáo 1 Ngày Làm Việc**:
  - Bắt buộc sử dụng tiền tố **`[BÁO CÁO 1 NGÀY LÀM VIỆC]`** trong tiêu đề và nội dung thông báo.
  - Dữ liệu báo cáo phải được đồng bộ trực tiếp từ số liệu thời gian thực của 3 khay chứa và lịch sử phân loại.
- **Quy Tắc Cô Lập Kiểm Thử Tuyệt Đối (Strict Simulation Isolation)**:
  - Các chức năng test giả lập (nút *Bấm test giả lập kẹt phôi*, *Giả lập bấm E-Stop*, *Nạp dụng cụ y tế mẫu*, *Tạo dữ liệu demo*, *Test ngắt kết nối MQTT*, *Thanh trượt nhiệt độ ảo*) **CHỈ ĐƯỢC PHÉP XUẤT HIỆN VÀ THỰC THI Ở CHẾ ĐỘ MÔ PHỎNG (`isSimulation === true`)**.
  - Khi ở chế độ Thực tế (`isSimulation === false`):
    - Giao diện ẩn hoàn toàn tất cả các nút test và nạp phôi ảo.
    - Tất cả các hàm xử lý phải chặn các yêu cầu có nguồn gốc từ `user_action` hoặc `physics_in`, đảm bảo dữ liệu 100% đến từ cảm biến và camera phần cứng thực tế.
- **Bảo Mật Broker**: Tuyệt đối không hardcode URL, username, password của MQTT Broker vào mã nguồn. Luôn nạp qua biến môi trường `.env`.

---

## 6. Đảm Bảo Chất Lượng & Bảo Vệ Kiểm Thử (Testing Gates)

- **BẢO VỆ TUYỆT ĐỐI THƯ MỤC `tests/`**:
  - Tuyệt đối không được xóa, đổi tên hoặc sửa đổi logic để "lách" các bài test trong các bộ kiểm thử cốt lõi:
    1. `tests/history.test.cjs` (Bounded buffer, migration, normalization)
    2. `tests/api_schemas.test.cjs` (Schema validation, passthrough)
    3. `tests/users.test.cjs` (Bcrypt, OTP, RBAC, Privilege Escalation, Admin deletion constraints)
    4. `tests/estop_safety.test.cjs` (Dừng khẩn cấp, admin unlock, chống loop echo 5s)
    5. `tests/jam_detection.test.cjs` (Cảm biến quang kẹt phôi, broadcast SSE, MQTT topic)
    6. `tests/jam_simulation_audio.test.cjs` (Còi báo kẹt phôi, còi khay đầy, UI Guard)
    7. `tests/bin_full.test.cjs` (Đầy khay chứa, MQTT bin_status, SSE broadcast)
    8. `tests/temperature_warning.test.cjs` (Quá nhiệt thiết bị, MQTT temp, Edge AI label)
    9. `tests/device_offline.test.cjs` (ESP32 offline watchdog 6s, heartbeat ping 2s)
    10. `tests/shift_summary.test.cjs` (Tổng kết ca làm việc, CSV UTF-8 BOM, admin gate)
    11. `tests/bin_sliders_sync.test.cjs` (Thanh trượt sức chứa 5-50 SP, clamp logic, đồng bộ UI)
    12. `tests/mqtt_disconnected.test.cjs` (Mất kết nối MQTT 5s, auto-reconnect backoff, âm thanh báo)
    13. `tests/temperature_gauge_simulation_vs_real.test.cjs` (Chuyển đổi giao diện Mô phỏng vs Thực tế)
    14. `tests/daily_report_sync.test.cjs` (Đồng bộ số liệu live Báo Cáo 1 Ngày Làm Việc)
    15. `tests/simulation_mode_guard.test.cjs` (Cô lập chế độ Mô phỏng & Thực tế)
    16. `tests/cross_device_sync.test.cjs` (Đồng bộ trạng thái giữa các thiết bị qua API/SSE)
    17. `tests/http_telemetry_history.test.cjs` (Lưu trữ và hiển thị telemetry ESP32 HTTP POST)
    18. `tests/security_audit_remediation.test.cjs` (Kiểm thử bảo mật, ESTOP ACK, config validation)
    19. `tests/anti_ai_industrial_scada_ui.test.cjs` (Chuẩn giao diện SCADA công nghiệp, Zero-Scroll, F11 Kiosk)
    20. `tests/telegram_copilot_2way_and_screenfit.test.cjs` (Telegram Bot SCADA 2 chiều & Mật độ hiển thị Display Density)
    21. `tests/mute_siren_feature.test.cjs` (Tính năng tắt còi báo động tạm thời)
    22. `tests/new_day_report_tele_email.test.cjs` (Báo cáo ngày mới gửi qua Telegram/Email)
    23. `tests/daily_production_cumulative.test.cjs` (Cộng dồn sản lượng theo ngày)
    24. `tests/auto_stop_on_all_items_in_trays.test.cjs` (Tự động dừng khi phôi đã vào hết các khay)
    25. `tests/ghost_item_prevention.test.cjs` (Chống tạo phôi ma/ảo trên băng tải)
    26. `tests/four_user_requests_upgrade.test.cjs` (Bộ 4 tính năng nâng cấp trải nghiệm người dùng)
- **Lệnh thực thi kiểm thử trước khi bàn giao**:
  ```powershell
  npm test
  ```
  Tất cả các bộ kiểm thử tự động phải được bảo toàn và đạt chuẩn. Tuyệt đối không xóa hoặc bỏ qua các test.

---

## 7. Nguyên Tắc Phát Triển Mobile App & Đồng Bộ 1-Codebase

- **Quy Tắc 1-Codebase Bất Biến**:
  - Mọi tính năng mới, sửa lỗi hay tinh chỉnh giao diện đều phải được thực hiện trên codebase chung Next.js 14 (`frontend/src/`).
  - Tuyệt đối không tạo mã nguồn frontend riêng biệt hay phân mảnh logic cho Mobile.
- **Nghiêm Cấm Bật `output: 'export'`**:
  - Không được thêm `output: 'export'` vào `next.config.mjs` vì sẽ vô hiệu hóa các API route handlers dynamic (`/api/safety`, `/api/auth`, `/api/history`, v.v.) và SSE stream thời gian thực (`/api/events`).
  - Ứng dụng di động luôn sử dụng Capacitor WebView kết nối tới `server.url` (máy chủ Next.js).
- **Tương Thích Đa Màn Hình & Cảm Ứng Di Động**:
  - Mọi giao diện phải đáp ứng tốt cả màn hình Desktop lớn (>= 1024px) và màn hình điện thoại di động (< 640px).
  - Không để các phần tử tràn ngang làm vỡ layout (sử dụng `truncate`, `shrink-0`, `flex-wrap` hợp lý).
  - Đảm bảo Viewport cấu hình `maximumScale: 1, userScalable: false` để chống zoom ngoài ý muốn khi thao tác trên Canvas 60fps.
- **Quy Trình Đồng Bộ Capacitor (Capacitor Sync Workflow)**:
  - Khi có thay đổi Frontend cần phản ánh vào bản build Android Native, bắt buộc thực hiện theo trình tự:
    ```powershell
    npm run build
    npm run cap:sync
    ```
  - Sau đó mở Android Studio qua `npm run cap:open` để build APK mới.
- **Địa Chỉ Mạng Cho Thiết Bị Thử Nghiệm**:
  - Máy ảo Android Studio Emulator bắt buộc sử dụng IP host: `http://10.0.2.2:3000`.
  - Thiết bị thật thử nghiệm qua Wi-Fi cục bộ sử dụng IP LAN máy chủ: `http://<LAN_IP>:3000`.
  - Không dùng `http://localhost:3000` trong cấu hình Capacitor vì môi trường máy ảo sẽ hiểu nhầm localhost là chính nó.
