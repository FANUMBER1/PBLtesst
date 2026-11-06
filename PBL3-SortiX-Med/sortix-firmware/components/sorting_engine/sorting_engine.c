#include "sorting_engine.h"
#include "encoder.h"
#include "servo.h"
#include "state_machine.h"
#include "nvs_config.h"
#include "nvs.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "cJSON.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include <math.h>
#include <stdarg.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <strings.h>

static const char *TAG = "SORTING_ENGINE";

#define DIST_S1_TO_SERVO1_MM        200.0f
#define DIST_S1_TO_SERVO2_MM        400.0f
#define DIST_S1_TO_END_MM           540.0f
#define SERVO_TRIGGER_WINDOW_MM     15.0f
#define VISION_TIMEOUT_US           1000000 // 1.0s

static tracked_item_t s_items[SORTING_MAX_TRACKED_ITEMS];
static dynamic_sorter_config_t s_active_config;
static dynamic_sorter_config_t s_pending_config;
static SemaphoreHandle_t s_sorting_mutex = NULL;
static uint32_t s_item_seq_counter = 0;
static bool s_tracking_overflow_latched = false;
static bool s_loading_persisted_config = false;

static classification_cb_t s_classification_cb = NULL;
static void *s_classification_user_ctx = NULL;

static void set_reason(char *buffer, size_t buffer_size, const char *format, ...)
{
    if (buffer == NULL || buffer_size == 0 || format == NULL) return;
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, buffer_size, format, args);
    va_end(args);
}

static int lookup_target_bin(const dynamic_sorter_config_t *cfg, const char *brand_id)
{
    if (brand_id == NULL || strlen(brand_id) == 0) {
        return cfg->default_bin;
    }

    for (int i = 0; i < cfg->bin_rule_count; i++) {
        const bin_rule_t *rule = &cfg->bins[i];
        for (int j = 0; j < rule->brand_count; j++) {
            if (strcasecmp(rule->brand_ids[j], brand_id) == 0) {
                return rule->bin_id;
            }
        }
    }
    return cfg->default_bin;
}

esp_err_t sorting_engine_init(void)
{
    ESP_LOGI(TAG, "Initializing Sorting Engine");

    if (s_sorting_mutex == NULL) {
        s_sorting_mutex = xSemaphoreCreateMutex();
        if (s_sorting_mutex == NULL) return ESP_ERR_NO_MEM;
    }

    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    memset(s_items, 0, sizeof(s_items));
    memset(&s_active_config, 0, sizeof(s_active_config));
    memset(&s_pending_config, 0, sizeof(s_pending_config));
    s_tracking_overflow_latched = false;
    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        s_items[i].state = ITEM_STATE_FREE;
    }

    // Cấu hình phân loại mặc định:
    // Khay 1: Rác thải sắc nhọn ("brand_b", "brand_c")
    // Khay 2: Dụng cụ phẫu thuật ("brand_a")
    // Khay 3: Vật tư y tế thông thường (Khay mặc định)
    s_active_config.config_version = 1;
    s_active_config.bin_rule_count = 2;
    s_active_config.default_bin = 3;
    s_active_config.pending_apply = false;

    s_active_config.bins[0].bin_id = 1;
    s_active_config.bins[0].brand_count = 2;
    strncpy(s_active_config.bins[0].brand_ids[0], "brand_b", SORTING_MAX_BRAND_LEN);
    strncpy(s_active_config.bins[0].brand_ids[1], "brand_c", SORTING_MAX_BRAND_LEN);

    s_active_config.bins[1].bin_id = 2;
    s_active_config.bins[1].brand_count = 1;
    strncpy(s_active_config.bins[1].brand_ids[0], "brand_a", SORTING_MAX_BRAND_LEN);

    s_pending_config.pending_apply = false;
    xSemaphoreGive(s_sorting_mutex);

    ESP_LOGI(TAG, "Sorting engine initialized with active config version: %lu",
             s_active_config.config_version);

    char *saved_config = malloc(4096);
    if (saved_config == NULL) {
        ESP_LOGW(TAG, "Could not allocate space to read persisted sorter configuration");
        return ESP_OK;
    }
    esp_err_t load_ret = nvs_config_load_sorter_config(saved_config, 4096);
    if (load_ret == ESP_OK) {
        bool applied = false;
        char reason[128] = {0};
        s_loading_persisted_config = true;
        esp_err_t apply_ret = sorting_engine_apply_config_json(saved_config, &applied,
                                                                reason, sizeof(reason));
        s_loading_persisted_config = false;
        if (apply_ret != ESP_OK) {
            ESP_LOGW(TAG, "Stored sorter configuration rejected; using defaults: %s", reason);
        } else {
            ESP_LOGI(TAG, "Restored persisted sorter configuration (applied=%s)",
                     applied ? "true" : "false");
        }
    } else if (load_ret != ESP_ERR_NVS_NOT_FOUND) {
        ESP_LOGW(TAG, "Could not load persisted sorter configuration: %s",
                 esp_err_to_name(load_ret));
    }
    free(saved_config);
    return ESP_OK;
}

