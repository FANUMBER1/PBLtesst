#include "nvs_config.h"
#include "app_config.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include <math.h>
#include <string.h>

static const char *TAG = "NVS_CONFIG";
#define NVS_NAMESPACE   "sortix_cfg"
#define NVS_BLOB_KEY    "sys_cfg"
#define NVS_DEVICE_TOKEN_KEY "device_token"
#define NVS_SORTER_CONFIG_KEY "sorter_cfg"
#define SORTER_CONFIG_MAX_JSON 4096

static char s_device_token[64] = {0};

static sortix_sys_config_t s_config = {
    .wifi_ssid = DEFAULT_WIFI_SSID,
    .wifi_pass = DEFAULT_WIFI_PASS,
    .mqtt_broker_uri = DEFAULT_MQTT_BROKER_URI,
    .mqtt_user = "",
    .mqtt_pass = "",
    .control_secret = SORTIX_CONTROL_SECRET,
    .http_telemetry_url = DEFAULT_HTTP_TELEMETRY_URL,
    .device_id = SORTIX_DEVICE_ID,
    .active_config_version = 1,
    .fallback_policy = SORTIX_FALLBACK_POLICY,
    .counts_per_mm = CALIB_ENCODER_COUNTS_PER_MM,
    .dist_s1_servo1_mm = 200.0f,
    .dist_s1_servo2_mm = 400.0f,
    .dist_s1_end_mm = 540.0f
};

static bool config_strings_are_terminated(const sortix_sys_config_t *cfg)
{
    return cfg != NULL &&
           memchr(cfg->wifi_ssid, '\0', sizeof(cfg->wifi_ssid)) != NULL &&
           memchr(cfg->wifi_pass, '\0', sizeof(cfg->wifi_pass)) != NULL &&
           memchr(cfg->mqtt_broker_uri, '\0', sizeof(cfg->mqtt_broker_uri)) != NULL &&
           memchr(cfg->mqtt_user, '\0', sizeof(cfg->mqtt_user)) != NULL &&
           memchr(cfg->mqtt_pass, '\0', sizeof(cfg->mqtt_pass)) != NULL &&
           memchr(cfg->control_secret, '\0', sizeof(cfg->control_secret)) != NULL &&
           memchr(cfg->http_telemetry_url, '\0', sizeof(cfg->http_telemetry_url)) != NULL &&
           memchr(cfg->device_id, '\0', sizeof(cfg->device_id)) != NULL;
}

static bool config_values_are_valid(const sortix_sys_config_t *cfg)
{
    return config_strings_are_terminated(cfg) &&
           cfg->fallback_policy >= 0 && cfg->fallback_policy <= 1 &&
           isfinite(cfg->counts_per_mm) && cfg->counts_per_mm > 0.001f &&
           isfinite(cfg->dist_s1_servo1_mm) && cfg->dist_s1_servo1_mm > 0.0f &&
           isfinite(cfg->dist_s1_servo2_mm) && cfg->dist_s1_servo2_mm > 0.0f &&
           isfinite(cfg->dist_s1_end_mm) && cfg->dist_s1_end_mm > 0.0f;
}

esp_err_t nvs_config_init(void)
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGW(TAG, "NVS flash partition truncated, erasing...");
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize NVS flash: %s", esp_err_to_name(ret));
        return ret;
    }

    nvs_handle_t handle;
    ret = nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle);
    if (ret == ESP_OK) {
        size_t required_size = sizeof(sortix_sys_config_t);
        sortix_sys_config_t loaded;
        ret = nvs_get_blob(handle, NVS_BLOB_KEY, &loaded, &required_size);
        if (ret == ESP_OK && required_size == sizeof(sortix_sys_config_t) &&
            config_values_are_valid(&loaded)) {
            memcpy(&s_config, &loaded, sizeof(sortix_sys_config_t));
            ESP_LOGI(TAG, "Loaded configuration from NVS (SSID: %s, MQTT: %s)",
                     s_config.wifi_ssid, s_config.mqtt_broker_uri);
        } else {
            ESP_LOGW(TAG, "Config blob missing, incompatible, or invalid; using firmware defaults");
        }

        size_t token_size = sizeof(s_device_token);
        esp_err_t token_ret = nvs_get_str(handle, NVS_DEVICE_TOKEN_KEY, s_device_token, &token_size);
        if (token_ret != ESP_OK) {
            s_device_token[0] = '\0';
        } else if (token_size == 0 || token_size > sizeof(s_device_token) ||
                   s_device_token[token_size - 1] != '\0') {
            s_device_token[0] = '\0';
            ESP_LOGW(TAG, "Stored device token is invalid; HTTPS telemetry remains disabled");
        }
        nvs_close(handle);
    } else {
        ESP_LOGI(TAG, "No NVS namespace '%s', using default config", NVS_NAMESPACE);
    }

    return ESP_OK;
}

