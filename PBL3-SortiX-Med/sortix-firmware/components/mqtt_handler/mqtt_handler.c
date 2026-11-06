#include "mqtt_handler.h"
#include "app_config.h"
#include "nvs_config.h"
#include "wifi_manager.h"
#include "state_machine.h"
#include "sorting_engine.h"
#include "encoder.h"
#include "motor_control.h"
#include "safety_monitor.h"
#include "sensors.h"
#include "servo.h"
#include "led_indicator.h"
#include "mqtt_client.h"
#include "esp_crt_bundle.h"
#include "cJSON.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <math.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <ctype.h>

static const char *TAG = "MQTT_HANDLER";

static esp_mqtt_client_handle_t s_mqtt_client = NULL;
static bool s_is_connected = false;
#define MQTT_MAX_INCOMING_PAYLOAD 4096
static char *s_rx_payload = NULL;
static int s_rx_total_len = 0;
static int s_rx_received_len = 0;
static char s_rx_topic[128] = {0};

static void reset_rx_message(void)
{
    free(s_rx_payload);
    s_rx_payload = NULL;
    s_rx_total_len = 0;
    s_rx_received_len = 0;
    s_rx_topic[0] = '\0';
}

static bool uri_has_tls_host(const char *uri)
{
    size_t scheme_len = 0;
    if (uri != NULL && strncmp(uri, "mqtts://", 8) == 0) scheme_len = 8;
    else if (uri != NULL && strncmp(uri, "wss://", 6) == 0) scheme_len = 6;
    else return false;
    if (uri[scheme_len] == '\0' || uri[scheme_len] == '/' || uri[scheme_len] == '?' ||
        uri[scheme_len] == '#' || uri[scheme_len] == ':') return false;
    for (const unsigned char *p = (const unsigned char *)uri + scheme_len;
         *p != '\0' && *p != '/' && *p != '?' && *p != '#'; p++) {
        if (*p == '@' || isspace(*p)) return false;
    }
    return true;
}

static bool json_has_valid_control_token(const cJSON *root)
{
    const sortix_sys_config_t *sys_cfg = nvs_config_get();
    if (root == NULL || sys_cfg == NULL || strlen(sys_cfg->control_secret) < 16) return false;

    cJSON *token = cJSON_GetObjectItem((cJSON *)root, "auth_token");
    if (token == NULL) token = cJSON_GetObjectItem((cJSON *)root, "token");
    return cJSON_IsString(token) && token->valuestring != NULL &&
           strlen(token->valuestring) == strlen(sys_cfg->control_secret) &&
           strcmp(token->valuestring, sys_cfg->control_secret) == 0;
}

static void get_iso8601_timestamp(char *buf, size_t max_len)
{
    time_t now;
    time(&now);
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);

    // Nếu thời gian chưa được đồng bộ qua máy chủ SNTP (trước năm 1971), định dạng theo thời gian uptime tương đối
    if (timeinfo.tm_year < 71) {
        uint32_t uptime_s = (uint32_t)(esp_timer_get_time() / 1000000);
        snprintf(buf, max_len, "1970-01-01T%02lu:%02lu:%02luZ",
                 (unsigned long)((uptime_s / 3600) % 24),
                 (unsigned long)((uptime_s / 60) % 60),
                 (unsigned long)(uptime_s % 60));
    } else {
        strftime(buf, max_len, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    }
}

static void handle_incoming_vision(const char *data, int data_len)
{
    cJSON *root = cJSON_ParseWithLength(data, data_len);
    if (root == NULL) {
        ESP_LOGE(TAG, "Failed to parse vision JSON payload");
        return;
    }

    if (!json_has_valid_control_token(root)) {
        ESP_LOGW(TAG, "Rejected Vision payload without valid device authorization");
        cJSON_Delete(root);
        return;
    }

    cJSON *prod_id = cJSON_GetObjectItem(root, "product_id");
    cJSON *brand_id = cJSON_GetObjectItem(root, "brand_id");
    cJSON *conf = cJSON_GetObjectItem(root, "confidence");

    if (!cJSON_IsString(prod_id) || prod_id->valuestring == NULL || prod_id->valuestring[0] == '\0' ||
        !cJSON_IsString(brand_id) || brand_id->valuestring == NULL || brand_id->valuestring[0] == '\0' ||
        !cJSON_IsNumber(conf) || !isfinite(conf->valuedouble) ||
        conf->valuedouble < 0.0 || conf->valuedouble > 1.0) {
        ESP_LOGW(TAG, "Rejected malformed Vision payload");
        cJSON_Delete(root);
        return;
    }

    const char *p_str = prod_id->valuestring;
    const char *b_str = brand_id->valuestring;
    float confidence = (float)conf->valuedouble;

    ESP_LOGI(TAG, "Vision payload parsed: product='%s', brand='%s', conf=%.2f",
             p_str, b_str, confidence);
    sorting_engine_on_vision_result(p_str, b_str, confidence);

    cJSON_Delete(root);
}

