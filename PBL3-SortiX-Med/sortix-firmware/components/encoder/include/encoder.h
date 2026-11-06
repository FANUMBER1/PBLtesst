#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "esp_attr.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Khởi tạo encoder quay với Driver PCNT mới (Phase A: GPIO1, Phase B: GPIO4).
 *        Thiết lập giải mã xung vuông pha x4 (quadrature x4), bộ lọc nhiễu xung ngắn (glitch filter) và tích lũy tràn 64-bit.
 * @return ESP_OK nếu thành công.
 */
esp_err_t encoder_init(void);

/**
 * @brief Lấy số xung encoder ghi nhận từ bộ đếm phần cứng PCNT.
 *        Đảm bảo an toàn luồng (Thread-safe) và gọi được trong ngắt (ISR-safe).
 * @return Số xung có dấu (signed), mở rộng thành int64_t để tính toán vị trí di chuyển.
 */
int64_t encoder_get_count(void);

/** Đọc số xung và giữ lại mã lỗi PCNT cho các luồng xử lý yêu cầu độ an toàn cao. */
esp_err_t encoder_get_count_checked(int64_t *count);

/** Đọc nhanh giá trị đếm xung dành riêng cho các trình xử lý ngắt GPIO trong IRAM. */
int64_t IRAM_ATTR encoder_get_count_isr(void);

/**
 * @brief Đặt lại giá trị bộ đếm xung encoder về 0.
 */
void encoder_reset_count(void);

/**
 * @brief Thiết lập hệ số hiệu chuẩn khoảng cách (số xung trên mỗi mm).
 * @param counts_per_mm Hệ số tỷ lệ (mặc định ~31.5f xung/mm).
 */
void encoder_set_counts_per_mm(float counts_per_mm);

/**
 * @brief Lấy hệ số hiệu chuẩn khoảng cách hiện tại.
 */
float encoder_get_counts_per_mm(void);

/**
 * @brief Quy đổi số xung encoder sang khoảng cách di chuyển tuyến tính (mm).
 */
float encoder_counts_to_mm(int64_t counts);

/**
 * @brief Quy đổi khoảng cách di chuyển tuyến tính (mm) sang số xung encoder tương ứng.
 */
int64_t encoder_mm_to_counts(float mm);

#ifdef __cplusplus
}
#endif
