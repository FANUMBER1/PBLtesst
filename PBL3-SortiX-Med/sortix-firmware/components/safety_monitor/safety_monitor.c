#include "safety_monitor.h"
#include "encoder.h"
#include "motor_control.h"
#include "state_machine.h"
#include "driver/temperature_sensor.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/portmacro.h"
#include <math.h>

static const char *TAG = "SAFETY_MONITOR";

#define JAM_STARTUP_GRACE_US        1000000 // Thời gian trễ 1.0s sau khi bật động cơ để tránh báo động giả lúc khởi động
#define JAM_DETECTION_WINDOW_US     1800000 // Khoảng thời gian 1.8s không có xung khi động cơ đang chạy -> Kẹt băng tải (JAM)
#define TEMP_CHECK_INTERVAL_US      2000000 // Kiểm tra nhiệt độ định kỳ mỗi 2.0s
#define TEMP_ALERT_COOLDOWN_US      10000000 // Thời gian giãn cách 10s giữa các lần cảnh báo quá nhiệt liên tiếp
#define CPU_TEMP_ALERT_THRESHOLD    75.0f

static temperature_sensor_handle_t s_temp_sensor = NULL;
static float s_latest_temp = 0.0f;
static bool s_temp_sample_valid = false;
static portMUX_TYPE s_temp_mux = portMUX_INITIALIZER_UNLOCKED;

static jam_alert_cb_t s_jam_cb = NULL;
static void *s_jam_user_ctx = NULL;

static temp_alert_cb_t s_temp_cb = NULL;
static void *s_temp_user_ctx = NULL;

static bool s_was_running = false;
static int64_t s_motor_start_time_us = 0;
static int64_t s_last_encoder_count = 0;
static int64_t s_last_movement_time_us = 0;
static int64_t s_last_temp_check_us = 0;
static int64_t s_last_temp_alert_us = 0;
static int64_t s_speed_last_count = 0;
static int64_t s_speed_last_sample_us = 0;
static bool s_speed_baseline_valid = false;
static float s_conveyor_speed_mm_s = 0.0f;
static bool s_speed_sample_valid = false;
static portMUX_TYPE s_speed_mux = portMUX_INITIALIZER_UNLOCKED;

esp_err_t safety_monitor_init(void)
{
    ESP_LOGI(TAG, "Initializing Safety Monitor (Internal SoC Temperature & Encoder Stall)");

    // Khởi tạo cảm biến nhiệt độ tích hợp trong chip SoC
    temperature_sensor_config_t temp_sensor_config = TEMPERATURE_SENSOR_CONFIG_DEFAULT(10, 80);
    esp_err_t ret = temperature_sensor_install(&temp_sensor_config, &s_temp_sensor);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Could not install required temperature sensor: %s", esp_err_to_name(ret));
        return ret;
    }
    ret = temperature_sensor_enable(s_temp_sensor);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Could not enable required temperature sensor: %s", esp_err_to_name(ret));
        return ret;
    }
    float initial_temp = 0.0f;
    ret = temperature_sensor_get_celsius(s_temp_sensor, &initial_temp);
    if (ret != ESP_OK || !isfinite(initial_temp)) {
        ESP_LOGE(TAG, "Could not obtain a valid initial temperature sample: %s", esp_err_to_name(ret));
        return ret != ESP_OK ? ret : ESP_ERR_INVALID_RESPONSE;
    }
    s_latest_temp = initial_temp;
    s_temp_sample_valid = true;
    ESP_LOGI(TAG, "SoC Temperature sensor enabled. Initial reading: %.1f °C", s_latest_temp);

    s_was_running = false;
    ret = encoder_get_count_checked(&s_speed_last_count);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Could not obtain initial encoder sample: %s", esp_err_to_name(ret));
        return ret;
    }
    s_speed_last_sample_us = esp_timer_get_time();
    s_speed_baseline_valid = true;
    s_speed_sample_valid = false;
    return ESP_OK;
}

void safety_monitor_set_jam_callback(jam_alert_cb_t cb, void *user_ctx)
{
    s_jam_cb = cb;
    s_jam_user_ctx = user_ctx;
}

void safety_monitor_set_temp_callback(temp_alert_cb_t cb, void *user_ctx)
{
    s_temp_cb = cb;
    s_temp_user_ctx = user_ctx;
}

bool safety_monitor_get_cpu_temp(float *temperature_c)
{
    if (temperature_c == NULL) return false;
    portENTER_CRITICAL(&s_temp_mux);
    bool valid = s_temp_sample_valid;
    float value = s_latest_temp;
    portEXIT_CRITICAL(&s_temp_mux);
    if (valid) *temperature_c = value;
    return valid;
}

bool safety_monitor_get_conveyor_speed_mm_s(float *speed_mm_s)
{
    if (speed_mm_s == NULL) return false;
    int64_t now_us = esp_timer_get_time();
    portENTER_CRITICAL(&s_speed_mux);
    bool valid = s_speed_sample_valid && (now_us - s_speed_last_sample_us) <= 150000;
    float speed = s_conveyor_speed_mm_s;
    portEXIT_CRITICAL(&s_speed_mux);
    if (valid) *speed_mm_s = speed;
    return valid;
}