static void handle_incoming_control(const char *data, int data_len)
{
    cJSON *root = cJSON_ParseWithLength(data, data_len);
    if (root == NULL) {
        ESP_LOGE(TAG, "Failed to parse control JSON payload");
        return;
    }

    if (!json_has_valid_control_token(root)) {
        ESP_LOGW(TAG, "Rejected control command (device secret missing or token invalid)");
        cJSON_Delete(root);
        return;
    }

    cJSON *cmd = cJSON_GetObjectItem(root, "command");
    cJSON *val = cJSON_GetObjectItem(root, "value");
    int val_int = (val && cJSON_IsNumber(val)) ? (int)val->valuedouble : -1;

    if (cJSON_IsString(cmd)) {
        const char *cmd_str = cmd->valuestring;
        ESP_LOGI(TAG, "Authenticated control command received: '%s' (value=%d)", cmd_str, val_int);

        if (strcmp(cmd_str, "START") == 0) {
            state_machine_process_event(SYSTEM_EVENT_START);
        } else if (strcmp(cmd_str, "STOP") == 0) {
            state_machine_process_event(SYSTEM_EVENT_STOP);
        } else if (strcmp(cmd_str, "ESTOP") == 0) {
            ESP_LOGW(TAG, "ESTOP command received via control topic -> Triggering emergency stop & publishing ACK");
            esp_err_t command_result = state_machine_process_event(SYSTEM_EVENT_ESTOP);
            mqtt_handler_publish_estop_ack(command_result);
        } else if (strcmp(cmd_str, "ESTOP_RELEASE") == 0) {
            state_machine_process_event(SYSTEM_EVENT_ESTOP_RELEASE);
        } else if (strcmp(cmd_str, "CLEAR_UNRESOLVED") == 0 || strcmp(cmd_str, "CLEAR_BELT") == 0) {
            ESP_LOGI(TAG, "Operator confirmed belt cleared via authenticated command");
            sorting_engine_clear_unresolved();
        } else if (strcmp(cmd_str, "trigger_servo_1") == 0) {
            if (val_int == 0) {
                servo_reset_all();
                ESP_LOGI(TAG, "Manual test: Servo 1 retracted to 0 deg");
            } else {
                esp_err_t s_ret = servo_trigger(SERVO_ID_1);
                ESP_LOGI(TAG, "Manual test: Servo 1 triggered (ret=%s)", esp_err_to_name(s_ret));
            }
        } else if (strcmp(cmd_str, "trigger_servo_2") == 0) {
            if (val_int == 0) {
                servo_reset_all();
                ESP_LOGI(TAG, "Manual test: Servo 2 retracted to 0 deg");
            } else {
                esp_err_t s_ret = servo_trigger(SERVO_ID_2);
                ESP_LOGI(TAG, "Manual test: Servo 2 triggered (ret=%s)", esp_err_to_name(s_ret));
            }
        } else if (strcmp(cmd_str, "trigger_buzzer") == 0) {
            if (val_int == 0) {
                led_indicator_set_mode(LED_MODE_IDLE);
                ESP_LOGI(TAG, "Manual test: Buzzer/LED silenced to IDLE");
            } else {
                led_indicator_set_mode(LED_MODE_ERROR);
                ESP_LOGI(TAG, "Manual test: Buzzer/LED alarm triggered (fast blink)");
            }
        } else if (strcmp(cmd_str, "reset_actuators") == 0) {
            servo_reset_all();
            led_indicator_set_mode(LED_MODE_IDLE);
            ESP_LOGI(TAG, "Manual test: Reset all actuators to safe rest state");
        } else {
            ESP_LOGW(TAG, "Unknown control command: '%s'", cmd_str);
        }
    }
    cJSON_Delete(root);
}

