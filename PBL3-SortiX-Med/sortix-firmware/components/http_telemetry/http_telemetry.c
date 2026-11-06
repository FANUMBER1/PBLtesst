#include "http_telemetry.h"
#include "app_config.h"
#include "nvs_config.h"
#include "state_machine.h"
#include "safety_monitor.h"
#include "encoder.h"
#include "sensors.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "cJSON.h"
#include "esp_log.h"
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include <stdbool.h>

static const char *TAG = "HTTP_TELEMETRY";

static bool is_https_url_with_host(const char *url)
{
    if (url == NULL || strncmp(url, "https://", 8) != 0 || url[8] == '\0' ||
        url[8] == '/' || url[8] == '?' || url[8] == '#' || url[8] == ':') return false;
    for (const unsigned char *p = (const unsigned char *)url + 8;
         *p != '\0' && *p != '/' && *p != '?' && *p != '#'; p++) {
        if (*p == '@' || isspace(*p)) return false;
    }
    return true;
}

esp_err_t http_telemetry_init(void)
{
    const sortix_sys_config_t *sys_cfg = nvs_config_get();
    if (sys_cfg->http_telemetry_url[0] == '\0') {
        ESP_LOGI(TAG, "HTTPS telemetry disabled until provisioned");
    } else if (!is_https_url_with_host(sys_cfg->http_telemetry_url)) {
        ESP_LOGW(TAG, "Ignoring non-HTTPS telemetry endpoint; reconfigure it through the setup portal");
    } else {
        ESP_LOGI(TAG, "HTTPS telemetry initialized (Endpoint: %s)", sys_cfg->http_telemetry_url);
    }
    return ESP_OK;
}

esp_err_t http_telemetry_send_post(void)
{
    const sortix_sys_config_t *sys_cfg = nvs_config_get();
    if (strlen(sys_cfg->http_telemetry_url) == 0) return ESP_ERR_INVALID_STATE;
    if (!is_https_url_with_host(sys_cfg->http_telemetry_url)) return ESP_ERR_INVALID_ARG;
    const char *device_token = nvs_config_get_device_token();
    if (device_token == NULL || strlen(device_token) < 16) return ESP_ERR_INVALID_STATE;
    float cpu_temp_c = 0.0f;
    if (!safety_monitor_get_cpu_temp(&cpu_temp_c)) return ESP_ERR_INVALID_STATE;

    system_state_t state = state_machine_get_state();
    bool is_running = (state == SYSTEM_STATE_RUNNING);
    int speed_val = is_running ? 100 : 0; // Trạng thái điều khiển động cơ; tốc độ đo đạc thực tế tách riêng.
    float measured_speed_mm_s = 0.0f;
    bool measured_speed_valid = safety_monitor_get_conveyor_speed_mm_s(&measured_speed_mm_s);

    // Xây dựng gói dữ liệu telemetry JSON
    // LƯU Ý: Không thêm trường "optical_sensor" để tránh xung đột với logic tự động dừng của backend!
    cJSON *root = cJSON_CreateObject();
    if (root == NULL) return ESP_ERR_NO_MEM;
    cJSON_AddStringToObject(root, "device_id", SORTIX_DEVICE_ID);
    cJSON_AddNumberToObject(root, "cpu_temp", (double)cpu_temp_c);
    cJSON_AddNumberToObject(root, "conveyor_speed", speed_val);
    if (measured_speed_valid) {
        cJSON_AddNumberToObject(root, "conveyor_speed_mm_s", measured_speed_mm_s);
    }
    cJSON_AddBoolToObject(root, "conveyor_running", is_running);
    cJSON_AddBoolToObject(root, "s1_entry", sensors_is_s1_blocked());
    cJSON_AddNullToObject(root, "s2_sorter1");
    cJSON_AddNullToObject(root, "s3_sorter2");
    cJSON_AddBoolToObject(root, "estop_pressed", state == SYSTEM_STATE_ESTOP);
    cJSON_AddNumberToObject(root, "encoder_count", (double)encoder_get_count());

    char *post_data = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (post_data == NULL) {
        return ESP_ERR_NO_MEM;
    }

    esp_http_client_config_t config = {
        .url = sys_cfg->http_telemetry_url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 4000,
        .crt_bundle_attach = esp_crt_bundle_attach,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    if (client == NULL) {
        free(post_data);
        return ESP_FAIL;
    }

    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_header(client, "X-Device-Token", device_token);
    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        int status_code = esp_http_client_get_status_code(client);
        ESP_LOGD(TAG, "HTTP POST Telemetry sent (Status %d)", status_code);
        if (status_code < 200 || status_code >= 300) err = ESP_FAIL;
    } else {
        ESP_LOGW(TAG, "HTTP POST Telemetry failed: %s", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);
    free(post_data);
    return err;
}
