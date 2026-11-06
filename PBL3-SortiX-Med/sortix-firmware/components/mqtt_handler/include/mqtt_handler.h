#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"
#include "sorting_engine.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Khởi tạo MQTT client, đăng ký các topic và hàm xử lý callback, bắt đầu kết nối tới Broker.
 * @return ESP_OK nếu thành công.
 */
esp_err_t mqtt_handler_init(void);

/**
 * @brief Kiểm tra xem MQTT client hiện có đang kết nối với Broker hay không.
 */
bool mqtt_handler_is_connected(void);

/**
 * @brief Phát dữ liệu đo từ xa (telemetry) định kỳ khớp với cấu trúc TelemetrySchema của SortiX-Dashboard.
 */
esp_err_t mqtt_handler_publish_telemetry(void);

/**
 * @brief Phát gói tin nhịp tim (heartbeat) định kỳ khớp với HeartbeatPayloadSchema.
 */
esp_err_t mqtt_handler_publish_heartbeat(void);

/**
 * @brief Phát chuỗi trạng thái hoạt động của hệ thống ("IDLE", "RUNNING", "STOPPED", "JAMMED", "ESTOP").
 * @param status_str Chuỗi ký tự trạng thái.
 */
esp_err_t mqtt_handler_publish_status(const char *status_str);

/**
 * @brief Phát bản ghi phân loại vật thể hoàn tất khớp với ClassificationRecordSchema.
 * @param item Con trỏ tới cấu trúc dữ liệu tracked_item_t.
 */
esp_err_t mqtt_handler_publish_classification(const tracked_item_t *item);

/**
 * @brief Phát sự kiện cảnh báo kẹt cơ cấu băng tải khớp với JamDetectedPayloadSchema.
 * @param duration_seconds Thời gian dừng trệ băng tải tính bằng giây.
 */
esp_err_t mqtt_handler_publish_jam(float duration_seconds);

/**
 * @brief Phát cảnh báo quá nhiệt chip SoC khớp với TemperatureWarningPayloadSchema.
 * @param current_temp Nhiệt độ hiện tại đo được (độ C).
 * @param threshold_temp Ngưỡng nhiệt độ kích hoạt cảnh báo (độ C).
 */
esp_err_t mqtt_handler_publish_temp_warning(float current_temp, float threshold_temp);

/**
 * @brief Phát phản hồi trạng thái cho yêu cầu cập nhật cấu hình phân loại SorterConfig.
 * @param applied Trạng thái cấu hình được áp dụng ngay hay đang xếp hàng chờ.
 * @param version Số hiệu phiên bản cấu hình đang hoạt động hoặc đang chờ.
 * @param error_reason Lý do từ chối nếu có lỗi, hoặc NULL nếu thành công.
 */
esp_err_t mqtt_handler_publish_config_status(bool applied, uint32_t version, const char *error_reason);

/**
 * @brief Phát tin xác nhận dừng khẩn cấp (E-Stop ACK) sau khi kiểm tra trạng thái động cơ và tốc độ đo được.
 */
esp_err_t mqtt_handler_publish_estop_ack(esp_err_t command_result);

#ifdef __cplusplus
}
#endif