static void handle_incoming_estop(const char *data, int data_len)
{
    cJSON *root = cJSON_ParseWithLength(data, data_len);
    if (root == NULL || !json_has_valid_control_token(root)) {
        ESP_LOGW(TAG, "Rejected unauthenticated message on emergency-stop topic");
        if (root != NULL) cJSON_Delete(root);
        return;
    }
    cJSON_Delete(root);
    ESP_LOGW(TAG, "EMERGENCY STOP signal received on topic '%s' -> Halting actuators immediately!", SORTIX_TOPIC_ESTOP);
    esp_err_t command_result = state_machine_process_event(SYSTEM_EVENT_ESTOP);
    mqtt_handler_publish_estop_ack(command_result);
}

static void handle_incoming_estop_release(const char *data, int data_len)
{
    bool authorized = false;
    if (data != NULL && data_len > 0) {
        cJSON *root = cJSON_ParseWithLength(data, data_len);
        if (root != NULL) {
            authorized = json_has_valid_control_token(root);
            cJSON_Delete(root);
        }
    }

    if (!authorized) {
        ESP_LOGW(TAG, "SECURITY ALERT: Rejected ESTOP_RELEASE (unprovisioned secret or invalid auth_token)!");
        return;
    }

    ESP_LOGI(TAG, "Authenticated safety ESTOP_RELEASE topic event accepted");
    state_machine_process_event(SYSTEM_EVENT_ESTOP_RELEASE);
}

static void handle_incoming_config_set(const char *data, int data_len)
{
    cJSON *root = cJSON_ParseWithLength(data, data_len);
    if (root == NULL) {
        ESP_LOGE(TAG, "Failed to parse config JSON payload");
        return;
    }

    if (!json_has_valid_control_token(root)) {
        ESP_LOGW(TAG, "SECURITY ALERT: Rejected config/set (unprovisioned secret or invalid auth_token)!");
        uint32_t current_ver = sorting_engine_get_active_config_version();
        mqtt_handler_publish_config_status(false, current_ver, "UNAUTHORIZED: Device unprovisioned or invalid auth_token");
        cJSON_Delete(root);
        return;
    }
    cJSON_Delete(root);

    char *payload_str = malloc(data_len + 1);
    if (payload_str == NULL) return;
    memcpy(payload_str, data, data_len);
    payload_str[data_len] = '\0';

    bool applied = false;
    char reason[128] = {0};
    esp_err_t ret = sorting_engine_apply_config_json(payload_str, &applied, reason, sizeof(reason));
    free(payload_str);

    uint32_t version = sorting_engine_get_active_config_version();
    if (ret == ESP_OK) {
        mqtt_handler_publish_config_status(applied, version, NULL);
    } else {
        mqtt_handler_publish_config_status(false, version, reason);
    }
}

static void dispatch_incoming_message(const char *topic, const char *data, int data_len)
{
    if (strcmp(topic, SORTIX_TOPIC_VISION) == 0) {
        handle_incoming_vision(data, data_len);
    } else if (strcmp(topic, SORTIX_TOPIC_CONTROL) == 0) {
        handle_incoming_control(data, data_len);
    } else if (strcmp(topic, SORTIX_TOPIC_ESTOP) == 0) {
        handle_incoming_estop(data, data_len);
    } else if (strcmp(topic, SORTIX_TOPIC_ESTOP_RELEASE) == 0) {
        handle_incoming_estop_release(data, data_len);
    } else if (strcmp(topic, SORTIX_TOPIC_CONFIG_SET) == 0) {
        handle_incoming_config_set(data, data_len);
    }
}

