#pragma once

#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    SYSTEM_STATE_IDLE = 0,      // Trạng thái khởi động an toàn / Chờ lệnh BẮT ĐẦU (START)
    SYSTEM_STATE_RUNNING,       // Băng tải đang chạy và hệ thống phân loại đang hoạt động
    SYSTEM_STATE_STOPPED,       // Dừng có kiểm soát do người vận hành hoặc hết thời gian chờ thị giác máy
    SYSTEM_STATE_JAMMED,        // Khóa khẩn cấp do kẹt cơ khí / dừng quay xung encoder
    SYSTEM_STATE_ESTOP          // Khóa dừng khẩn cấp toàn hệ thống (E-Stop)
} system_state_t;

typedef enum {
    SYSTEM_EVENT_START = 0,     // Nhấn nút Start vật lý hoặc nhận lệnh START qua MQTT
    SYSTEM_EVENT_STOP,          // Lệnh STOP từ MQTT hoặc dừng giữ vật thể
    SYSTEM_EVENT_JAM_DETECTED,  // Phát hiện dừng quay encoder khi đang chạy
    SYSTEM_EVENT_ESTOP_RELEASE, // Lệnh mở khóa ESTOP_RELEASE (chuyển về IDLE, KHÔNG tự ý bật động cơ)
    SYSTEM_EVENT_ESTOP          // Kích hoạt dừng khẩn cấp (qua nút phần cứng hoặc MQTT)
} system_event_t;

typedef void (*state_change_cb_t)(system_state_t old_state, system_state_t new_state, void *user_ctx);

/**
 * @brief Khởi tạo máy trạng thái toàn hệ thống.
 *        Luôn khởi động an toàn về trạng thái SYSTEM_STATE_IDLE.
 * @return ESP_OK nếu khởi tạo thành công.
 */
esp_err_t state_machine_init(void);

/**
 * @brief Yêu cầu chuyển đổi trạng thái dựa trên sự kiện kích hoạt.
 *        Hàm đảm bảo an toàn đa luồng (Thread-safe).
 * @param event Sự kiện yêu cầu chuyển trạng thái.
 * @return ESP_OK nếu chuyển đổi hợp lệ và được chấp thuận, ESP_ERR_INVALID_STATE nếu bị từ chối.
 */
esp_err_t state_machine_process_event(system_event_t event);

/**
 * @brief Lấy trạng thái hệ thống hiện tại.
 */
system_state_t state_machine_get_state(void);

/**
 * @brief Lấy chuỗi ký tự mô tả trạng thái hiện tại ("IDLE", "RUNNING", "STOPPED", "JAMMED", "ESTOP").
 */
const char *state_machine_get_state_str(system_state_t state);

/**
 * @brief Đăng ký hàm callback thông báo khi có sự thay đổi trạng thái hệ thống.
 */
void state_machine_register_callback(state_change_cb_t cb, void *user_ctx);

#ifdef __cplusplus
}
#endif
