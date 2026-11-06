#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

#ifdef __cplusplus
extern "C" {
#endif

#define SORTING_MAX_TRACKED_ITEMS   15
#define SORTING_MAX_BRAND_IDS       16
#define SORTING_MAX_BRAND_LEN       32

typedef enum {
    ITEM_STATE_FREE = 0,        // Khe theo dõi trống
    ITEM_STATE_NEW,             // Cảm biến S1 phát hiện, đang chờ kết quả AI nhận diện
    ITEM_STATE_IN_TRANSIT,      // Đã ghép nối kết quả AI, vật thể đang di chuyển trên băng tải
    ITEM_STATE_COMPLETED,       // Đã gạt vào khay mục tiêu hoặc đến cuối băng tải
    ITEM_STATE_TIMEOUT          // Hết thời gian chờ nhận diện từ hệ thống thị giác AI
} tracked_item_state_t;

typedef struct {
    uint32_t id;
    char product_id[64];
    char brand_id[64];
    float confidence;
    int64_t entry_encoder;
    int64_t entry_timestamp_us;
    int target_bin;             // Khay mục tiêu: 1, 2, hoặc 3
    int routed_bin;             // 0 = chưa phân luồng; 1, 2, hoặc 3 = quyết định/kích hoạt của firmware
    int actual_bin;             // 0 = chưa xác thực vị trí vật lý; 1, 2, hoặc 3 khi có cảm biến phản hồi
    tracked_item_state_t state;
    char status[32];            // Bao gồm trạng thái "unverified" khi chưa có cảm biến khay phản hồi
    bool triggered;
    bool reported_error;        // Cờ ngăn chặn gọi callback báo lỗi trùng lặp
    bool servo_failed;          // Cờ báo hiệu kích hoạt servo gạt thất bại
} tracked_item_t;

// Cấu trúc cấu hình luật phân loại khay động
typedef struct {
    int bin_id;                 // Khay 1 hoặc 2
    int brand_count;
    char brand_ids[SORTING_MAX_BRAND_IDS][SORTING_MAX_BRAND_LEN];
} bin_rule_t;

typedef struct {
    uint32_t config_version;
    int bin_rule_count;
    bin_rule_t bins[2];         // Khay 1 và Khay 2
    int default_bin;            // Khay mặc định (Khay 3 - Phế phẩm/Không xác định)
    bool pending_apply;
} dynamic_sorter_config_t;

typedef void (*classification_cb_t)(const tracked_item_t *item, void *user_ctx);

/**
 * @brief Khởi tạo động cơ phân loại (sorting engine) với bộ đệm vòng theo dõi và luật phân loại mặc định.
 * @return ESP_OK nếu thành công.
 */
esp_err_t sorting_engine_init(void);

/**
 * @brief Đưa một vật thể vật lý mới phát hiện bởi cảm biến S1 vào hàng đợi theo dõi.
 * @param encoder_count Giá trị đếm xung encoder PCNT tại thời điểm bắt phát hiện.
 * @param timestamp_us Dấu thời gian hệ thống (micro giây) tại thời điểm phát hiện.
 * @return ESP_OK nếu thành công, ESP_ERR_NO_MEM nếu hàng đợi theo dõi đã đầy.
 */
esp_err_t sorting_engine_on_s1_entry(int64_t encoder_count, int64_t timestamp_us);

/** Chốt trạng thái mất dấu theo dõi vật thể, dừng băng tải và yêu cầu người vận hành dọn khay/băng tải. */
void sorting_engine_note_tracking_overflow(void);

/**
 * @brief Xử lý kết quả nhận diện thị giác máy AI (YOLO) nhận được từ MQTT.
 *        Ghép nối kết quả theo cơ chế FIFO (vào trước ra trước) với vật thể chưa gán nhãn cũ nhất.
 * @param product_id Chuỗi UUID định danh sản phẩm.
 * @param brand_id Nhãn phân loại loại thuốc / thương hiệu.
 * @param confidence Độ tin cậy nhận diện của AI (0.0 đến 1.0).
 * @return ESP_OK nếu thành công, ESP_ERR_NOT_FOUND nếu không còn vật thể nào đang chờ gán nhãn trong hàng đợi.
 */
esp_err_t sorting_engine_on_vision_result(const char *product_id, const char *brand_id, float confidence);

/**
 * @brief Hàm cập nhật theo dõi vị trí vật thể định kỳ.
 *        Tính toán khoảng cách di chuyển thực tế theo xung encoder, kích hoạt servo gạt đúng thời điểm,
 *        xử lý timeout và gửi bản ghi phân loại hoàn thành.
 */
void sorting_engine_update(void);

/**
 * @brief Áp dụng hoặc xếp hàng cấu hình phân loại SorterConfig động mới nhận từ Dashboard.
 * @param json_str Chuỗi JSON chứa SorterConfigSchema.
 * @param out_applied Đặt thành true nếu áp dụng ngay lập tức, false nếu chờ băng tải trống (line empty).
 * @param out_reason Buffer lưu lý do từ chối nếu có lỗi xảy ra.
 * @param reason_max_len Chiều dài tối đa của buffer lý do.
 * @return ESP_OK nếu áp dụng thành công hoặc xếp hàng hợp lệ, ESP_FAIL nếu lỗi cấu trúc JSON.
 */
esp_err_t sorting_engine_apply_config_json(const char *json_str, bool *out_applied,
                                           char *out_reason, size_t reason_max_len);

/**
 * @brief Đăng ký hàm callback nhận bản ghi khi một vật thể phân loại hoàn tất.
 */
void sorting_engine_set_classification_callback(classification_cb_t cb, void *user_ctx);

/**
 * @brief Kiểm tra xem băng tải hiện có đang hoàn toàn trống hay không (0 vật thể đang được theo dõi).
 */
bool sorting_engine_is_line_empty(void);

/**
 * @brief Kiểm tra xem có vật thể nào đang bị giữ lại hoặc bị quá thời gian chờ (timeout) trên băng tải hay không.
 */
bool sorting_engine_has_unresolved_items(void);

/**
 * @brief Xóa an toàn và giải phóng tất cả các vật thể timeout/bị giữ sau khi người vận hành đã kiểm tra xong.
 * @return ESP_OK nếu thành công.
 */
esp_err_t sorting_engine_clear_unresolved(void);

/**
 * @brief Lấy số hiệu phiên bản cấu hình phân loại đang hoạt động.
 */
uint32_t sorting_engine_get_active_config_version(void);

#ifdef __cplusplus
}
#endif
