#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int64_t encoder_count;      // Giá trị chốt số xung encoder PCNT tại thời điểm bắt cạnh phát hiện
    int64_t timestamp_us;       // Dấu thời gian hệ thống (micro giây) tại thời điểm phát hiện
} s1_event_t;

/**
 * @brief Khởi tạo Cảm biến hồng ngoại S1 (GPIO0) và Cảm biến quang trở LDR (GPIO5).
 *        Gắn ngắt cạnh xuống vào GPIO0 và đẩy các sự kiện phát hiện vật thể vào hàng đợi (queue).
 * @param event_queue Handle hàng đợi để nhận các cấu trúc s1_event_t.
 * @return ESP_OK nếu khởi tạo thành công.
 */
esp_err_t sensors_init(QueueHandle_t event_queue);

/**
 * @brief Đọc trạng thái vật lý tức thời của cảm biến hồng ngoại S1.
 * @return true nếu có vật thể đang che cảm biến S1 (chân ở mức LOW, tích cực mức thấp).
 */
bool sensors_is_s1_blocked(void);

/**
 * @brief Đọc mức logic tức thời của cảm biến quang trở LDR (GPIO5).
 * @return Mức logic 0 hoặc 1.
 */
int sensors_get_ldr_level(void);

/** Đọc và xóa cờ báo hiệu xảy ra tràn hàng đợi sự kiện S1 trong ngắt ISR. */
bool sensors_take_s1_queue_overflow(void);

#ifdef __cplusplus
}
#endif