void safety_monitor_check(void)
{
    int64_t now_us = esp_timer_get_time();

    // Lấy mẫu chuyển động thực tế của băng tải từ encoder, bao gồm cả giai đoạn thả trôi/hãm.
    int64_t speed_count = 0;
    esp_err_t speed_count_ret = encoder_get_count_checked(&speed_count);
    if (speed_count_ret != ESP_OK) {
        s_speed_baseline_valid = false;
        portENTER_CRITICAL(&s_speed_mux);
        s_speed_sample_valid = false;
        s_speed_last_sample_us = now_us;
        portEXIT_CRITICAL(&s_speed_mux);
        ESP_LOGW(TAG, "Encoder read failed; measured conveyor speed is unavailable");
    } else if (!s_speed_baseline_valid || now_us <= s_speed_last_sample_us) {
        s_speed_last_count = speed_count;
        s_speed_last_sample_us = now_us;
        s_speed_baseline_valid = true;
        portENTER_CRITICAL(&s_speed_mux);
        s_speed_sample_valid = false;
        portEXIT_CRITICAL(&s_speed_mux);
    } else {
        float counts_per_mm = encoder_get_counts_per_mm();
        int64_t elapsed_us = now_us - s_speed_last_sample_us;
        if (counts_per_mm > 0.001f) {
            float speed = fabsf((float)(speed_count - s_speed_last_count) / counts_per_mm) *
                          1000000.0f / (float)elapsed_us;
            if (isfinite(speed)) {
                portENTER_CRITICAL(&s_speed_mux);
                s_conveyor_speed_mm_s = speed;
                s_speed_sample_valid = true;
                s_speed_last_sample_us = now_us;
                portEXIT_CRITICAL(&s_speed_mux);
            }
        }
        s_speed_last_count = speed_count;
    }

    // 1. Kiểm tra nhiệt độ bên trong chip SoC định kỳ mỗi 2 giây
    if (s_temp_sensor != NULL && (now_us - s_last_temp_check_us) >= TEMP_CHECK_INTERVAL_US) {
        s_last_temp_check_us = now_us;
        float current_temp = 0.0f;
        if (temperature_sensor_get_celsius(s_temp_sensor, &current_temp) == ESP_OK) {
            if (!isfinite(current_temp)) {
                portENTER_CRITICAL(&s_temp_mux);
                s_temp_sample_valid = false;
                portEXIT_CRITICAL(&s_temp_mux);
                ESP_LOGW(TAG, "Temperature sensor returned a non-finite sample");
            } else {
                portENTER_CRITICAL(&s_temp_mux);
                s_latest_temp = current_temp;
                s_temp_sample_valid = true;
                portEXIT_CRITICAL(&s_temp_mux);
            }
            if (isfinite(current_temp) && current_temp >= CPU_TEMP_ALERT_THRESHOLD) {
                if ((now_us - s_last_temp_alert_us) >= TEMP_ALERT_COOLDOWN_US) {
                    s_last_temp_alert_us = now_us;
                    ESP_LOGW(TAG, "SoC Over-temperature WARNING: %.1f °C (Threshold: %.1f °C)",
                             current_temp, CPU_TEMP_ALERT_THRESHOLD);
                    if (s_temp_cb != NULL) {
                        s_temp_cb(current_temp, CPU_TEMP_ALERT_THRESHOLD, s_temp_user_ctx);
                    }
                }
            }
        } else {
            portENTER_CRITICAL(&s_temp_mux);
            s_temp_sample_valid = false;
            portEXIT_CRITICAL(&s_temp_mux);
            ESP_LOGW(TAG, "Temperature sensor read failed; telemetry temperature is unavailable");
        }
    }

    // 2. Kiểm tra dừng encoder / kẹt cơ khí băng tải
    bool is_running = motor_control_is_running();
    if (is_running) {
        if (!s_was_running) {
            // Động cơ vừa bắt đầu chuyển sang trạng thái chạy thuận
            s_was_running = true;
            s_motor_start_time_us = now_us;
            s_last_encoder_count = encoder_get_count();
            s_last_movement_time_us = now_us;
            return;
        }

        // Kiểm tra xem đã vượt qua thời gian trễ khởi động ban đầu chưa
        if ((now_us - s_motor_start_time_us) >= JAM_STARTUP_GRACE_US) {
            int64_t current_count = encoder_get_count();
            if (current_count != s_last_encoder_count) {
                // Số xung encoder đang tăng/giảm bình thường (băng tải đang quay)
                s_last_encoder_count = current_count;
                s_last_movement_time_us = now_us;
            } else {
                // Số xung encoder không thay đổi (băng tải bị đứng im)
                int64_t stall_duration_us = now_us - s_last_movement_time_us;
                if (stall_duration_us >= JAM_DETECTION_WINDOW_US) {
                    float duration_sec = (float)stall_duration_us / 1000000.0f;
                    ESP_LOGE(TAG, "ENCODER STALL DETECTED! Conveyor stationary for %.2fs while motor running!",
                             duration_sec);

                    // Kích hoạt máy trạng thái xử lý sự kiện kẹt băng tải khẩn cấp
                    state_machine_process_event(SYSTEM_EVENT_JAM_DETECTED);
                    s_was_running = false;

                    if (s_jam_cb != NULL) {
                        s_jam_cb(duration_sec, s_jam_user_ctx);
                    }
                }
            }
        }
    } else {
        s_was_running = false;
    }
}