static void receive_data_fragment(esp_mqtt_event_handle_t event)
{
    if (event == NULL || event->data == NULL || event->data_len <= 0 ||
        event->total_data_len <= 0 || event->total_data_len > MQTT_MAX_INCOMING_PAYLOAD ||
        event->current_data_offset < 0 ||
        event->data_len > event->total_data_len - event->current_data_offset) {
        reset_rx_message();
        ESP_LOGW(TAG, "Rejected malformed or oversized MQTT message fragment");
        return;
    }

    if (event->current_data_offset == 0) {
        reset_rx_message();
        if (event->topic == NULL || event->topic_len <= 0 || event->topic_len >= sizeof(s_rx_topic)) {
            ESP_LOGW(TAG, "Rejected MQTT message with invalid topic length");
            return;
        }
        s_rx_payload = malloc((size_t)event->total_data_len + 1);
        if (s_rx_payload == NULL) return;
        memcpy(s_rx_topic, event->topic, event->topic_len);
        s_rx_topic[event->topic_len] = '\0';
        s_rx_total_len = event->total_data_len;
    }

    if (s_rx_payload == NULL || event->total_data_len != s_rx_total_len ||
        event->current_data_offset != s_rx_received_len) {
        reset_rx_message();
        ESP_LOGW(TAG, "Discarded non-contiguous MQTT message fragments");
        return;
    }

    memcpy(s_rx_payload + s_rx_received_len, event->data, event->data_len);
    s_rx_received_len += event->data_len;
    if (s_rx_received_len == s_rx_total_len) {
        s_rx_payload[s_rx_total_len] = '\0';
        dispatch_incoming_message(s_rx_topic, s_rx_payload, s_rx_total_len);
        reset_rx_message();
    }
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                               int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t event = event_data;

    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            s_is_connected = true;
            ESP_LOGI(TAG, "MQTT Connected to broker! Subscribing to SortiX topics...");

            esp_mqtt_client_subscribe(s_mqtt_client, SORTIX_TOPIC_VISION, 1);
            esp_mqtt_client_subscribe(s_mqtt_client, SORTIX_TOPIC_CONTROL, 1);
            esp_mqtt_client_subscribe(s_mqtt_client, SORTIX_TOPIC_ESTOP, 1);
            esp_mqtt_client_subscribe(s_mqtt_client, SORTIX_TOPIC_ESTOP_RELEASE, 1);
            esp_mqtt_client_subscribe(s_mqtt_client, SORTIX_TOPIC_CONFIG_SET, 1);

            // Phát trạng thái ban đầu của hệ thống lên MQTT
            mqtt_handler_publish_status(state_machine_get_state_str(state_machine_get_state()));
            break;

        case MQTT_EVENT_DISCONNECTED:
            s_is_connected = false;
            reset_rx_message();
            ESP_LOGW(TAG, "MQTT Disconnected from broker");
            break;

        case MQTT_EVENT_DATA: {
            receive_data_fragment(event);
            break;
        }

        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG, "MQTT Error event occurred");
            break;

        default:
            break;
    }
}

typedef struct {
    esp_err_t command_result;
} estop_ack_context_t;

