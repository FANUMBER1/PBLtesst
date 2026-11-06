#pragma once

#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    WIFI_STATE_DISCONNECTED = 0,    // Mất kết nối Wi-Fi
    WIFI_STATE_CONNECTING,          // Đang kết nối tới điểm truy cập Wi-Fi
    WIFI_STATE_CONNECTED,           // Đã kết nối thành công và nhận được địa chỉ IP
    WIFI_STATE_AP_FALLBACK          // Chuyển sang chế độ dự phòng phát điểm truy cập SoftAP
} wifi_manager_state_t;

/**
 * @brief Khởi tạo Wi-Fi Station và kết nối bằng thông tin SSID/mật khẩu đã lưu.
 * @return ESP_OK nếu thành công.
 */
esp_err_t wifi_manager_init(void);

/**
 * @brief Kiểm tra xem Wi-Fi Station đã nhận được địa chỉ IP thành công hay chưa.
 */
bool wifi_manager_is_connected(void);

/**
 * @brief Lấy cường độ tín hiệu sóng Wi-Fi hiện tại (RSSI theo đơn vị dBm).
 * @return Giá trị RSSI (ví dụ: -58 dBm), hoặc -100 nếu mất kết nối.
 */
int8_t wifi_manager_get_rssi(void);

/**
 * @brief Lấy chuỗi địa chỉ IPv4 hiện tại của thiết bị.
 * @param buffer Bộ đệm ký tự đầu ra (tối thiểu 16 byte).
 * @param max_len Kích thước của bộ đệm.
 */
void wifi_manager_get_ip_str(char *buffer, size_t max_len);

/**
 * @brief Lấy chuỗi hiển thị băng tần Wi-Fi đang kết nối ("2.4 GHz" hoặc "5.0 GHz (Wi-Fi 6)").
 */
const char *wifi_manager_get_band_str(void);

/**
 * @brief Buộc chuyển sang chế độ SoftAP phát Wi-Fi để cấu hình thiết bị qua Captive Portal.
 */
esp_err_t wifi_manager_start_softap(void);

#ifdef __cplusplus
}
#endif