esp_err_t sorting_engine_on_s1_entry(int64_t encoder_count, int64_t timestamp_us)
{
    if (s_sorting_mutex == NULL) return ESP_ERR_INVALID_STATE;

    esp_err_t ret = ESP_ERR_NO_MEM;
    bool tracking_overflow = false;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);

    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        if (s_items[i].state == ITEM_STATE_FREE) {
            tracked_item_t *item = &s_items[i];
            memset(item, 0, sizeof(tracked_item_t));
            item->id = ++s_item_seq_counter;
            snprintf(item->product_id, sizeof(item->product_id), "prod_%lu", item->id);
            item->entry_encoder = encoder_count;
            item->entry_timestamp_us = timestamp_us;
            item->state = ITEM_STATE_NEW;
            item->target_bin = s_active_config.default_bin;
            item->routed_bin = 0;
            item->actual_bin = 0;
            item->confidence = 0.0f;
            item->triggered = false;
            strncpy(item->status, "pending", sizeof(item->status) - 1);

            ESP_LOGI(TAG, "New item #%lu registered at S1 (Encoder: %lld, Time: %lld us)",
                     item->id, encoder_count, timestamp_us);
            ret = ESP_OK;
            break;
        }
    }

    if (ret != ESP_OK) {
        s_tracking_overflow_latched = true;
        tracking_overflow = true;
    }

    xSemaphoreGive(s_sorting_mutex);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Tracking queue full! Item at S1 was lost; latching stop until operator clears belt.");
        if (tracking_overflow) state_machine_process_event(SYSTEM_EVENT_STOP);
    }
    return ret;
}

void sorting_engine_note_tracking_overflow(void)
{
    if (s_sorting_mutex == NULL) return;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    s_tracking_overflow_latched = true;
    xSemaphoreGive(s_sorting_mutex);
    ESP_LOGE(TAG, "S1 queue overflow latched; operator inspection is required before restart");
    state_machine_process_event(SYSTEM_EVENT_STOP);
}

esp_err_t sorting_engine_on_vision_result(const char *product_id, const char *brand_id, float confidence)
{
    if (s_sorting_mutex == NULL) return ESP_ERR_INVALID_STATE;

    esp_err_t ret = ESP_ERR_NOT_FOUND;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);

    // Tìm vật thể cũ nhất đang ở trạng thái ITEM_STATE_NEW (theo thứ tự FIFO - vào trước ra trước)
    tracked_item_t *oldest_new_item = NULL;
    int64_t oldest_time = INT64_MAX;

    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        if (s_items[i].state == ITEM_STATE_NEW) {
            if (s_items[i].entry_timestamp_us < oldest_time) {
                oldest_time = s_items[i].entry_timestamp_us;
                oldest_new_item = &s_items[i];
            }
        }
    }

    if (oldest_new_item != NULL) {
        if (product_id && strlen(product_id) > 0) {
            strncpy(oldest_new_item->product_id, product_id, sizeof(oldest_new_item->product_id) - 1);
        }
        if (brand_id && strlen(brand_id) > 0) {
            strncpy(oldest_new_item->brand_id, brand_id, sizeof(oldest_new_item->brand_id) - 1);
        }
        oldest_new_item->confidence = confidence;
        oldest_new_item->target_bin = lookup_target_bin(&s_active_config, brand_id);
        oldest_new_item->state = ITEM_STATE_IN_TRANSIT;

        ESP_LOGI(TAG, "Item #%lu paired with Vision: product='%s', brand='%s', conf=%.2f -> Target Bin %d",
                 oldest_new_item->id, oldest_new_item->product_id, oldest_new_item->brand_id,
                 confidence, oldest_new_item->target_bin);
        ret = ESP_OK;
    } else {
        ESP_LOGW(TAG, "Vision result received but no pending ITEM_STATE_NEW in queue!");
    }

    xSemaphoreGive(s_sorting_mutex);
    return ret;
}