static void estop_ack_task(void *arg)
{
    estop_ack_context_t *ctx = (estop_ack_context_t *)arg;
    esp_err_t command_result = ctx != NULL ? ctx->command_result : ESP_FAIL;
    free(ctx);

    unsigned int stopped_samples = 0;
    float measured_speed = 0.0f;
    bool speed_sample_valid = false;
    for (unsigned int attempt = 0; attempt < 20; attempt++) {
        vTaskDelay(pdMS_TO_TICKS(50));
        speed_sample_valid = safety_monitor_get_conveyor_speed_mm_s(&measured_speed);
        bool estop_latched = state_machine_get_state() == SYSTEM_STATE_ESTOP;
        bool brake_applied = motor_control_get_direction() == MOTOR_DIR_BRAKE;
        bool servos_idle = !servo_is_busy(SERVO_ID_1) && !servo_is_busy(SERVO_ID_2);
        bool speed_is_zero = speed_sample_valid && measured_speed <= 0.5f;
        if (command_result == ESP_OK && estop_latched && brake_applied && servos_idle && speed_is_zero) {
            stopped_samples++;
            if (stopped_samples >= 3) break;
        } else {
            stopped_samples = 0;
        }
    }

    bool confirmed = command_result == ESP_OK &&
                     state_machine_get_state() == SYSTEM_STATE_ESTOP &&
                     motor_control_get_direction() == MOTOR_DIR_BRAKE &&
                     !servo_is_busy(SERVO_ID_1) && !servo_is_busy(SERVO_ID_2) &&
                     speed_sample_valid && measured_speed <= 0.5f && stopped_samples >= 3;
    if (!s_is_connected || s_mqtt_client == NULL) {
        vTaskDelete(NULL);
        return;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        vTaskDelete(NULL);
        return;
    }
    cJSON_AddStringToObject(root, "event", "estop_ack");
    cJSON_AddStringToObject(root, "device_id", SORTIX_DEVICE_ID);
    cJSON_AddStringToObject(root, "hardware_state",
                            confirmed ? "ESTOP_LOCKED" : "ESTOP_LOCKED_STOP_UNCONFIRMED");
    cJSON_AddBoolToObject(root, "actuators_stopped", confirmed);
    if (speed_sample_valid) cJSON_AddNumberToObject(root, "measured_speed", measured_speed);
    cJSON_AddNumberToObject(root, "stopped_samples", stopped_samples);

    char timestamp_buf[32];
    get_iso8601_timestamp(timestamp_buf, sizeof(timestamp_buf));
    cJSON_AddStringToObject(root, "timestamp", timestamp_buf);

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);
    if (json_out != NULL) {
        int msg_id = esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_ESTOP_ACK,
                                             json_out, 0, 1, 0);
        free(json_out);
        if (msg_id >= 0) {
            ESP_LOGI(TAG, "E-stop ACK published (confirmed=%s, speed_valid=%s, speed=%.2f mm/s)",
                     confirmed ? "true" : "false", speed_sample_valid ? "true" : "false",
                     measured_speed);
        } else {
            ESP_LOGE(TAG, "Failed to publish E-stop ACK (message id %d)", msg_id);
        }
    }
    vTaskDelete(NULL);
}

esp_err_t mqtt_handler_init(void)
{
    const sortix_sys_config_t *sys_cfg = nvs_config_get();
    if (sys_cfg == NULL || strlen(sys_cfg->control_secret) < 16) {
        ESP_LOGE(TAG, "MQTT disabled: provision a Control Secret of at least 16 characters first");
        return ESP_ERR_INVALID_STATE;
    }
    if (!uri_has_tls_host(sys_cfg->mqtt_broker_uri)) {
        ESP_LOGE(TAG, "MQTT disabled: broker URI must include a host and use TLS (mqtts:// or wss://)");
        return ESP_ERR_INVALID_ARG;
    }
    ESP_LOGI(TAG, "Initializing MQTT Client -> Broker: %s", sys_cfg->mqtt_broker_uri);

    esp_mqtt_client_config_t mqtt_cfg = {
        .broker = {
            .address.uri = sys_cfg->mqtt_broker_uri,
            .verification.crt_bundle_attach = esp_crt_bundle_attach,
        },
        .credentials = {
            .username = (strlen(sys_cfg->mqtt_user) > 0) ? sys_cfg->mqtt_user : NULL,
            .authentication.password = (strlen(sys_cfg->mqtt_pass) > 0) ? sys_cfg->mqtt_pass : NULL,
        },
        .network = {
            .reconnect_timeout_ms = 3000,
        },
    };

    s_mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    if (s_mqtt_client == NULL) {
        ESP_LOGE(TAG, "Failed to initialize MQTT client handle");
        return ESP_FAIL;
    }

    esp_mqtt_client_register_event(s_mqtt_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    return esp_mqtt_client_start(s_mqtt_client);
}

bool mqtt_handler_is_connected(void)
{
    return s_is_connected;
}

esp_err_t mqtt_handler_publish_telemetry(void)
{
    if (!s_is_connected || s_mqtt_client == NULL) return ESP_ERR_INVALID_STATE;

    system_state_t state = state_machine_get_state();
    bool is_running = (state == SYSTEM_STATE_RUNNING);
    int speed_val = is_running ? 100 : 0; // Trạng thái điều khiển động cơ; tốc độ đo đạc thực tế tách riêng bên dưới.
    float cpu_temp_c = 0.0f;
    if (!safety_monitor_get_cpu_temp(&cpu_temp_c)) return ESP_ERR_INVALID_STATE;
    float measured_speed_mm_s = 0.0f;
    bool measured_speed_valid = safety_monitor_get_conveyor_speed_mm_s(&measured_speed_mm_s);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "device_id", SORTIX_DEVICE_ID);
    cJSON_AddBoolToObject(root, "online", true);
    cJSON_AddNumberToObject(root, "uptime", (double)(esp_timer_get_time() / 1000000));
    cJSON_AddNumberToObject(root, "cpu_temp", (double)cpu_temp_c);
    cJSON_AddNumberToObject(root, "wifi_rssi", (double)wifi_manager_get_rssi());
    cJSON_AddStringToObject(root, "wifi_band", wifi_manager_get_band_str());
    cJSON_AddBoolToObject(root, "conveyor_running", is_running);
    cJSON_AddNumberToObject(root, "conveyor_speed", speed_val);
    if (measured_speed_valid) {
        cJSON_AddNumberToObject(root, "conveyor_speed_mm_s", measured_speed_mm_s);
    }
    cJSON_AddBoolToObject(root, "s1_entry", sensors_is_s1_blocked());
    cJSON_AddNullToObject(root, "s2_sorter1");
    cJSON_AddNullToObject(root, "s3_sorter2");
    cJSON_AddBoolToObject(root, "estop_pressed", state == SYSTEM_STATE_ESTOP);
    cJSON_AddBoolToObject(root, "arm1_active", servo_is_busy(SERVO_ID_1));
    cJSON_AddBoolToObject(root, "arm2_active", servo_is_busy(SERVO_ID_2));
    cJSON_AddNumberToObject(root, "encoder_count", (double)encoder_get_count());
    cJSON_AddNumberToObject(root, "active_config_version", (double)sorting_engine_get_active_config_version());

    char timestamp_buf[32];
    get_iso8601_timestamp(timestamp_buf, sizeof(timestamp_buf));
    cJSON_AddStringToObject(root, "last_heartbeat", timestamp_buf);

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (json_out != NULL) {
        esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_TELEMETRY, json_out, 0, 1, 0);
        free(json_out);
        return ESP_OK;
    }
    return ESP_ERR_NO_MEM;
}

