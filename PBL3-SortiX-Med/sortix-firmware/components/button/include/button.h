#pragma once

#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*button_cb_t)(void *user_ctx);

/**
 * @brief Khởi tạo Nút nhấn Bắt đầu (Start Button) trên chân GPIO23.
 *        Cấu hình ngắt cạnh xuống (falling edge) và software timer chống rung phím (debounce) 20ms.
 * @param on_pressed_cb Con trỏ hàm callback được gọi khi xác nhận có nhấn nút hợp lệ.
 * @param user_ctx Con trỏ ngữ cảnh người dùng truyền vào callback.
 * @return ESP_OK nếu khởi tạo thành công.
 */
esp_err_t button_init(button_cb_t on_pressed_cb, void *user_ctx);

/**
 * @brief Đọc mức logic vật lý tức thời của chân nút nhấn.
 * @return 0 nếu đang nhấn (LOW), 1 nếu đang nhả (HIGH).
 */
int button_get_level(void);

#ifdef __cplusplus
}
#endif