const sortix_sys_config_t *nvs_config_get(void)
{
    return &s_config;
}

esp_err_t nvs_config_save(const sortix_sys_config_t *cfg)
{
    if (!config_values_are_valid(cfg)) return ESP_ERR_INVALID_ARG;

    nvs_handle_t handle;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open NVS for writing: %s", esp_err_to_name(ret));
        return ret;
    }

    ret = nvs_set_blob(handle, NVS_BLOB_KEY, cfg, sizeof(sortix_sys_config_t));
    if (ret == ESP_OK) {
        ret = nvs_commit(handle);
        if (ret == ESP_OK) {
            memcpy(&s_config, cfg, sizeof(sortix_sys_config_t));
            ESP_LOGI(TAG, "Configuration committed to NVS");
        }
    }
    nvs_close(handle);
    return ret;
}

esp_err_t nvs_config_save_portal_config(const sortix_sys_config_t *cfg, const char *device_token)
{
    if (!config_values_are_valid(cfg) || device_token == NULL ||
        strlen(device_token) >= sizeof(s_device_token)) return ESP_ERR_INVALID_ARG;

    nvs_handle_t handle;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (ret != ESP_OK) return ret;

    ret = nvs_set_blob(handle, NVS_BLOB_KEY, cfg, sizeof(sortix_sys_config_t));
    if (ret == ESP_OK) {
        if (device_token[0] == '\0') {
            ret = nvs_erase_key(handle, NVS_DEVICE_TOKEN_KEY);
            if (ret == ESP_ERR_NVS_NOT_FOUND) ret = ESP_OK;
        } else {
            ret = nvs_set_str(handle, NVS_DEVICE_TOKEN_KEY, device_token);
        }
    }
    if (ret == ESP_OK) ret = nvs_commit(handle);
    if (ret == ESP_OK) {
        memcpy(&s_config, cfg, sizeof(sortix_sys_config_t));
        memcpy(s_device_token, device_token, strlen(device_token) + 1);
    }
    nvs_close(handle);
    return ret;
}

const char *nvs_config_get_device_token(void)
{
    return s_device_token;
}

esp_err_t nvs_config_save_device_token(const char *token)
{
    if (token == NULL || strlen(token) >= sizeof(s_device_token)) return ESP_ERR_INVALID_ARG;

    nvs_handle_t handle;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (ret != ESP_OK) return ret;

    if (token[0] == '\0') {
        ret = nvs_erase_key(handle, NVS_DEVICE_TOKEN_KEY);
        if (ret == ESP_ERR_NVS_NOT_FOUND) ret = ESP_OK;
    } else {
        ret = nvs_set_str(handle, NVS_DEVICE_TOKEN_KEY, token);
    }
    if (ret == ESP_OK) ret = nvs_commit(handle);
    if (ret == ESP_OK) {
        memcpy(s_device_token, token, strlen(token) + 1);
    }
    nvs_close(handle);
    return ret;
}

esp_err_t nvs_config_save_sorter_config(const char *json)
{
    if (json == NULL) return ESP_ERR_INVALID_ARG;
    size_t len = strnlen(json, SORTER_CONFIG_MAX_JSON);
    if (len == 0 || len >= SORTER_CONFIG_MAX_JSON) return ESP_ERR_INVALID_SIZE;

    nvs_handle_t handle;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (ret != ESP_OK) return ret;
    ret = nvs_set_blob(handle, NVS_SORTER_CONFIG_KEY, json, len + 1);
    if (ret == ESP_OK) ret = nvs_commit(handle);
    nvs_close(handle);
    return ret;
}

esp_err_t nvs_config_load_sorter_config(char *buffer, size_t buffer_size)
{
    if (buffer == NULL || buffer_size == 0) return ESP_ERR_INVALID_ARG;
    buffer[0] = '\0';

    nvs_handle_t handle;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle);
    if (ret != ESP_OK) return ret;

    size_t required_size = 0;
    ret = nvs_get_blob(handle, NVS_SORTER_CONFIG_KEY, NULL, &required_size);
    if (ret == ESP_OK) {
        if (required_size == 0 || required_size > buffer_size || required_size > SORTER_CONFIG_MAX_JSON) {
            ret = ESP_ERR_INVALID_SIZE;
        } else {
            ret = nvs_get_blob(handle, NVS_SORTER_CONFIG_KEY, buffer, &required_size);
            if (ret == ESP_OK && buffer[required_size - 1] != '\0') {
                buffer[0] = '\0';
                ret = ESP_ERR_INVALID_RESPONSE;
            }
        }
    }
    nvs_close(handle);
    return ret;
}

esp_err_t nvs_config_factory_reset(void)
{
    nvs_handle_t handle;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle);
    if (ret == ESP_OK) {
        nvs_erase_all(handle);
        nvs_commit(handle);
        nvs_close(handle);
        ESP_LOGW(TAG, "NVS namespace erased to factory defaults");
    }
    return ret;
}
