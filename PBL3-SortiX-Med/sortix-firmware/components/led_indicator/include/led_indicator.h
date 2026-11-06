#pragma once

#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    LED_MODE_OFF = 0,
    LED_MODE_IDLE,          // Nhấp nháy chậm (1 Hz): 500ms SÁNG / 500ms TẮT (chế độ chờ)
    LED_MODE_RUNNING,       // Sáng liên tục (hệ thống đang chạy bình thường)
    LED_MODE_JAMMED,        // Nhấp nháy nhanh (5 Hz): 100ms SÁNG / 100ms TẮT (kẹt cơ cấu phân loại)
    LED_MODE_ERROR          // Nhấp nháy nhanh (5 Hz): 100ms SÁNG / 100ms TẮT (báo lỗi hệ thống)
} led_mode_t;

/**
 * @brief Khởi tạo LED trạng thái trên chân GPIO10.
 *        Khởi chạy software timer định kỳ 100ms để tạo hiệu ứng nhấp nháy non-blocking (không chặn CPU).
 * @return ESP_OK nếu thành công.
 */
esp_err_t led_indicator_init(void);

/**
 * @brief Thiết lập chế độ hiển thị hiện tại của LED trạng thái.
 *        Hàm đảm bảo an toàn đa luồng (Thread-safe).
 * @param mode Chế độ hiển thị mục tiêu.
 */
void led_indicator_set_mode(led_mode_t mode);

/**
 * @brief Lấy chế độ hiển thị hiện tại của LED trạng thái.
 */
led_mode_t led_indicator_get_mode(void);

#ifdef __cplusplus
}
#endif
