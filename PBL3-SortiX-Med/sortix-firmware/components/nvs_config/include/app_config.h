#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * =============================================================================
 * Cấu hình ứng dụng SortiX & Định nghĩa các giao thức truyền thông
 * =============================================================================
 */

// Định danh thiết bị (Thống nhất trên MQTT, HTTP và SortiX-Dashboard)
#define SORTIX_DEVICE_ID                    "sorter_01"

// Chính sách dự phòng khi mất kết nối MQTT hoặc quá thời gian chờ thị giác máy AI
#define FALLBACK_POLICY_PAUSE_AND_HOLD      0   // An toàn: Dừng băng tải ngay lập tức, nhấp nháy LED cảnh báo
#define FALLBACK_POLICY_DIVERT_TO_DEFAULT   1   // Tiếp tục chạy: Cho vật thể trôi về khay mặc định (Khay 3) dưới dạng diverted_default

#ifndef SORTIX_FALLBACK_POLICY
#define SORTIX_FALLBACK_POLICY              FALLBACK_POLICY_PAUSE_AND_HOLD
#endif

// =============================================================================
// Các MQTT Topic (Đồng bộ 100% với SortiX-Dashboard DEFAULT_MQTT_TOPICS)
// =============================================================================

// Chiều nhận (ESP32 Subscribe nhận lệnh)
#define SORTIX_TOPIC_VISION                 "sorter/sorter_01/vision"
#define SORTIX_TOPIC_CONTROL                "sorter/sorter_01/control"
#define SORTIX_TOPIC_ESTOP                  "conveyor/safety/estop"
#define SORTIX_TOPIC_ESTOP_RELEASE          "conveyor/safety/estop/release"
#define SORTIX_TOPIC_CONFIG_SET             "sorter/sorter_01/config/set"

// Chiều phát (ESP32 Publish gửi dữ liệu)
#define SORTIX_TOPIC_TELEMETRY              "sorter/sorter_01/telemetry"
#define SORTIX_TOPIC_STATUS                 "sorter/sorter_01/status"
#define SORTIX_TOPIC_CONFIG_STATUS          "sorter/sorter_01/config/status"
#define SORTIX_TOPIC_CLASSIFICATION         "sorter/sorter_01/classification"
#define SORTIX_TOPIC_HEARTBEAT              "conveyor/heartbeat"
#define SORTIX_TOPIC_JAM                    "conveyor/sensor/jam"
#define SORTIX_TOPIC_TEMP_WARN              "conveyor/telemetry/temp"
#define SORTIX_TOPIC_ESTOP_ACK              "conveyor/safety/estop/ack"

// Khóa bí mật chung (shared secret) được cấu hình qua cổng Captive Portal và phải khớp với
// biến SORTIX_CONTROL_SECRET trên Dashboard/backend.
#define SORTIX_CONTROL_SECRET               "sortix_sec_control_2026"

// Thông tin đăng nhập và endpoint dịch vụ được cấu hình riêng cho từng môi trường thực tế.
#define DEFAULT_WIFI_SSID                   "KTKH 207 B1 2.4G"          // Tên mạng Wi-Fi (SSID)
#define DEFAULT_WIFI_PASS                   "duyphongnguyen"            // Mật khẩu Wi-Fi
#define DEFAULT_MQTT_BROKER_URI             "mqtts://broker.emqx.io:8883"                // Địa chỉ máy chủ MQTT Broker
#define DEFAULT_HTTP_TELEMETRY_URL          "http://192.168.1.100:5000/api/telemetry"    // Đường dẫn gửi HTTP Telemetry

// wifi_manager sẽ tự tạo SSID duy nhất và mật khẩu ngẫu nhiên nếu để trống
#define SOFTAP_SSID                         "SortiX-Setup"
#define SOFTAP_PASS                         "12345678"

// =============================================================================
// Giả định cơ khí & Hiệu chuẩn (CẦN ĐƯỢC HIỆU CHUẨN TRÊN PHẦN CỨNG THỰC TẾ)
// =============================================================================
// Ghi chú: Động cơ JGB37-520 12V 66RPM (Hộp số giảm tốc ~90:1, 11 xung/vòng trên trục motor).
// Chế độ giải mã xung PCNT quadrature 4x tạo ra ~3960 xung/vòng trên trục ra của hộp số.
// Các khoảng cách và ngưỡng bên dưới là các tham số ban đầu cần hiệu chuẩn thực tế.
#define CALIB_ENCODER_COUNTS_PER_REV        3960
#define CALIB_ENCODER_COUNTS_PER_MM         31.5f       // ~31.5 xung trên mỗi mm hành trình di chuyển của băng tải
#define CONVEYOR_NOMINAL_SPEED_PCT          60          // Thang đo 0-100 theo chuẩn quy định của TelemetrySchema

#define DIST_S1_TO_SERVO1_MM                200.0f      // Khoảng cách từ cảm biến hồng ngoại S1 đến Cần gạt 1 (Trạm 1)
#define DIST_S1_TO_SERVO2_MM                400.0f      // Khoảng cách từ cảm biến hồng ngoại S1 đến Cần gạt 2 (Trạm 2)
#define DIST_S1_TO_END_MM                   540.0f      // Khoảng cách từ cảm biến hồng ngoại S1 đến cuối băng tải (Khay 3)
#define SERVO_TRIGGER_WINDOW_MM             15.0f       // Dung sai khoảng cách (cửa sổ kích hoạt) quanh vị trí mục tiêu để gạt

// Thời gian chờ & Khoảng thời gian giám sát an toàn
#define VISION_TIMEOUT_MS                   1000        // Thời gian chờ kết quả AI (YOLO) trước khi kích hoạt chính sách dự phòng
#define JAM_STARTUP_GRACE_MS                1000        // Bỏ qua kiểm tra kẹt trong giai đoạn khởi động tăng tốc động cơ ban đầu
#define JAM_DETECTION_WINDOW_MS             1800        // Nếu không có xung encoder trong 1.8s khi động cơ đang chạy -> Báo kẹt (JAM)
#define CPU_TEMP_ALERT_THRESHOLD_C          75.0f       // Ngưỡng nhiệt độ cảnh báo quá nhiệt trên chip SoC (độ C)
#define TELEMETRY_PUBLISH_INTERVAL_MS       1500        // Chu kỳ gửi dữ liệu đo đạc từ xa qua MQTT (1.5s)
#define HEARTBEAT_INTERVAL_MS               2000        // Chu kỳ phát tin hiệu nhịp tim (heartbeat) qua MQTT (2s)
#define HTTP_TELEMETRY_INTERVAL_MS          5000        // Chu kỳ gửi dữ liệu HTTP POST telemetry (5s)
#define SOFTAP_TRIGGER_TIMEOUT_SEC          10          // Mất kết nối Wi-Fi quá 10s sẽ tự động bật SoftAP + Captive Portal

#define MAX_TRACKED_ITEMS                   15          // Số lượng vật thể tối đa theo dõi đồng thời trong hàng đợi vòng FIFO
