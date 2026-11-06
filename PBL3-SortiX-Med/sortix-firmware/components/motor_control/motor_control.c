#include "motor_control.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "MOTOR_CTRL";

#define MOTOR_PIN_IN1  GPIO_NUM_8
#define MOTOR_PIN_IN2  GPIO_NUM_9

static SemaphoreHandle_t s_motor_mutex = NULL;
static motor_direction_t s_current_dir = MOTOR_DIR_COAST;

static esp_err_t set_motor_pins(motor_direction_t direction, int in1, int in2)
{
    if (s_motor_mutex == NULL) return ESP_ERR_INVALID_STATE;
    xSemaphoreTake(s_motor_mutex, portMAX_DELAY);
    esp_err_t ret1 = gpio_set_level(MOTOR_PIN_IN1, in1);
    esp_err_t ret2 = gpio_set_level(MOTOR_PIN_IN2, in2);
    esp_err_t ret = (ret1 != ESP_OK) ? ret1 : ret2;
    if (ret == ESP_OK) s_current_dir = direction;
    xSemaphoreGive(s_motor_mutex);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set motor GPIO state %d: %s", direction, esp_err_to_name(ret));
    }
    return ret;
}

esp_err_t motor_control_init(void)
{
    if (s_motor_mutex == NULL) {
        s_motor_mutex = xSemaphoreCreateMutex();
        if (s_motor_mutex == NULL) {
            ESP_LOGE(TAG, "Failed to create motor mutex");
            return ESP_ERR_NO_MEM;
        }
    }

    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << MOTOR_PIN_IN1) | (1ULL << MOTOR_PIN_IN2),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };

    esp_err_t ret = gpio_config(&io_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to configure motor GPIOs: %s", esp_err_to_name(ret));
        return ret;
    }

    // Mặc định dừng thả trôi (coast / stop)
    ret = gpio_set_level(MOTOR_PIN_IN1, 0);
    if (ret == ESP_OK) ret = gpio_set_level(MOTOR_PIN_IN2, 0);
    if (ret != ESP_OK) return ret;
    s_current_dir = MOTOR_DIR_COAST;

    ESP_LOGI(TAG, "Motor control initialized (IN1: GPIO%d, IN2: GPIO%d)", MOTOR_PIN_IN1, MOTOR_PIN_IN2);
    return ESP_OK;
}

esp_err_t motor_control_forward(void)
{
    esp_err_t ret = set_motor_pins(MOTOR_DIR_FORWARD, 1, 0);
    if (ret != ESP_OK) return ret;
    ESP_LOGD(TAG, "Motor set to FORWARD");
    return ret;
}

esp_err_t motor_control_reverse(void)
{
    esp_err_t ret = set_motor_pins(MOTOR_DIR_REVERSE, 0, 1);
    if (ret != ESP_OK) return ret;
    ESP_LOGD(TAG, "Motor set to REVERSE");
    return ret;
}

esp_err_t motor_control_brake(void)
{
    esp_err_t ret = set_motor_pins(MOTOR_DIR_BRAKE, 1, 1);
    if (ret != ESP_OK) return ret;
    ESP_LOGD(TAG, "Motor set to BRAKE");
    return ret;
}

esp_err_t motor_control_stop(void)
{
    esp_err_t ret = set_motor_pins(MOTOR_DIR_COAST, 0, 0);
    if (ret != ESP_OK) return ret;
    ESP_LOGD(TAG, "Motor set to COAST/STOP");
    return ret;
}

bool motor_control_is_running(void)
{
    return motor_control_get_direction() == MOTOR_DIR_FORWARD;
}

motor_direction_t motor_control_get_direction(void)
{
    if (s_motor_mutex == NULL) return MOTOR_DIR_COAST;
    xSemaphoreTake(s_motor_mutex, portMAX_DELAY);
    motor_direction_t direction = s_current_dir;
    xSemaphoreGive(s_motor_mutex);
    return direction;
}
