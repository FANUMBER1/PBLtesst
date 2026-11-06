#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    MOTOR_DIR_COAST = 0,    // Thả trôi dừng tự do: IN1=0, IN2=0
    MOTOR_DIR_FORWARD,      // Quay thuận (kéo băng tải): IN1=1, IN2=0
    MOTOR_DIR_REVERSE,      // Quay nghịch (đảo chiều/gỡ kẹt): IN1=0, IN2=1
    MOTOR_DIR_BRAKE         // Hãm động năng (dừng khẩn): IN1=1, IN2=1
} motor_direction_t;

/**
 * @brief Khởi tạo các chân GPIO điều khiển động cơ (IN1: GPIO8, IN2: GPIO9).
 *        Động cơ khởi động ở trạng thái THẢ TRÔI / DỪNG (COAST).
 * @return ESP_OK nếu thành công.
 */
esp_err_t motor_control_init(void);

/**
 * @brief Điều khiển động cơ băng tải chạy thuận (vận hành phân loại tiêu chuẩn).
 * @return ESP_OK nếu thành công.
 */
esp_err_t motor_control_forward(void);

/**
 * @brief Điều khiển động cơ băng tải chạy nghịch (dùng để gỡ kẹt hoặc hiệu chuẩn).
 * @return ESP_OK nếu thành công.
 */
esp_err_t motor_control_reverse(void);

/**
 * @brief Kích hoạt hãm động năng chủ động cho động cơ băng tải (IN1=1, IN2=1).
 * @return ESP_OK nếu thành công.
 */
esp_err_t motor_control_brake(void);

/**
 * @brief Cắt điện động cơ / dừng thả trôi theo quán tính (IN1=0, IN2=0).
 * @return ESP_OK nếu thành công.
 */
esp_err_t motor_control_stop(void);

/**
 * @brief Kiểm tra xem động cơ hiện có đang quay thuận hay không.
 * @return true nếu đang quay thuận, ngược lại false.
 */
bool motor_control_is_running(void);

/**
 * @brief Lấy trạng thái chiều quay hiện tại của động cơ.
 */
motor_direction_t motor_control_get_direction(void);

#ifdef __cplusplus
}
#endif