void sorting_engine_update(void)
{
    if (s_sorting_mutex == NULL) return;

    int64_t current_encoder = encoder_get_count();
    int64_t now_us = esp_timer_get_time();
    const sortix_sys_config_t *sys_cfg = nvs_config_get();
    int fallback_policy = sys_cfg->fallback_policy;

    float dist_s1_servo1 = (sys_cfg->dist_s1_servo1_mm > 0.0f) ? sys_cfg->dist_s1_servo1_mm : DIST_S1_TO_SERVO1_MM;
    float dist_s1_servo2 = (sys_cfg->dist_s1_servo2_mm > 0.0f) ? sys_cfg->dist_s1_servo2_mm : DIST_S1_TO_SERVO2_MM;
    float dist_s1_end    = (sys_cfg->dist_s1_end_mm > 0.0f) ? sys_cfg->dist_s1_end_mm : DIST_S1_TO_END_MM;

    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    bool stop_conveyor_required = false;

    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        tracked_item_t *item = &s_items[i];

        // 1. Kiểm tra hết thời gian chờ nhận diện AI (Vision Timeout) đối với các vật thể ở trạng thái ITEM_STATE_NEW
        if (item->state == ITEM_STATE_NEW) {
            if ((now_us - item->entry_timestamp_us) >= VISION_TIMEOUT_US) {
                if (fallback_policy == 0) { // PAUSE_AND_HOLD (Dừng băng tải giữ an toàn - mặc định)
                    ESP_LOGE(TAG, "Item #%lu Vision TIMEOUT (%.1fs). Executing PAUSE_AND_HOLD!",
                             item->id, (float)VISION_TIMEOUT_US / 1000000.0f);
                    stop_conveyor_required = true;
                    item->state = ITEM_STATE_TIMEOUT;
                    item->actual_bin = 0;
                    strncpy(item->status, "held_timeout", sizeof(item->status));

                    // Báo cáo bản ghi lỗi duy nhất một lần
                    if (!item->reported_error && s_classification_cb != NULL) {
                        item->reported_error = true;
                        s_classification_cb(item, s_classification_user_ctx);
                    }
                } else { // DIVERT_TO_DEFAULT (Đẩy vào khay mặc định)
                    ESP_LOGW(TAG, "Item #%lu Vision TIMEOUT. Routing toward default Bin %d; destination will remain unverified.",
                             item->id, s_active_config.default_bin);
                    item->target_bin = s_active_config.default_bin;
                    item->routed_bin = 0;
                    item->actual_bin = 0; // Chưa xác nhận vị trí cho đến khi thực tế tới cuối băng tải
                    strncpy(item->status, "diverted_default", sizeof(item->status));
                    item->state = ITEM_STATE_IN_TRANSIT;
                }
            }
        }

        // 2. Theo dõi vị trí các vật thể đang di chuyển dọc băng tải (dựa theo xung encoder)
        if (item->state == ITEM_STATE_IN_TRANSIT) {
            float dist_mm = encoder_counts_to_mm(current_encoder - item->entry_encoder);

            if (item->target_bin == 1 || item->target_bin == 2) {
                float target_dist = (item->target_bin == 1) ? dist_s1_servo1 : dist_s1_servo2;
                servo_id_t servo_id = (item->target_bin == 1) ? SERVO_ID_1 : SERVO_ID_2;

                if (dist_mm >= (target_dist - SERVO_TRIGGER_WINDOW_MM) && !item->triggered) {
                    if (dist_mm <= (target_dist + SERVO_TRIGGER_WINDOW_MM)) {
                        // Nằm trong cửa sổ kích hoạt: kích hoạt cần gạt servo
                        esp_err_t s_err = servo_trigger(servo_id);
                        if (s_err == ESP_OK) {
                            item->triggered = true;
                            item->routed_bin = item->target_bin;
                            // Phần cứng hiện tại không có cảm biến phản hồi S2/S3 tại khay.
                            // Xung PWM kích hoạt không phải bằng chứng tuyệt đối vật thể đã rơi vào khay.
                            item->actual_bin = 0;
                            strncpy(item->status, "unverified", sizeof(item->status) - 1);
                            item->state = ITEM_STATE_COMPLETED;
                            ESP_LOGI(TAG, "Item #%lu reached Servo %d station (dist=%.1f mm); destination remains unverified.",
                                     item->id, item->target_bin, dist_mm);
                        } else {
                            ESP_LOGW(TAG, "Servo %d busy/error for item #%lu at %.1f mm (will retry if in window)",
                                     item->target_bin, item->id, dist_mm);
                        }
                    } else {
                        // Đã vượt quá cửa sổ kích hoạt mà chưa được gạt!
                        ESP_LOGE(TAG, "Item #%lu missed Servo %d station (dist=%.1f mm > window). Actuation failed!",
                                  item->id, item->target_bin, dist_mm);
                        item->servo_failed = true;

                        if (fallback_policy == 0) { // PAUSE_AND_HOLD (Dừng băng tải giữ an toàn)
                            stop_conveyor_required = true;
                            item->state = ITEM_STATE_TIMEOUT;
                            item->routed_bin = 0;
                            item->actual_bin = 0;
                            strncpy(item->status, "servo_failed", sizeof(item->status));
                            if (!item->reported_error && s_classification_cb != NULL) {
                                item->reported_error = true;
                                s_classification_cb(item, s_classification_user_ctx);
                            }
                        } else { // DIVERT_TO_DEFAULT (Chuyển sang khay mặc định)
                            ESP_LOGW(TAG, "Item #%lu routing toward default Bin %d after missed servo; destination remains unverified",
                                     item->id, s_active_config.default_bin);
                            item->target_bin = s_active_config.default_bin;
                            item->routed_bin = 0;
                            strncpy(item->status, "diverted_default", sizeof(item->status));
                        }
                    }
                }
            } else {
                // Khay đích là Khay 3 (Khay mặc định / Cuối băng tải)
                if (dist_mm >= dist_s1_end) {
                    item->routed_bin = item->target_bin;
                    item->actual_bin = 0;
                    if (strcmp(item->status, "diverted_default") != 0) {
                        strncpy(item->status, "unverified", sizeof(item->status) - 1);
                    }
                    item->state = ITEM_STATE_COMPLETED;
                    ESP_LOGI(TAG, "Item #%lu reached end of belt (dist=%.1f mm); destination is unverified (%s).",
                             item->id, dist_mm, item->status);
                }
            }
        }

        // 3. Xử lý các vật thể đã hoàn tất phân loại
        if (item->state == ITEM_STATE_COMPLETED) {
            if (s_classification_cb != NULL) {
                s_classification_cb(item, s_classification_user_ctx);
            }
            // Giải phóng khe theo dõi
            item->state = ITEM_STATE_FREE;
        }
    }

    // 4. Kiểm tra xem cấu hình chờ (pending config) có thể áp dụng khi băng tải trống không
    if (s_pending_config.pending_apply) {
        bool line_empty = true;
        for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
            if (s_items[i].state != ITEM_STATE_FREE) {
                line_empty = false;
                break;
            }
        }
        if (line_empty) {
            s_active_config = s_pending_config;
            s_active_config.pending_apply = false;
            s_pending_config.pending_apply = false;
            ESP_LOGI(TAG, "Pending SorterConfig version %lu applied (Line is empty)",
                     s_active_config.config_version);
        }
    }
    xSemaphoreGive(s_sorting_mutex);

    if (stop_conveyor_required) {
        state_machine_process_event(SYSTEM_EVENT_STOP);
    }
}

