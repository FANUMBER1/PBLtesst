#include "led_indicator.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "LED_INDICATOR";

#define LED_PIN_STATUS          GPIO_NUM_10
#define LED_TIMER_PERIOD_US     100000  // Chu kỳ timer 100 ms

static led_mode_t s_current_mode = LED_MODE_OFF;
static esp_timer_handle_t s_led_timer = NULL;
static SemaphoreHandle_t s_led_mutex = NULL;
static uint32_t s_tick_counter = 0;

static void led_timer_cb(void *arg)
{
    s_tick_counter++;

    if (xSemaphoreTake(s_led_mutex, 0) == pdTRUE) {
        int level = 0;
        switch (s_current_mode) {
            case LED_MODE_OFF:
                level = 0;
                break;

            case LED_MODE_RUNNING:
                level = 1;
                break;

            case LED_MODE_IDLE:
                // Tần số 1 Hz = 10 tick (5 tick BẬT, 5 tick TẮT)
                level = ((s_tick_counter % 10) < 5) ? 1 : 0;
                break;

            case LED_MODE_JAMMED:
            case LED_MODE_ERROR:
                // Tần số 5 Hz = 2 tick (1 tick BẬT, 1 tick TẮT)
                level = ((s_tick_counter % 2) == 0) ? 1 : 0;
                break;
        }
        gpio_set_level(LED_PIN_STATUS, level);
        xSemaphoreGive(s_led_mutex);
    }
}

esp_err_t led_indicator_init(void)
{
    ESP_LOGI(TAG, "Initializing Status LED on GPIO%d", LED_PIN_STATUS);

    if (s_led_mutex == NULL) {
        s_led_mutex = xSemaphoreCreateMutex();
        if (s_led_mutex == NULL) return ESP_ERR_NO_MEM;
    }

    gpio_config_t led_conf = {
        .pin_bit_mask = (1ULL << LED_PIN_STATUS),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    esp_err_t ret = gpio_config(&led_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure LED GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    gpio_set_level(LED_PIN_STATUS, 0);

    const esp_timer_create_args_t timer_args = {
        .callback = &led_timer_cb,
        .name = "led_timer"
    };
    ret = esp_timer_create(&timer_args, &s_led_timer);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create LED timer: %s", esp_err_to_name(ret));
        return ret;
    }

    ret = esp_timer_start_periodic(s_led_timer, LED_TIMER_PERIOD_US);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start LED timer: %s", esp_err_to_name(ret));
        return ret;
    }

    s_current_mode = LED_MODE_IDLE;
    return ESP_OK;
}

void led_indicator_set_mode(led_mode_t mode)
{
    if (s_led_mutex == NULL) return;
    xSemaphoreTake(s_led_mutex, portMAX_DELAY);
    s_current_mode = mode;
    xSemaphoreGive(s_led_mutex);
}

led_mode_t led_indicator_get_mode(void)
{
    return s_current_mode;
}
