#pragma once

#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*jam_alert_cb_t)(float duration_seconds, void *user_ctx);
typedef void (*temp_alert_cb_t)(float current_temp, float threshold_temp, void *user_ctx);

/**
 * @brief Khởi tạo phân hệ Giám sát An toàn (Safety Monitor):
 *        - Cảm biến nhiệt độ tích hợp trong chip SoC (driver/temperature_sensor.h)
 *        - Bộ phát hiện kẹt cơ khí / dừng quay encoder bất thường
 * @return ESP_OK nếu thành công.
 */
esp_err_t safety_monitor_init(void);

/**
 * @brief Đăng ký hàm callback xử lý sự kiện khi phát hiện kẹt cơ cấu/encoder ngừng quay bất thường.
 */
void safety_monitor_set_jam_callback(jam_alert_cb_t cb, void *user_ctx);

/**
 * @brief Đăng ký hàm callback xử lý sự kiện khi nhiệt độ chip SoC vượt ngưỡng an toàn.
 */
void safety_monitor_set_temp_callback(temp_alert_cb_t cb, void *user_ctx);

/**
 * @brief Đọc nhiệt độ CPU tức thời của chip SoC (đơn vị độ C).
 */
bool safety_monitor_get_cpu_temp(float *temperature_c);

/** Lấy mẫu tốc độ băng tải tức thời tính toán từ encoder (đơn vị mm/s). */
bool safety_monitor_get_conveyor_speed_mm_s(float *speed_mm_s);

/**
 * @brief Hàm kiểm tra giám sát an toàn định kỳ.
 *        Được gọi bởi FreeRTOS safety task hoặc FreeRTOS software timer.
 */
void safety_monitor_check(void);

#ifdef __cplusplus
}
#endif