esp_err_t sorting_engine_apply_config_json(const char *json_str, bool *out_applied,
                                           char *out_reason, size_t reason_max_len)
{
    if (json_str == NULL || out_applied == NULL) return ESP_ERR_INVALID_ARG;
    if (out_reason != NULL && reason_max_len > 0) out_reason[0] = '\0';

    cJSON *root = cJSON_Parse(json_str);
    if (root == NULL) {
        set_reason(out_reason, reason_max_len, "%s", "Invalid JSON format");
        return ESP_FAIL;
    }

    cJSON *cfg_ver = cJSON_GetObjectItem(root, "config_version");
    cJSON *bins_arr = cJSON_GetObjectItem(root, "bins");
    cJSON *apply_mode = cJSON_GetObjectItem(root, "apply_mode");

    if (!cJSON_IsNumber(cfg_ver) || !isfinite(cfg_ver->valuedouble) ||
        cfg_ver->valuedouble < 1.0 || cfg_ver->valuedouble > UINT32_MAX ||
        floor(cfg_ver->valuedouble) != cfg_ver->valuedouble) {
        set_reason(out_reason, reason_max_len, "%s", "config_version must be a positive 32-bit integer");
        cJSON_Delete(root);
        return ESP_FAIL;
    }

    if (!cJSON_IsArray(bins_arr)) {
        set_reason(out_reason, reason_max_len, "%s", "Missing or invalid bins array");
        cJSON_Delete(root);
        return ESP_FAIL;
    }

    int arr_size = cJSON_GetArraySize(bins_arr);
    if (arr_size < 1 || arr_size > 2) {
        set_reason(out_reason, reason_max_len, "Invalid bins count (%d). Exactly 1 or 2 bins supported.", arr_size);
        cJSON_Delete(root);
        return ESP_FAIL;
    }

    dynamic_sorter_config_t new_cfg;
    memset(&new_cfg, 0, sizeof(dynamic_sorter_config_t));
    new_cfg.config_version = (uint32_t)cfg_ver->valuedouble;
    new_cfg.default_bin = 3;
    new_cfg.bin_rule_count = 0;

    bool seen_bin[3] = { false, false, false };

    for (int i = 0; i < arr_size; i++) {
        cJSON *bin_obj = cJSON_GetArrayItem(bins_arr, i);
        if (!cJSON_IsObject(bin_obj)) {
            set_reason(out_reason, reason_max_len, "%s", "Bin element must be an object");
            cJSON_Delete(root);
            return ESP_FAIL;
        }

        cJSON *bin_id = cJSON_GetObjectItem(bin_obj, "bin_id");
        cJSON *brands = cJSON_GetObjectItem(bin_obj, "brand_ids");

        if (!cJSON_IsNumber(bin_id) || !isfinite(bin_id->valuedouble) ||
            floor(bin_id->valuedouble) != bin_id->valuedouble ||
            (bin_id->valuedouble != 1.0 && bin_id->valuedouble != 2.0)) {
            set_reason(out_reason, reason_max_len, "bin_id must be integer 1 or 2 (got %.0f)",
                       cJSON_IsNumber(bin_id) ? bin_id->valuedouble : -1.0);
            cJSON_Delete(root);
            return ESP_FAIL;
        }

        int b_id = (int)bin_id->valuedouble;
        if (seen_bin[b_id]) {
            set_reason(out_reason, reason_max_len, "Duplicate bin_id %d in configuration", b_id);
            cJSON_Delete(root);
            return ESP_FAIL;
        }
        seen_bin[b_id] = true;

        if (!cJSON_IsArray(brands)) {
            set_reason(out_reason, reason_max_len, "Bin %d must have brand_ids array", b_id);
            cJSON_Delete(root);
            return ESP_FAIL;
        }

        int b_size = cJSON_GetArraySize(brands);
        if (b_size < 1 || b_size > SORTING_MAX_BRAND_IDS) {
            set_reason(out_reason, reason_max_len, "Bin %d brand_ids count must be 1-%d (got %d)", b_id, SORTING_MAX_BRAND_IDS, b_size);
            cJSON_Delete(root);
            return ESP_FAIL;
        }

        bin_rule_t *rule = &new_cfg.bins[new_cfg.bin_rule_count++];
        rule->bin_id = b_id;
        rule->brand_count = 0;

        for (int j = 0; j < b_size; j++) {
            cJSON *b_item = cJSON_GetArrayItem(brands, j);
            if (!cJSON_IsString(b_item) || b_item->valuestring == NULL ||
                strlen(b_item->valuestring) == 0 || strlen(b_item->valuestring) >= SORTING_MAX_BRAND_LEN) {
                set_reason(out_reason, reason_max_len, "Brand ID invalid or exceeds max length (%d)", SORTING_MAX_BRAND_LEN - 1);
                cJSON_Delete(root);
                return ESP_FAIL;
            }
            bool duplicate_brand = false;
            for (int prior_rule = 0; prior_rule < new_cfg.bin_rule_count && !duplicate_brand; prior_rule++) {
                const bin_rule_t *prior = &new_cfg.bins[prior_rule];
                for (int prior_brand = 0; prior_brand < prior->brand_count; prior_brand++) {
                    if (strcasecmp(prior->brand_ids[prior_brand], b_item->valuestring) == 0) {
                        duplicate_brand = true;
                        break;
                    }
                }
            }
            if (duplicate_brand) {
                set_reason(out_reason, reason_max_len, "Brand ID '%s' is mapped more than once", b_item->valuestring);
                cJSON_Delete(root);
                return ESP_FAIL;
            }
            strncpy(rule->brand_ids[rule->brand_count], b_item->valuestring, SORTING_MAX_BRAND_LEN - 1);
            rule->brand_ids[rule->brand_count][SORTING_MAX_BRAND_LEN - 1] = '\0';
            rule->brand_count++;
        }
    }

    bool immediate = false;
    if (apply_mode != NULL) {
        if (!cJSON_IsString(apply_mode)) {
            set_reason(out_reason, reason_max_len, "%s", "apply_mode must be a string");
            cJSON_Delete(root);
            return ESP_FAIL;
        }
        if (strcmp(apply_mode->valuestring, "immediate") == 0) {
            immediate = true;
        } else if (strcmp(apply_mode->valuestring, "drained") == 0 || strcmp(apply_mode->valuestring, "when_line_empty") == 0) {
            immediate = false;
        } else {
            set_reason(out_reason, reason_max_len, "Invalid apply_mode '%s' (must be 'immediate', 'drained' or 'when_line_empty')", apply_mode->valuestring);
            cJSON_Delete(root);
            return ESP_FAIL;
        }
    }

    if (!s_loading_persisted_config) {
        // Tuyệt đối không lưu token xác thực MQTT cùng với các luật phân loại vào bộ nhớ NVS
        cJSON_DeleteItemFromObject(root, "auth_token");
        cJSON_DeleteItemFromObject(root, "token");
        char *persisted_json = cJSON_PrintUnformatted(root);
        if (persisted_json == NULL) {
            set_reason(out_reason, reason_max_len, "%s", "Could not serialize sorter configuration");
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }
        esp_err_t persist_ret = nvs_config_save_sorter_config(persisted_json);
        free(persisted_json);
        if (persist_ret != ESP_OK) {
            set_reason(out_reason, reason_max_len, "Could not persist sorter configuration: %s",
                       esp_err_to_name(persist_ret));
            cJSON_Delete(root);
            return persist_ret;
        }
    }
    cJSON_Delete(root);

    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    bool line_empty = true;
    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        if (s_items[i].state != ITEM_STATE_FREE) {
            line_empty = false;
            break;
        }
    }

    if (immediate || line_empty) {
        s_active_config = new_cfg;
        s_active_config.pending_apply = false;
        *out_applied = true;
        ESP_LOGI(TAG, "SorterConfig version %lu applied immediately", new_cfg.config_version);
    } else {
        s_pending_config = new_cfg;
        s_pending_config.pending_apply = true;
        *out_applied = false;
        ESP_LOGI(TAG, "SorterConfig version %lu staged (waiting for line to empty)", new_cfg.config_version);
    }
    xSemaphoreGive(s_sorting_mutex);

    return ESP_OK;
}

