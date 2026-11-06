#pragma once

#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Khởi tạo client gửi dữ liệu đo đạc từ xa HTTP Telemetry.
 * @return ESP_OK nếu thành công.
 */
esp_err_t http_telemetry_init(void);

/**
 * @brief Gửi một gói dữ liệu HTTP POST telemetry tới máy chủ backend.
 *        Gói tin bao gồm: device_id, nhiệt độ CPU hợp lệ, trạng thái lệnh động cơ,
 *        tốc độ encoder tức thời, trạng thái cảm biến S1, số xung encoder và trạng thái chưa xác định của S2/S3.
 * @return ESP_OK nếu gửi thành công, mã lỗi nếu thất bại.
 */
esp_err_t http_telemetry_send_post(void);

#ifdef __cplusplus
}
#endif
