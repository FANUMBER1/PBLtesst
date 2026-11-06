#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    char wifi_ssid[33];
    char wifi_pass[65];
    char mqtt_broker_uri[128];
    char mqtt_user[64];
    char mqtt_pass[64];
    char control_secret[64];
    char http_telemetry_url[128];
    char device_id[32];
    uint32_t active_config_version;
    int fallback_policy;        // 0 = PAUSE_AND_HOLD (Dừng giữ), 1 = DIVERT_TO_DEFAULT (Đẩy vào khay mặc định)
    float counts_per_mm;
    float dist_s1_servo1_mm;
    float dist_s1_servo2_mm;
    float dist_s1_end_mm;
} sortix_sys_config_t;

/**
 * @brief Khởi tạo phân vùng bộ nhớ NVS flash và nạp cấu hình hệ thống.
 *        Nếu chưa từng lưu cấu hình trong NVS, nạp các giá trị mặc định của firmware.
 * @return ESP_OK nếu thành công.
 */
esp_err_t nvs_config_init(void);

/**
 * @brief Lấy con trỏ tham chiếu đến cấu hình hệ thống đang hoạt động toàn cục.
 */
const sortix_sys_config_t *nvs_config_get(void);

/**
 * @brief Cập nhật và lưu cấu hình hệ thống vào bộ nhớ flash NVS.
 * @param cfg Cấu trúc dữ liệu cấu hình mới.
 * @return ESP_OK nếu thành công.
 */
esp_err_t nvs_config_save(const sortix_sys_config_t *cfg);
esp_err_t nvs_config_save_portal_config(const sortix_sys_config_t *cfg, const char *device_token);

/**
 * @brief Khôi phục cài đặt gốc của hệ thống trong bộ nhớ NVS.
 */
esp_err_t nvs_config_factory_reset(void);

/** Lấy token API lưu riêng biệt, chỉ sử dụng cho xác thực HTTPS telemetry. */
const char *nvs_config_get_device_token(void);

/** Lưu DEVICE_TOKEN độc lập mà không làm thay đổi cấu trúc blob hệ thống NVS. */
esp_err_t nvs_config_save_device_token(const char *token);

/** Lưu / đọc chuỗi JSON cấu hình phân loại hợp lệ qua các lần khởi động lại chip. */
esp_err_t nvs_config_save_sorter_config(const char *json);
esp_err_t nvs_config_load_sorter_config(char *buffer, size_t buffer_size);

#ifdef __cplusplus
}
#endif