void sorting_engine_set_classification_callback(classification_cb_t cb, void *user_ctx)
{
    s_classification_cb = cb;
    s_classification_user_ctx = user_ctx;
}

bool sorting_engine_is_line_empty(void)
{
    if (s_sorting_mutex == NULL) return true;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    bool empty = !s_tracking_overflow_latched;
    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        if (s_items[i].state != ITEM_STATE_FREE) {
            empty = false;
            break;
        }
    }
    xSemaphoreGive(s_sorting_mutex);
    return empty;
}

bool sorting_engine_has_unresolved_items(void)
{
    if (s_sorting_mutex == NULL) return false;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    bool has_unresolved = s_tracking_overflow_latched;
    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        if (s_items[i].state == ITEM_STATE_TIMEOUT || s_items[i].servo_failed) {
            has_unresolved = true;
            break;
        }
    }
    xSemaphoreGive(s_sorting_mutex);
    return has_unresolved;
}

esp_err_t sorting_engine_clear_unresolved(void)
{
    if (s_sorting_mutex == NULL) return ESP_ERR_INVALID_STATE;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    int cleared_count = 0;
    for (int i = 0; i < SORTING_MAX_TRACKED_ITEMS; i++) {
        if (s_items[i].state == ITEM_STATE_TIMEOUT || s_items[i].servo_failed) {
            s_items[i].state = ITEM_STATE_FREE;
            cleared_count++;
        }
    }
    s_tracking_overflow_latched = false;
    xSemaphoreGive(s_sorting_mutex);
    ESP_LOGI(TAG, "Cleared %d unresolved items from tracking queue", cleared_count);
    return ESP_OK;
}

uint32_t sorting_engine_get_active_config_version(void)
{
    if (s_sorting_mutex == NULL) return s_active_config.config_version;
    xSemaphoreTake(s_sorting_mutex, portMAX_DELAY);
    uint32_t version = s_active_config.config_version;
    xSemaphoreGive(s_sorting_mutex);
    return version;
}
