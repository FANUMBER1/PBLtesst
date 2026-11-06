#include "encoder.h"
#include "driver/pulse_cnt.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/portmacro.h"

static const char *TAG = "ENCODER_PCNT";

#define ENCODER_PIN_A           GPIO_NUM_1
#define ENCODER_PIN_B           GPIO_NUM_4
#define PCNT_HIGH_LIMIT         20000
#define PCNT_LOW_LIMIT          -20000

static pcnt_unit_handle_t s_pcnt_unit = NULL;
static pcnt_channel_handle_t s_pcnt_chan_a = NULL;
static pcnt_channel_handle_t s_pcnt_chan_b = NULL;

static float s_counts_per_mm = 31.5f;

#define PCNT_CHECK(call) do { \
    ret = (call); \
    if (ret != ESP_OK) { \
        ESP_LOGE(TAG, "PCNT setup failed at %s: %s", #call, esp_err_to_name(ret)); \
        return ret; \
    } \
} while (0)

static bool IRAM_ATTR pcnt_on_reach(pcnt_unit_handle_t unit, const pcnt_watch_event_data_t *edata, void *user_ctx)
{
    // Khi bật cờ accum_count, driver PCNT sẽ tự động bù trừ giá trị giới hạn
    // và tự xóa bộ đếm phần cứng. Không cần xóa thủ công tại đây.
    (void)unit;
    (void)edata;
    (void)user_ctx;
    return false;
}

esp_err_t encoder_init(void)
{
    ESP_LOGI(TAG, "Initializing PCNT Quadrature Encoder (Phase A: GPIO%d, Phase B: GPIO%d)",
             ENCODER_PIN_A, ENCODER_PIN_B);

    pcnt_unit_config_t unit_config = {
        .high_limit = PCNT_HIGH_LIMIT,
        .low_limit = PCNT_LOW_LIMIT,
        .flags.accum_count = 1,
    };
    esp_err_t ret = pcnt_new_unit(&unit_config, &s_pcnt_unit);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create PCNT unit: %s", esp_err_to_name(ret));
        return ret;
    }

    // Kênh A: Bắt cạnh trên chân A, mức logic trên chân B
    pcnt_chan_config_t chan_a_config = {
        .edge_gpio_num = ENCODER_PIN_A,
        .level_gpio_num = ENCODER_PIN_B,
    };
    ret = pcnt_new_channel(s_pcnt_unit, &chan_a_config, &s_pcnt_chan_a);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create PCNT channel A: %s", esp_err_to_name(ret));
        return ret;
    }

    // Kênh B: Bắt cạnh trên chân B, mức logic trên chân A
    pcnt_chan_config_t chan_b_config = {
        .edge_gpio_num = ENCODER_PIN_B,
        .level_gpio_num = ENCODER_PIN_A,
    };
    ret = pcnt_new_channel(s_pcnt_unit, &chan_b_config, &s_pcnt_chan_b);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create PCNT channel B: %s", esp_err_to_name(ret));
        return ret;
    }

    // Thiết lập hành vi xung và mức logic cho chế độ nhân 4 (full quadrature x4)
    PCNT_CHECK(pcnt_channel_set_edge_action(s_pcnt_chan_a, PCNT_CHANNEL_EDGE_ACTION_DECREASE, PCNT_CHANNEL_EDGE_ACTION_INCREASE));
    PCNT_CHECK(pcnt_channel_set_level_action(s_pcnt_chan_a, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE));

    PCNT_CHECK(pcnt_channel_set_edge_action(s_pcnt_chan_b, PCNT_CHANNEL_EDGE_ACTION_INCREASE, PCNT_CHANNEL_EDGE_ACTION_DECREASE));
    PCNT_CHECK(pcnt_channel_set_level_action(s_pcnt_chan_b, PCNT_CHANNEL_LEVEL_ACTION_KEEP, PCNT_CHANNEL_LEVEL_ACTION_INVERSE));

    // Bộ lọc khử nhiễu xung ngắn (1000ns)
    pcnt_glitch_filter_config_t filter_config = {
        .max_glitch_ns = 1000,
    };
    PCNT_CHECK(pcnt_unit_set_glitch_filter(s_pcnt_unit, &filter_config));

    // Điểm theo dõi (watchpoint) khi xảy ra tràn ngưỡng trên và ngưỡng dưới
    PCNT_CHECK(pcnt_unit_add_watch_point(s_pcnt_unit, PCNT_HIGH_LIMIT));
    PCNT_CHECK(pcnt_unit_add_watch_point(s_pcnt_unit, PCNT_LOW_LIMIT));

    pcnt_event_callbacks_t cbs = {
        .on_reach = pcnt_on_reach,
    };
    PCNT_CHECK(pcnt_unit_register_event_callbacks(s_pcnt_unit, &cbs, NULL));

    PCNT_CHECK(pcnt_unit_enable(s_pcnt_unit));
    PCNT_CHECK(pcnt_unit_clear_count(s_pcnt_unit));
    PCNT_CHECK(pcnt_unit_start(s_pcnt_unit));

    ESP_LOGI(TAG, "Encoder PCNT started successfully");
    return ESP_OK;
}

#undef PCNT_CHECK

int64_t encoder_get_count(void)
{
    int64_t count = 0;
    (void)encoder_get_count_checked(&count);
    return count;
}

esp_err_t encoder_get_count_checked(int64_t *count)
{
    if (count == NULL || s_pcnt_unit == NULL) return ESP_ERR_INVALID_STATE;
    int current_val = 0;
    esp_err_t ret = pcnt_unit_get_count(s_pcnt_unit, &current_val);
    if (ret == ESP_OK) *count = current_val;
    return ret;
}

int64_t IRAM_ATTR encoder_get_count_isr(void)
{
    if (s_pcnt_unit == NULL) return 0;
    int current_val = 0;
    return pcnt_unit_get_count(s_pcnt_unit, &current_val) == ESP_OK ? current_val : 0;
}

void encoder_reset_count(void)
{
    if (s_pcnt_unit == NULL) return;
    pcnt_unit_clear_count(s_pcnt_unit);
    ESP_LOGI(TAG, "Encoder count reset to 0");
}

void encoder_set_counts_per_mm(float counts_per_mm)
{
    if (counts_per_mm > 0.001f) {
        s_counts_per_mm = counts_per_mm;
    }
}

float encoder_get_counts_per_mm(void)
{
    return s_counts_per_mm;
}

float encoder_counts_to_mm(int64_t counts)
{
    if (s_counts_per_mm <= 0.001f) return 0.0f;
    return (float)counts / s_counts_per_mm;
}

int64_t encoder_mm_to_counts(float mm)
{
    return (int64_t)(mm * s_counts_per_mm);
}