esp_err_t mqtt_handler_publish_heartbeat(void)
{
    if (!s_is_connected || s_mqtt_client == NULL) return ESP_ERR_INVALID_STATE;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "device_id", SORTIX_DEVICE_ID);
    cJSON_AddNumberToObject(root, "uptime", (double)(esp_timer_get_time() / 1000000));

    char timestamp_buf[32];
    get_iso8601_timestamp(timestamp_buf, sizeof(timestamp_buf));
    cJSON_AddStringToObject(root, "timestamp", timestamp_buf);

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (json_out != NULL) {
        esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_HEARTBEAT, json_out, 0, 0, 0);
        free(json_out);
        return ESP_OK;
    }
    return ESP_ERR_NO_MEM;
}

esp_err_t mqtt_handler_publish_status(const char *status_str)
{
    if (!s_is_connected || s_mqtt_client == NULL || status_str == NULL) return ESP_ERR_INVALID_STATE;
    esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_STATUS, status_str, 0, 1, 1);
    return ESP_OK;
}

esp_err_t mqtt_handler_publish_classification(const tracked_item_t *item)
{
    if (!s_is_connected || s_mqtt_client == NULL || item == NULL) return ESP_ERR_INVALID_STATE;

    cJSON *root = cJSON_CreateObject();
    char uuid_buf[64];
    snprintf(uuid_buf, sizeof(uuid_buf), "sort_%lu_%lld", item->id, esp_timer_get_time() / 1000);

    cJSON_AddStringToObject(root, "id", uuid_buf);
    cJSON_AddStringToObject(root, "product_id", item->product_id);
    const char *reported_brand_id = item->brand_id[0] != '\0' ? item->brand_id : "unknown";
    const char *reported_brand_name = item->brand_id[0] != '\0' ? item->brand_id : "Chưa phân loại";
    cJSON_AddStringToObject(root, "brand_id", reported_brand_id);
    cJSON_AddStringToObject(root, "brand_name", reported_brand_name);
    cJSON_AddNumberToObject(root, "confidence", (double)item->confidence);
    cJSON_AddNumberToObject(root, "target_bin", item->target_bin);
    cJSON_AddNumberToObject(root, "routed_bin", item->routed_bin);
    cJSON_AddNumberToObject(root, "actual_bin", item->actual_bin);
    cJSON_AddStringToObject(root, "status", item->status);

    char timestamp_buf[32];
    get_iso8601_timestamp(timestamp_buf, sizeof(timestamp_buf));
    cJSON_AddStringToObject(root, "timestamp", timestamp_buf);

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (json_out != NULL) {
        esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_CLASSIFICATION, json_out, 0, 1, 0);
        free(json_out);
        return ESP_OK;
    }
    return ESP_ERR_NO_MEM;
}

