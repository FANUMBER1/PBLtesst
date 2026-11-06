#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    SERVO_ID_1 = 0,     // Cần gạt 1: GPIO6 (Ngăn phân loại 1)
    SERVO_ID_2,         // Cần gạt 2: GPIO7 (Ngăn phân loại 2)
    SERVO_COUNT
} servo_id_t;

typedef enum {
    SERVO_STATE_IDLE = 0,    // Trạng thái chờ / thu cần gạt về
    SERVO_STATE_OPENING,     // Đang mở cần gạt ra
    SERVO_STATE_HOLDING,     // Giữ cần gạt tại vị trí gạt vật thể
    SERVO_STATE_CLOSING      // Đang đóng thu cần gạt về vị trí ban đầu
} servo_fsm_state_t;

/**
 * @brief Khởi tạo 2 động cơ servo MG996R thông qua LEDC PWM tần số 50Hz (GPIO6 và GPIO7).
 *        Thiết lập máy trạng thái (FSM) điều khiển bằng timer non-blocking (không chặn). Cả 2 cần gạt bắt đầu ở trạng thái IDLE (thu về).
 * @return ESP_OK nếu thành công.
 */
esp_err_t servo_init(void);

/**
 * @brief Kích hoạt một chu kỳ gạt phân loại non-blocking cho servo chỉ định.
 *        Chuyển đổi trạng thái FSM: IDLE -> OPENING -> HOLDING -> CLOSING -> IDLE.
 *        Hàm KHÔNG chặn (block) tác vụ gọi!
 * @param id SERVO_ID_1 hoặc SERVO_ID_2.
 * @return ESP_OK nếu kích hoạt thành công, ESP_ERR_INVALID_STATE nếu servo đang trong chu kỳ quay.
 */
esp_err_t servo_trigger(servo_id_t id);

/**
 * @brief Buộc tất cả các servo lập tức quay về vị trí nghỉ IDLE.
 */
void servo_reset_all(void);

/** Vô hiệu hóa xung PWM tới tất cả các servo ngay lập tức để dừng khẩn cấp an toàn. */
esp_err_t servo_emergency_stop(void);

/**
 * @brief Kiểm tra xem một servo hiện có đang bận gạt vật thể hay không (khác IDLE).
 */
bool servo_is_busy(servo_id_t id);

/**
 * @brief Lấy trạng thái hiện tại trong máy trạng thái FSM của servo.
 */
servo_fsm_state_t servo_get_state(servo_id_t id);

/**
 * @brief Cấu hình các tham số độ rộng xung điều khiển servo (micro giây).
 * @param rest_us Độ rộng xung vị trí nghỉ (mặc định 1000us ~ 0 độ).
 * @param active_us Độ rộng xung vị trí gạt (mặc định 2000us ~ 90 độ).
 * @param hold_ms Thời gian giữ cần gạt ở vị trí gạt trước khi thu về (mặc định 600ms).
 */
void servo_set_timing(uint32_t rest_us, uint32_t active_us, uint32_t hold_ms);

#ifdef __cplusplus
}
#endif
