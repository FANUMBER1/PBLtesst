#include "button.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_log.h"

static const char *TAG = "BUTTON_START";

#define BUTTON_PIN_START        GPIO_NUM_23
#define BUTTON_DEBOUNCE_MS      20

static button_cb_t s_on_pressed_cb = NULL;
static void *s_user_ctx = NULL;
static esp_timer_handle_t s_debounce_timer = NULL;
static volatile bool s_timer_running = false;

static void button_debounce_timer_cb(void *arg)
{
    s_timer_running = false;
    // Kiểm tra xem chân có vẫn ở mức LOW (đang được nhấn) sau khoảng thời gian debounce 20ms không
    if (gpio_get_level(BUTTON_PIN_START) == 0) {
        ESP_LOGI(TAG, "Start button press verified");
        if (s_on_pressed_cb != NULL) {
            s_on_pressed_cb(s_user_ctx);
        }
    }
}

static void IRAM_ATTR button_isr_handler(void *arg)
{
    if (!s_timer_running && s_debounce_timer != NULL) {
        s_timer_running = true;
        esp_timer_start_once(s_debounce_timer, BUTTON_DEBOUNCE_MS * 1000);
    }
}

esp_err_t button_init(button_cb_t on_pressed_cb, void *user_ctx)
{
    s_on_pressed_cb = on_pressed_cb;
    s_user_ctx = user_ctx;
    ESP_LOGI(TAG, "Initializing Start Button on GPIO%d with %dms debounce",
             BUTTON_PIN_START, BUTTON_DEBOUNCE_MS);

    gpio_config_t btn_conf = {
        .pin_bit_mask = (1ULL << BUTTON_PIN_START),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_NEGEDGE,
    };
    esp_err_t ret = gpio_config(&btn_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure Start Button GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    const esp_timer_create_args_t timer_args = {
        .callback = &button_debounce_timer_cb,
        .name = "btn_debounce_timer"
    };
    ret = esp_timer_create(&timer_args, &s_debounce_timer);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create debounce timer: %s", esp_err_to_name(ret));
        return ret;
    }

    gpio_install_isr_service(ESP_INTR_FLAG_IRAM);
    ret = gpio_isr_handler_add(BUTTON_PIN_START, button_isr_handler, NULL);
    if (ret != ESP_OK && ret != ESP_ERR_INVALID_STATE) {
        ESP_LOGE(TAG, "Failed to add Button ISR handler: %s", esp_err_to_name(ret));
        return ret;
    }

    return ESP_OK;
}

int button_get_level(void)
{
    return gpio_get_level(BUTTON_PIN_START);
}