esp_err_t mqtt_handler_publish_jam(float duration_seconds)
{
    if (!s_is_connected || s_mqtt_client == NULL) return ESP_ERR_INVALID_STATE;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "event", "jam_detected");
    cJSON_AddStringToObject(root, "section", "Conveyor_Belt_Zone_A");
    cJSON_AddNumberToObject(root, "duration_seconds", (double)duration_seconds);
    cJSON_AddStringToObject(root, "sensor_id", "ENCODER_STALL_01");

    char timestamp_buf[32];
    get_iso8601_timestamp(timestamp_buf, sizeof(timestamp_buf));
    cJSON_AddStringToObject(root, "timestamp", timestamp_buf);

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (json_out != NULL) {
        esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_JAM, json_out, 0, 1, 0);
        free(json_out);
        return ESP_OK;
    }
    return ESP_ERR_NO_MEM;
}

esp_err_t mqtt_handler_publish_temp_warning(float current_temp, float threshold_temp)
{
    if (!s_is_connected || s_mqtt_client == NULL) return ESP_ERR_INVALID_STATE;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "event", "temperature_warning");
    cJSON_AddStringToObject(root, "device_name", "ESP32-C5 SoC");
    cJSON_AddNumberToObject(root, "current_temp", (double)current_temp);
    cJSON_AddNumberToObject(root, "threshold_temp", (double)threshold_temp);
    cJSON_AddStringToObject(root, "unit", "°C");

    char timestamp_buf[32];
    get_iso8601_timestamp(timestamp_buf, sizeof(timestamp_buf));
    cJSON_AddStringToObject(root, "timestamp", timestamp_buf);

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (json_out != NULL) {
        esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_TEMP_WARN, json_out, 0, 1, 0);
        free(json_out);
        return ESP_OK;
    }
    return ESP_ERR_NO_MEM;
}

esp_err_t mqtt_handler_publish_config_status(bool applied, uint32_t version, const char *error_reason)
{
    if (!s_is_connected || s_mqtt_client == NULL) return ESP_ERR_INVALID_STATE;

    cJSON *root = cJSON_CreateObject();
    if (error_reason == NULL) {
        cJSON_AddStringToObject(root, "status", applied ? "applied" : "staged");
        cJSON_AddNumberToObject(root, "config_version", version);
    } else {
        cJSON_AddStringToObject(root, "status", "rejected");
        cJSON_AddStringToObject(root, "reason", error_reason);
    }

    char *json_out = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (json_out != NULL) {
        esp_mqtt_client_publish(s_mqtt_client, SORTIX_TOPIC_CONFIG_STATUS, json_out, 0, 1, 0);
        free(json_out);
        return ESP_OK;
    }
    return ESP_ERR_NO_MEM;
}

esp_err_t mqtt_handler_publish_estop_ack(esp_err_t command_result)
{
    if (!s_is_connected || s_mqtt_client == NULL) return ESP_ERR_INVALID_STATE;
    estop_ack_context_t *ctx = malloc(sizeof(*ctx));
    if (ctx == NULL) return ESP_ERR_NO_MEM;
    ctx->command_result = command_result;
    if (xTaskCreate(estop_ack_task, "estop_ack", 4096, ctx, 5, NULL) != pdPASS) {
        free(ctx);
        return ESP_ERR_NO_MEM;
    }
    return ESP_OK;
}
