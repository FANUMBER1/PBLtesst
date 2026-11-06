#pragma once

#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Khởi động máy chủ web HTTP cấu hình mạng nội bộ (Captive Portal) trên cổng 80.
 * @return ESP_OK nếu thành công.
 */
esp_err_t captive_portal_start(void);

/**
 * @brief Dừng máy chủ web HTTP cấu hình Captive Portal.
 */
void captive_portal_stop(void);

#ifdef __cplusplus
}
#endif
